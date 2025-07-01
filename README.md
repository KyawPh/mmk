# Myanmar Currency Bot

A comprehensive Myanmar Kyat (MMK) exchange rate monitoring system that provides real-time currency data across multiple platforms.

## Overview

Myanmar operates with multiple simultaneous exchange rates, creating confusion for travelers, businesses, and locals. This system aggregates rates from official banks, street markets, social media, and money transfer services into unified, accessible interfaces.

## Features

- **Multi-source data aggregation** from 8+ providers
- **Multi-platform support**: Telegram, Viber, Facebook Messenger
- **Real-time exchange rates** with source attribution
- **Historical data tracking** and trend analysis
- **AI-powered rate predictions**
- **Price alerts** and notifications
- **RESTful API** for third-party integrations

## Current Development Status

🚧 **Phase 1: Telegram Bot Implementation** (In Progress)

See [docs/TODO.md](docs/TODO.md) for detailed development progress.

## Tech Stack

- **Backend**: Firebase Cloud Functions (Node.js/TypeScript)
- **Database**: Firestore NoSQL
- **Deployment**: Google Cloud Platform via Firebase
- **Platforms**: Telegram Bot, Viber Bot, Facebook Messenger, Web App, Mobile Apps

## Getting Started

> **Solo Developer?** Check out our [Solo Dev Setup Guide](docs/SOLO_DEV_SETUP.md) for a streamlined workflow!

### Prerequisites

- Node.js 18+ and npm
- Firebase CLI
- Telegram Bot Token (from @BotFather)
- Google Cloud Project with Firebase enabled

### Installation

```bash
# Clone the repository
git clone [repository-url]
cd mmk

# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Install dependencies
cd functions
npm install
```

### Configuration

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database and Cloud Functions
3. Set up environment variables:

```bash
firebase functions:config:set telegram.bot_token="YOUR_BOT_TOKEN"
firebase functions:config:set admin.user_ids="[\"123456789\"]"
```

### Development

```bash
# Start local Firebase emulators
firebase emulators:start

# Run TypeScript in watch mode
npm run build:watch

# Run tests
npm test
```

### Deployment

The project uses separate Firebase projects for development and production:

```bash
# Deploy to development (default)
npm run deploy:dev

# Deploy to production (requires confirmation)
npm run deploy:prod

# Switch between projects
firebase use development  # or 'production'
```

See [Environment Setup Guide](docs/ENVIRONMENT_SETUP.md) for detailed configuration.

## Bot Commands

- `/start` - Welcome message and registration
- `/rates` - Current exchange rates from all sources
- `/history [days]` - Historical rates with trend analysis
- `/alert above|below [rate]` - Set price alerts
- `/predict` - AI-powered rate predictions
- `/compare` - Regional currency comparison
- `/subscribe` - Daily/weekly rate updates
- `/help` - Command reference

## Project Structure

```
mmk/
├── docs/           # Documentation and TODO tracking
├── functions/      # Firebase Cloud Functions
│   ├── src/
│   │   ├── handlers/     # Platform-specific bot handlers
│   │   ├── collectors/   # Data source scrapers
│   │   ├── validators/   # Data validation
│   │   └── utils/       # Shared utilities
│   └── tests/      # Test suites
└── .github/        # GitHub Actions workflows
```

## Contributing

1. Check [docs/TODO.md](docs/TODO.md) for available tasks
2. Create a feature branch
3. Update TODO.md when starting/completing tasks
4. Follow the commit conventions in [CLAUDE.md](CLAUDE.md)
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Disclaimer

This bot provides exchange rate information from various sources for reference only. Rates may vary and should be verified before making financial transactions. We are not responsible for any financial losses resulting from the use of this information.