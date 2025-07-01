#!/bin/bash

# Script to set Firebase Functions environment configuration for DEVELOPMENT
# Usage: ./scripts/set-env-dev.sh

echo "Setting Firebase Functions DEVELOPMENT environment configuration..."
echo "================================================"
echo "Project: mmk-currency-bot-dev"
echo "================================================"

# Switch to development project
firebase use development

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
prompt_with_default "Telegram Bot Token (DEV)" "" telegram_bot_token
prompt_with_default "Telegram Webhook Secret" "$(openssl rand -hex 32)" telegram_webhook_secret

# Admin configuration
prompt_with_default "Admin Telegram IDs (comma-separated)" "1633991807" admin_telegram_ids

# Feature flags for development
prompt_with_default "Enable Analytics (true/false)" "false" enable_analytics
prompt_with_default "Enable Debug Logs (true/false)" "true" enable_debug_logs

# Rate limiting (more relaxed for dev)
prompt_with_default "Rate Limit Per User Per Minute" "60" rate_limit_user
prompt_with_default "Rate Limit Global Per Minute" "5000" rate_limit_global

# Cache settings
prompt_with_default "Cache TTL for Rates (seconds)" "60" cache_ttl_rates
prompt_with_default "Cache TTL for User Data (seconds)" "300" cache_ttl_user

echo ""
echo "Setting Firebase configuration for DEVELOPMENT..."

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
    environment.name="development"

echo ""
echo "Development configuration set successfully!"
echo ""
echo "To download for local development:"
echo "  firebase functions:config:get > functions/.runtimeconfig.json"
echo ""
echo "Current project: $(firebase use)"