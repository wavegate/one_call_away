# One Call Away

A mobile-first web app that helps someone in recovery or distress reach trusted human support quickly.

**One tap → tell the agent what's happening → agent stays with you → trusted person gets called.**

## Demo Flow

1. Open the app on your phone (Chrome recommended)
2. Press and hold **Hold for Help**
3. Say: *"I'm feeling urges and I'm concerned I'm going to use."*
4. Grok Voice responds and calls `notify_circle` → Twilio rings your supporter
5. Answer → hear Frank's message → roleplay calling back

## Voice Agent (Grok Voice)

This app uses the **xAI Realtime Voice API** for the support coordinator. The API key stays server-side; the browser receives short-lived session tokens.

1. Create an API key at [console.x.ai](https://console.x.ai) with the **Voice** endpoint enabled
2. Add to `.env.local`:
   ```
   XAI_API_KEY=xai-...
   ```
3. Restart the dev server

The agent calls the `notify_circle` tool when escalation is needed, which triggers the Twilio call to your supporter.

## Quick Start

```bash
npm install
cp .env.example .env.local
# Add your Twilio credentials (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone. For Twilio webhooks in local dev, use [ngrok](https://ngrok.com) and set `NEXT_PUBLIC_APP_URL`.

## Environment Variables

Copy `.env.example` to `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | For live calls | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For live calls | Twilio auth token |
| `TWILIO_FROM_NUMBER` | For live calls | Your Twilio phone number |
| `SUPPORTER_PHONE` | For live calls | Demo supporter's phone (E.164, e.g. `+15551234567`) |
| `NEXT_PUBLIC_APP_URL` | For Twilio webhooks | Public URL (ngrok or Vercel) |
| `XAI_API_KEY` | **Required** | xAI API key with Voice endpoint (from [console.x.ai](https://console.x.ai)) |
| `DEMO_MEMBER_NAME` | Optional | Member name (default: Frank) |

Without Twilio credentials, the app runs in **demo mode** — the full UI and voice flow work, but no outbound call is placed.

## Architecture

- **Next.js** — mobile-first UI
- **Grok Voice (xAI Realtime API)** — voice coordinator with `notify_circle` tool
- **Web Audio + AudioWorklet** — PCM capture and playback at 24 kHz
- **Twilio** — outbound call to supporter with spoken transcript

## Twilio Setup

1. Create a [Twilio](https://www.twilio.com) account
2. Buy or use a trial phone number
3. Verify the supporter phone number (required on trial accounts)
4. Set env vars in `.env.local`
5. For local dev: `ngrok http 3000` → set `NEXT_PUBLIC_APP_URL=https://your-subdomain.ngrok.io`

The Twilio call script:

> This is One Call Away. Frank asked for support. Frank left this message:
> [transcript]
> Please call Frank back now if you are available.

## Product Positioning

One Call Away is not trying to replace therapy, emergency services, or treatment. It makes the moment before human support less lonely and less fragile.

## License

MIT
