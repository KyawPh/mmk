# Environment Setup Guide

This guide explains how to configure environment variables for the MMK Currency Bot.

## Prerequisites

Before setting up environment variables, ensure you have:
- Created a Telegram bot via @BotFather
- Obtained your Telegram bot token
- Identified admin Telegram user IDs

## Configuration Methods

### 1. Firebase Functions Config (Production)

For production deployment, use Firebase Functions configuration:

```bash
# Run the setup script
./scripts/set-env.sh

# Or manually set each variable
firebase functions:config:set telegram.bot_token="YOUR_BOT_TOKEN"
firebase functions:config:set telegram.webhook_secret="YOUR_WEBHOOK_SECRET"
firebase functions:config:set admin.telegram_ids="123456789,987654321"
```

### 2. Local Development (.runtimeconfig.json)

For local development with Firebase emulators:

```bash
# Download production config to local file
firebase functions:config:get > functions/.runtimeconfig.json
```

Or create `functions/.runtimeconfig.json` manually:

```json
{
  "telegram": {
    "bot_token": "YOUR_BOT_TOKEN",
    "webhook_secret": "YOUR_WEBHOOK_SECRET"
  },
  "admin": {
    "telegram_ids": "123456789,987654321"
  },
  "features": {
    "enable_analytics": "true",
    "enable_debug_logs": "false"
  }
}
```

### 3. Environment Variables (.env)

For local development without Firebase emulators:

1. Copy `.env.example` to `.env`
2. Fill in your values:

```bash
cd functions
cp .env.example .env
# Edit .env with your values
```

## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `123456789:ABCdefGHIjklmNOPqrstUVwxyz` |
| `TELEGRAM_WEBHOOK_SECRET` | Random secret for webhook validation | `your-secret-key` |
| `ADMIN_TELEGRAM_IDS` | Comma-separated admin user IDs | `123456789,987654321` |

## Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_ANALYTICS` | Enable usage analytics | `true` |
| `ENABLE_DEBUG_LOGS` | Enable debug logging | `false` |
| `RATE_LIMIT_PER_USER_PER_MINUTE` | Rate limit per user | `20` |
| `RATE_LIMIT_GLOBAL_PER_MINUTE` | Global rate limit | `1000` |
| `CACHE_TTL_RATES` | Cache TTL for rates (seconds) | `300` |
| `CACHE_TTL_USER_DATA` | Cache TTL for user data (seconds) | `3600` |

## Security Notes

- **Never commit** `.env`, `.runtimeconfig.json`, or any file containing secrets
- Use different bot tokens for development and production
- Generate strong webhook secrets using: `openssl rand -hex 32`
- Regularly rotate your secrets

## Troubleshooting

### Missing Environment Variables

If you see "Missing required environment variable" errors:
1. Check that all required variables are set
2. For local development, ensure `.runtimeconfig.json` exists
3. For production, verify with: `firebase functions:config:get`

### Environment Not Loading

If environment variables aren't loading:
1. Restart the Firebase emulators
2. Check file permissions on `.runtimeconfig.json`
3. Verify the config structure matches expected format