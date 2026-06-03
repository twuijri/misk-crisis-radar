#!/bin/sh
set -e

SRC=/app/index.html
DEST=/usr/share/nginx/html/index.html

# Start from a clean copy of the template every boot, then inject the
# runtime configuration from environment variables.
cp "$SRC" "$DEST"

sed -i \
  -e "s|__API_BASE__|${API_BASE:-/api}|g" \
  -e "s|__APP_VERSION__|${APP_VERSION:-dev}|g" \
  "$DEST"

exec nginx -g 'daemon off;'
