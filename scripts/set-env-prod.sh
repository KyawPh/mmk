#!/bin/bash

# Script to set Firebase Functions environment configuration for PRODUCTION
# Usage: ./scripts/set-env-prod.sh

echo "⚠️  WARNING: Setting Firebase Functions PRODUCTION environment configuration..."
echo "================================================"
echo "Project: mmk-currency-bot (PRODUCTION)"
echo "================================================"

# Confirm production deployment
read -p "Are you sure you want to configure PRODUCTION environment? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Configuration cancelled."
    exit 1
fi

# Switch to production project
firebase use production

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Error: Firebase CLI is not installed. Please install it first."
    exit 1
fi

# Function to prompt for value with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        value="${value:-$default}"
    else
        read -p "$prompt: " value
    fi
    
    eval "$var_name='$value'"
}

echo ""
echo "Please provide the following configuration values:"
echo "================================================"

# Telegram configuration
prompt_with_default "Telegram Bot Token (PROD)" "" telegram_bot_token
prompt_with_default "Telegram Webhook Secret" "$(openssl rand -hex 32)" telegram_webhook_secret

# Admin configuration
prompt_with_default "Admin Telegram IDs (comma-separated)" "" admin_telegram_ids

# Feature flags for production
prompt_with_default "Enable Analytics (true/false)" "true" enable_analytics
prompt_with_default "Enable Debug Logs (true/false)" "false" enable_debug_logs

# Rate limiting (stricter for prod)
prompt_with_default "Rate Limit Per User Per Minute" "20" rate_limit_user
prompt_with_default "Rate Limit Global Per Minute" "1000" rate_limit_global

# Cache settings
prompt_with_default "Cache TTL for Rates (seconds)" "300" cache_ttl_rates
prompt_with_default "Cache TTL for User Data (seconds)" "3600" cache_ttl_user

# Monitoring
prompt_with_default "Sentry DSN (optional)" "" sentry_dsn
prompt_with_default "Enable Monitoring (true/false)" "true" monitoring_enabled

echo ""
echo "⚠️  Setting Firebase configuration for PRODUCTION..."

# Final confirmation
read -p "Last chance - deploy to PRODUCTION? (yes/no): " final_confirm
if [ "$final_confirm" != "yes" ]; then
    echo "Configuration cancelled."
    exit 1
fi

# Set the configuration
firebase functions:config:set \
    telegram.bot_token="$telegram_bot_token" \
    telegram.webhook_secret="$telegram_webhook_secret" \
    admin.telegram_ids="$admin_telegram_ids" \
    features.enable_analytics="$enable_analytics" \
    features.enable_debug_logs="$enable_debug_logs" \
    rate_limit.per_user_per_minute="$rate_limit_user" \
    rate_limit.global_per_minute="$rate_limit_global" \
    cache.ttl_rates="$cache_ttl_rates" \
    cache.ttl_user_data="$cache_ttl_user" \
    monitoring.sentry_dsn="$sentry_dsn" \
    monitoring.enabled="$monitoring_enabled" \
    environment.name="production"

echo ""
echo "✅ Production configuration set successfully!"
echo ""
echo "Current project: $(firebase use)"
echo ""
echo "To deploy to production:"
echo "  npm run deploy:prod"