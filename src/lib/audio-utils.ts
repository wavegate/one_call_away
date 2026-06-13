const SAMPLE_RATE = 24000;
const BUFFER_CAP_SAMPLES = SAMPLE_RATE * 10;

export function audioToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(
    int16Array.buffer,
    int16Array.byteOffset,
    int16Array.byteLength
  );
  const CHUNK = 0x2000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(
      String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)))
    );
  }
  return btoa(parts.join(""));
}

export function computeRms(int16Array: Int16Array): number {
  if (int16Array.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < int16Array.length; i++) {
    const normalized = int16Array[i] / 32768;
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / int16Array.length);
}

export function createPlaybackManager(audioCtx: AudioContext) {
  let nextPlayTime = 0;
  const queuedSources: AudioBufferSourceNode[] = [];

  function playPcmChunk(base64: string) {
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const buf = audioCtx.createBuffer(1, float32.length, SAMPLE_RATE);
    buf.getChannelData(0).set(float32);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    const startAt = Math.max(now, nextPlayTime);
    src.start(startAt);
    nextPlayTime = startAt + buf.duration;
    queuedSources.push(src);
    src.onended = () => {
      const idx = queuedSources.indexOf(src);
      if (idx !== -1) queuedSources.splice(idx, 1);
    };
  }

  function interruptPlayback() {
    for (const src of queuedSources) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    queuedSources.length = 0;
    nextPlayTime = 0;
  }

  return { playPcmChunk, interruptPlayback };
}

export function createMicBuffer() {
  const chunks: Int16Array[] = [];
  let totalSamples = 0;

  return {
    push(chunk: Int16Array) {
      if (totalSamples >= BUFFER_CAP_SAMPLES) return;
      const remaining = BUFFER_CAP_SAMPLES - totalSamples;
      if (chunk.length > remaining) {
        chunks.push(chunk.slice(0, remaining));
        totalSamples = BUFFER_CAP_SAMPLES;
      } else {
        chunks.push(chunk);
        totalSamples += chunk.length;
      }
    },
    flush(): Int16Array[] {
      const result = chunks.splice(0);
      totalSamples = 0;
      return result;
    },
    clear() {
      chunks.length = 0;
      totalSamples = 0;
    },
  };
}
