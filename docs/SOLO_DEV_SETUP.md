# Solo Developer Setup Guide

This is a simplified setup guide for solo developers working on the MMK Currency Bot.

## ✅ Complete Setup Checklist

Follow these steps in order:

- [ ] Create GitHub Environments (2 min)
  - [ ] Create `development` environment
  - [ ] Create `production` environment
- [ ] Add GitHub Secret (2 min)
  - [ ] Generate Firebase token: `firebase login:ci`
  - [ ] Add `FIREBASE_TOKEN` to GitHub Secrets
- [ ] Local Environment (already done)
  - [x] Bot token configured in `.env`
  - [x] Admin ID configured
- [ ] First Deploy (5 min)
  - [ ] Run `npm run deploy:dev` to test
  - [ ] Check GitHub Actions tab for status

**That's it!** You're ready to code and deploy.

## Quick Start

### 1. Minimal GitHub Setup

Since you're working alone, you only need these three things:

#### A. GitHub Environments (2 minutes)
Create these for deployment tracking:

1. Go to Settings > Environments
2. Click "New environment" → Name: `development` → Create (no settings needed)
3. Click "New environment" → Name: `production` → Create
   - Optional: Add 5-minute wait timer for safety
   - No reviewers needed!

#### B. GitHub Secret (Required)
1. Generate Firebase token:
   ```bash
   firebase login:ci
   ```
2. Add to GitHub:
   - Go to Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `FIREBASE_TOKEN`
   - Value: Paste the token from step 1
   - Click "Add secret"

#### C. Branch Protection (Optional)
Skip this unless you want extra safety:
- Go to Settings > Branches > Add rule
- Branch pattern: `master`
- ✅ Require status checks (pick the workflows)
- ✅ Include administrators
- ❌ Skip everything else

### 2. Simplified Workflow

#### Daily Development Flow
```bash
# Work directly on master (or use feature branches if preferred)
git add .
git commit -m "feat: your feature"
git push origin master

# This will:
# - Run quality checks automatically
# - Deploy to production if on master
# - No PR needed, no reviews needed
```

#### Quick Deployment Commands
```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Check deployment logs
firebase functions:log
```

### 3. Skipping Team Features

You can ignore these team-oriented features:
- CODEOWNERS file (kept for future)
- PR review requirements
- Multiple approvals
- Review notifications

### 4. Quality Checks

Even as a solo developer, these automated checks help:
- ✅ TypeScript compilation
- ✅ ESLint for code quality
- ✅ Prettier for formatting
- ✅ Tests (when you add them)

These run automatically on push and locally via pre-commit hooks.

### 5. Emergency Workflows

#### Skip CI Checks (Use Sparingly!)
```bash
# Add [skip ci] to commit message
git commit -m "fix: urgent fix [skip ci]"
```

#### Quick Rollback
```bash
# Find last working commit
git log --oneline

# Reset to it
git reset --hard <commit-hash>
git push --force origin master
```

### 6. Future Team Growth

When you add team members:
1. Enable branch protection fully
2. Require PR reviews
3. Activate CODEOWNERS
4. Set up protected environments

The infrastructure is already in place!

## Recommended Solo Dev Settings

### GitHub Branch Protection (Optional)
- Branch: `master`
- ✅ Require status checks
- ❌ Require PR reviews (skip this)
- ✅ Include administrators (so you can force push if needed)

### Deployment Strategy
- Use `develop` branch for experiments (optional)
- Push to `master` for production deployments
- Tag releases when reaching milestones

### Time Savers
1. Work directly on master for small fixes
2. Use feature branches only for large changes
3. Commit often - CI will catch issues
4. Deploy frequently - rollback is easy

## Command Reference

```bash
# Development
npm run serve         # Local Firebase emulators
npm run build:watch   # Auto-rebuild on changes

# Quality
npm run lint:fix      # Auto-fix linting issues
npm run format        # Auto-format code

# Deployment
npm run deploy:dev    # Deploy to development
npm run deploy:prod   # Deploy to production

# Git
git push origin master              # Auto-deploys to production
git tag v1.0.0 && git push --tags   # Create release
```

## Solo Dev Advantages

1. **Faster Iteration**: No waiting for reviews
2. **Direct Deployment**: Push = Deploy
3. **Quick Fixes**: Emergency patches without process
4. **Full Control**: You decide the workflow

## When to Add Process

Consider adding more process when:
- You make mistakes that automation could catch
- You want deployment approvals for safety
- You're ready to add team members
- You need audit trails for compliance

Remember: The full team infrastructure is ready when you need it!

## Troubleshooting

### GitHub Actions Not Running?
- Check if you added `FIREBASE_TOKEN` secret
- Make sure environments are created (even if empty)
- Check Actions tab for error messages

### Deployment Failed?
- Verify Firebase projects exist (`mmk-currency-bot` and `mmk-currency-bot-dev`)
- Run `firebase login` to refresh credentials
- Check `firebase projects:list` shows both projects

### Need More Details?
- [Environment Setup Guide](ENVIRONMENT_SETUP.md) - Detailed Firebase configuration
- [TODO.md](TODO.md) - Track your progress

### Common Commands
```bash
# If deployment fails locally
firebase login --reauth
firebase use development  # or production

# Check which project is active
firebase use

# View logs
firebase functions:log --project mmk-currency-bot-dev
```