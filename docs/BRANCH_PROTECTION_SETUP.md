# Branch Protection Setup Checklist

This guide provides step-by-step instructions for setting up branch protection rules in GitHub.

## Prerequisites
- Admin access to the repository
- GitHub Actions workflows deployed (already done)

## Master/Main Branch Protection

1. **Navigate to Branch Protection**
   - Go to: https://github.com/KyawPh/mmk/settings/branches
   - Click "Add rule"

2. **Configure Rule for `master`**
   - Branch name pattern: `master`
   
3. **Enable Protection Settings**
   - [ ] Require a pull request before merging
     - [ ] Required approvals: 1
     - [ ] Dismiss stale pull request approvals when new commits are pushed
     - [ ] Require review from CODEOWNERS
   
   - [ ] Require status checks to pass before merging
     - [ ] Require branches to be up to date before merging
     - Status checks to require:
       - [ ] code-quality (18.x)
       - [ ] code-quality (20.x)
       - [ ] security-scan
       - [ ] firebase-validation
   
   - [ ] Require conversation resolution before merging
   
   - [ ] Include administrators (recommended for production safety)

4. **Save Changes**
   - Click "Create" or "Save changes"

## Development Branch (Optional)

If you plan to use a `develop` branch:

1. **Create `develop` branch**
   ```bash
   git checkout -b develop
   git push origin develop
   ```

2. **Add Protection Rule**
   - Branch name pattern: `develop`
   - Less restrictive settings:
     - [ ] Require status checks (but not PR reviews)
     - [ ] Allow force pushes for quick fixes

## Verification

After setting up:
1. Try to push directly to master (should fail)
2. Create a PR and verify checks run
3. Verify CODEOWNERS is working

## GitHub Secrets Setup

While in settings, also set up the required secret:

1. Go to: Settings > Secrets and variables > Actions
2. Add new repository secret:
   - Name: `FIREBASE_TOKEN`
   - Value: (Generate using `firebase login:ci`)

## Notes
- Branch protection rules take effect immediately
- All team members will need to use PRs for protected branches
- Admins can bypass rules if "Include administrators" is unchecked