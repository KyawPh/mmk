# Environment Setup Guide

This guide explains how to configure environment variables for the MMK Currency Bot.

## Development vs Production

The project uses separate Firebase projects for development and production:
- **Development**: `mmk-currency-bot-dev` (default)
- **Production**: `mmk-currency-bot`

### Switching Between Environments

```bash
# List available projects
firebase projects:list

# Switch to development (default)
firebase use development

# Switch to production
firebase use production

# Check current project
firebase use
```

## Prerequisites

Before setting up environment variables, ensure you have:
- Created a Telegram bot via @BotFather
- Obtained your Telegram bot token
- Identified admin Telegram user IDs

## Configuration Methods

### 1. Firebase Functions Config

Use environment-specific scripts:

#### Development Environment
```bash
# Configure development environment
./scripts/set-env-dev.sh

# This will:
# - Switch to development project
# - Set relaxed rate limits
# - Enable debug logging
# - Configure development bot token
```

#### Production Environment
```bash
# Configure production environment (requires confirmation)
./scripts/set-env-prod.sh

# This will:
# - Switch to production project
# - Set strict rate limits
# - Enable analytics and monitoring
# - Configure production bot token
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

## Deployment

### Deploy to Development
```bash
npm run deploy:dev
# Or manually:
firebase use development
firebase deploy --only functions
```

### Deploy to Production
```bash
npm run deploy:prod
# This will show a warning before deploying

# Or manually:
firebase use production
firebase deploy --only functions
```

### Best Practices
1. Always test in development first
2. Use different bot tokens for each environment
3. Never test with production data in development
4. Review all changes before production deployment
5. Monitor logs after deployment: `firebase functions:log`