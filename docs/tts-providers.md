# TTS Providers With Free Tiers (Jan 2026)

This app can call text-to-speech (TTS) providers from the server so API keys stay private. The
providers below are known for natural voices and have free-tier usage you can start with.

## Recommended providers

| Provider | Voice quality | Free tier | Notes |
| --- | --- | --- | --- |
| ElevenLabs | Excellent, very natural | 10,000 credits per month (~10 min) | Free plan requires attribution and has no commercial license. |
| Google Cloud TTS | Very good (WaveNet/Neural2) | 1M chars/month (WaveNet/Neural2), 4M chars/month (standard) | Neural voices are in the smaller free tier. |
| Amazon Polly | Good to very good (Neural) | 1M chars/month (Neural) for 12 months | Standard voices get 5M chars/month for 12 months. |
| Azure Speech | Very good (Neural) | 0.5M chars/month (Neural) | Free tier is monthly, no carryover. |

## Open source (no tokens)

If you want to avoid any tokens or billing:

- Piper (fast local TTS, good quality)
- Coqui TTS (quality varies by model)
- Bark (expressive but heavier runtime)

These can be hosted on your own server or used locally.

## Integration notes

- Keep API keys on the server in environment variables.
- Stream audio back to the browser as `audio/mpeg` or `audio/wav`.
- Cache repeated lines per panel to avoid re-generating speech.

