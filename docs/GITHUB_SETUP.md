# GitHub Repository Setup Guide

This guide explains how to configure GitHub Actions and secrets for the MMK Currency Bot.

## Required GitHub Secrets

### 1. FIREBASE_TOKEN

This token allows GitHub Actions to deploy to Firebase.

#### How to generate:
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Generate CI token
firebase login:ci
```

#### How to add to GitHub:
1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Name: `FIREBASE_TOKEN`
5. Value: Paste the token from the command above

## GitHub Environments

Create two environments for deployment protection:

### Development Environment
1. Go to Settings > Environments
2. Click "New environment"
3. Name: `development`
4. No additional protection rules needed

### Production Environment
1. Go to Settings > Environments
2. Click "New environment"
3. Name: `production`
4. Configure protection rules:
   - ✅ Required reviewers (add trusted team members)
   - ✅ Prevent self-review
   - Set wait timer: 5 minutes (optional)

## Branch Protection Rules

### For `master` or `main` branch:
1. Go to Settings > Branches
2. Click "Add rule"
3. Branch name pattern: `master` (or `main`)
4. Enable protections:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1 or more)
   - ✅ Dismiss stale pull request approvals
   - ✅ Require status checks to pass:
     - `code-quality (18.x)`
     - `security-scan`
     - `firebase-validation`
   - ✅ Require branches to be up to date
   - ✅ Include administrators

### For `develop` branch:
1. Create similar rule but with relaxed settings
2. Allow direct pushes for rapid development
3. Still require status checks

## Workflow Permissions

1. Go to Settings > Actions > General
2. Under "Workflow permissions":
   - Select "Read and write permissions"
   - ✅ Allow GitHub Actions to create and approve pull requests

## Using the Workflows

### Automatic Deployments
- Push to `develop` → Deploys to development
- Push to `master`/`main` → Deploys to production
- Create tag `v*` → Creates release and deploys

### Manual Deployments
1. Go to Actions tab
2. Select "Deploy to Firebase" workflow
3. Click "Run workflow"
4. Choose environment (development/production)

### Creating Releases
```bash
# Create and push a version tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Monitoring Deployments

### Check Deployment Status
- Actions tab shows all workflow runs
- Each deployment creates a tag for production
- Check Firebase Console for live status

### Rollback Procedure
1. Find the last working deployment tag
2. Create a new tag from that commit
3. Push the tag to trigger deployment

## Troubleshooting

### Firebase Token Expired
- Regenerate with `firebase login:ci`
- Update the GitHub secret

### Deployment Fails
- Check Actions logs for errors
- Verify Firebase project exists
- Ensure all secrets are set correctly

### Permission Errors
- Verify GitHub token has correct permissions
- Check Firebase IAM settings