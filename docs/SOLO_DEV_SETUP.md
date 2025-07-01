# Solo Developer Setup Guide

This is a simplified setup guide for solo developers working on the MMK Currency Bot.

## Quick Start

### 1. Minimal GitHub Setup

Since you're working alone, you only need:

#### Required GitHub Secret
1. Generate Firebase token:
   ```bash
   firebase login:ci
   ```
2. Add to GitHub:
   - Go to Settings > Secrets and variables > Actions
   - Add `FIREBASE_TOKEN` with the token value

#### Optional Branch Protection
For solo development, branch protection is optional but can help prevent accidents:
- No PR reviews required
- Just enable status checks to ensure code quality
- Allow yourself to push directly after checks pass

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