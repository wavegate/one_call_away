"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  audioToBase64,
  computeRms,
  createMicBuffer,
  createPlaybackManager,
} from "@/lib/audio-utils";
import { getSessionConfig } from "@/lib/grok-session";

const WS_URL = "wss://api.x.ai/v1/realtime?model=grok-voice-latest";
const CONNECT_TIMEOUT_MS = 10000;
const SAMPLE_RATE = 24000;

export type ConnectionStatus = "idle" | "connecting" | "active" | "error";

export interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  interrupted?: boolean;
}

export interface NotifyCirclePayload {
  urgency: string;
  member_summary: string;
  supporter_message: string;
  member_name?: string;
  recommended_action: string;
  conversation_excerpt?: string;
  share_original_words: boolean;
}

interface UseGrokVoiceAgentOptions {
  memberName?: string;
  onEscalation?: (payload: NotifyCirclePayload) => void;
}

interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

async function fetchSessionToken(): Promise<{
  token: string;
  expiresAt: number;
}> {
  let attempt = 0;
  let lastError = "Could not get voice session token";

  while (attempt < 5) {
    const res = await fetch("/api/token", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      return { token: data.token, expiresAt: data.expiresAt };
    }

    try {
      const data = await res.json();
      if (data.error) {
        lastError = data.error;
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          break;
        }
      }
    } catch {
      // keep retrying on non-JSON failures
    }

    await new Promise((r) =>
      setTimeout(r, Math.min(1000 * 2 ** attempt, 10000))
    );
    attempt += 1;
  }

  throw new Error(lastError);
}

export function useGrokVoiceAgent(options: UseGrokVoiceAgentOptions = {}) {
  const { memberName = "Frank", onEscalation } = options;

  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [userTranscript, setUserTranscript] = useState("");
  const [assistantTranscript, setAssistantTranscript] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackRef = useRef<ReturnType<typeof createPlaybackManager> | null>(
    null
  );
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const micBufferRef = useRef(createMicBuffer());
  const isSessionReadyRef = useRef(false);
  const intentionalDisconnectRef = useRef(false);
  const currentResponseIdRef = useRef<string | null>(null);
  const userHasSpokenRef = useRef(false);
  const assistantTextRef = useRef("");
  const tokenExpiryRef = useRef<number>(0);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const onEscalationRef = useRef(onEscalation);
  onEscalationRef.current = onEscalation;

  const addMessage = useCallback(
    (role: "user" | "assistant", text: string, id?: string) => {
      const msgId = id ?? `${role}-${Date.now()}`;
      setMessages((prev) => {
        const existing = prev.findIndex((m) => m.id === msgId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], text };
          return updated;
        }
        return [...prev, { id: msgId, role, text }];
      });
      return msgId;
    },
    []
  );

  const cleanup = useCallback(() => {
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }

    intentionalDisconnectRef.current = true;
    wsRef.current?.close();
    wsRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    workletRef.current?.disconnect();
    workletRef.current = null;

    playbackRef.current?.interruptPlayback();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    playbackRef.current = null;

    isSessionReadyRef.current = false;
    userHasSpokenRef.current = false;
    micBufferRef.current.clear();
    currentResponseIdRef.current = null;
    setIsAssistantSpeaking(false);
    setMicLevel(0);
  }, []);

  const handleNotifyCircle = useCallback(
    async (ws: WebSocket, callId: string, args: NotifyCirclePayload) => {
      try {
        const res = await fetch("/api/notify-circle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        const result = await res.json();

        ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: callId,
              output: JSON.stringify(result),
            },
          })
        );
        ws.send(JSON.stringify({ type: "response.create" }));

        if (result.success) {
          onEscalationRef.current?.(args);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "notify_circle failed";
        ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: callId,
              output: JSON.stringify({ success: false, error: message }),
            },
          })
        );
        ws.send(JSON.stringify({ type: "response.create" }));
      }
    },
    []
  );

  const handleServerEvent = useCallback(
    (ws: WebSocket, event: RealtimeEvent) => {
      switch (event.type) {
        case "session.updated": {
          if (!isSessionReadyRef.current) {
            isSessionReadyRef.current = true;
            // Drop audio captured while connecting — flushing it can trigger
            // server VAD before the member actually speaks.
            micBufferRef.current.clear();
          }
          break;
        }

        case "input_audio_buffer.speech_started": {
          userHasSpokenRef.current = true;
          playbackRef.current?.interruptPlayback();
          ws.send(JSON.stringify({ type: "response.cancel" }));
          setIsAssistantSpeaking(false);

          if (currentResponseIdRef.current) {
            const responseId = currentResponseIdRef.current;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === responseId ? { ...m, interrupted: true } : m
              )
            );
            currentResponseIdRef.current = null;
          }
          break;
        }

        case "conversation.item.input_audio_transcription.completed": {
          const transcript = (event.transcript as string) ?? "";
          if (transcript.trim()) {
            setUserTranscript(transcript);
            addMessage("user", transcript, `user-${event.item_id ?? Date.now()}`);
          }
          break;
        }

        case "response.created": {
          if (!userHasSpokenRef.current) {
            ws.send(JSON.stringify({ type: "response.cancel" }));
            setIsAssistantSpeaking(false);
            currentResponseIdRef.current = null;
            break;
          }

          const response = event.response as { id?: string } | undefined;
          assistantTextRef.current = "";
          setAssistantTranscript("");
          if (response?.id) {
            currentResponseIdRef.current = response.id;
            addMessage("assistant", "", response.id);
          }
          setIsAssistantSpeaking(true);
          break;
        }

        case "response.output_audio.delta": {
          const delta = event.delta as string;
          if (delta) {
            playbackRef.current?.playPcmChunk(delta);
          }
          break;
        }

        case "response.output_audio_transcript.delta": {
          const delta = (event.delta as string) ?? "";
          const responseId = currentResponseIdRef.current;
          if (delta && responseId) {
            assistantTextRef.current += delta;
            const next = assistantTextRef.current;
            setAssistantTranscript(next);
            setMessages((msgs) =>
              msgs.map((m) =>
                m.id === responseId ? { ...m, text: next } : m
              )
            );
          }
          break;
        }

        case "response.output_audio_transcript.done": {
          const transcript = (event.transcript as string) ?? "";
          const responseId = currentResponseIdRef.current;
          if (transcript && responseId) {
            assistantTextRef.current = transcript;
            setAssistantTranscript(transcript);
            setMessages((msgs) =>
              msgs.map((m) =>
                m.id === responseId ? { ...m, text: transcript } : m
              )
            );
          }
          break;
        }

        case "response.output_audio.done":
        case "response.done": {
          setIsAssistantSpeaking(false);
          break;
        }

        case "response.function_call_arguments.done": {
          const name = event.name as string;
          const callId = event.call_id as string;
          const args = JSON.parse(event.arguments as string) as NotifyCirclePayload;
          if (name === "notify_circle") {
            handleNotifyCircle(ws, callId, args);
          }
          break;
        }

        case "error": {
          // Benign errors (e.g. after response.cancel on interrupt) — session still works
          if (process.env.NODE_ENV === "development") {
            console.debug("[grok-voice] ignored error event", event);
          }
          break;
        }
      }
    },
    [addMessage, handleNotifyCircle]
  );

  const connectWebSocket = useCallback(
    (token: string): Promise<WebSocket> => {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL, [`xai-client-secret.${token}`]);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error("Connection timed out"));
        }, CONNECT_TIMEOUT_MS);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.send(
            JSON.stringify({
              type: "session.update",
              session: getSessionConfig(memberName),
            })
          );
          resolve(ws);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("WebSocket connection failed"));
        };

        ws.onclose = () => {
          if (!intentionalDisconnectRef.current) {
            setStatus("error");
            setError("Connection lost. Tap the button to try again.");
          }
        };

        ws.onmessage = ({ data }) => {
          try {
            const event = JSON.parse(data as string) as RealtimeEvent;
            handleServerEvent(ws, event);
          } catch {
            // ignore malformed events
          }
        };

        wsRef.current = ws;
      });
    },
    [memberName, handleServerEvent]
  );

  const scheduleTokenRefresh = useCallback((expiresAt: number) => {
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
    }
    const refreshIn = Math.max(0, expiresAt * 1000 - Date.now() - 5000);
    tokenRefreshTimerRef.current = setTimeout(() => {
      fetchSessionToken().then(({ expiresAt: next }) => {
        tokenExpiryRef.current = next;
        scheduleTokenRefresh(next);
      });
    }, refreshIn);
  }, []);

  const startMicCapture = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: SAMPLE_RATE,
      },
    });
    streamRef.current = stream;

    stream.getAudioTracks().forEach((track) => {
      track.onended = () => {
        setError("Microphone disconnected");
        setStatus("error");
      };
    });

    const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
    audioCtxRef.current = audioCtx;
    playbackRef.current = createPlaybackManager(audioCtx);

    await audioCtx.audioWorklet.addModule("/pcm-processor-worklet.js");
    const source = audioCtx.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioCtx, "pcm-processor");
    workletNode.port.onmessage = (e: MessageEvent<Int16Array>) => {
      const int16Data = e.data;
      const level = computeRms(int16Data);
      setMicLevel(level);

      const ws = wsRef.current;
      if (isSessionReadyRef.current && ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: audioToBase64(int16Data),
          })
        );
      } else {
        micBufferRef.current.push(int16Data);
      }
    };

    source.connect(workletNode);
    workletNode.connect(audioCtx.destination);
    workletRef.current = workletNode;
  }, []);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "active") return;

    intentionalDisconnectRef.current = false;
    setError(null);
    setStatus("connecting");
    setUserTranscript("");
    setAssistantTranscript("");
    setMessages([]);
    isSessionReadyRef.current = false;
    userHasSpokenRef.current = false;
    micBufferRef.current.clear();

    try {
      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      await audioCtx.close();

      const [tokenData] = await Promise.all([
        fetchSessionToken(),
        startMicCapture(),
      ]);

      tokenExpiryRef.current = tokenData.expiresAt;
      scheduleTokenRefresh(tokenData.expiresAt);

      await connectWebSocket(tokenData.token);
      setStatus("active");
    } catch (err) {
      cleanup();
      const message = err instanceof Error ? err.message : "Connection failed";

      if (
        message.includes("NotAllowedError") ||
        message.includes("Permission")
      ) {
        setError("Microphone access denied — check browser permissions");
      } else if (message.includes("NotFoundError")) {
        setError("No microphone found");
      } else if (message.includes("XAI_API_KEY")) {
        setError("Voice API not configured — add XAI_API_KEY to .env.local");
      } else {
        setError(message);
      }
      setStatus("error");
    }
  }, [
    status,
    startMicCapture,
    connectWebSocket,
    scheduleTokenRefresh,
    cleanup,
  ]);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus("idle");
    setUserTranscript("");
    setAssistantTranscript("");
    setError(null);
  }, [cleanup]);

  const toggle = useCallback(() => {
    if (status === "idle" || status === "error") {
      connect();
    } else {
      disconnect();
    }
  }, [status, connect, disconnect]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const isListening = status === "connecting" || status === "active";

  return {
    status,
    isListening,
    messages,
    userTranscript,
    assistantTranscript,
    micLevel,
    error,
    isAssistantSpeaking,
    connect,
    disconnect,
    toggle,
  };
}
