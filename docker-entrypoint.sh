#!/bin/sh
set -e

SRC=/app/index.html
DEST=/usr/share/nginx/html/index.html

# Start from a clean copy of the template every boot, then inject the
# runtime configuration from environment variables.
cp "$SRC" "$DEST"

sed -i \
  -e "s|__SUPABASE_URL__|${SUPABASE_URL:-}|g" \
  -e "s|__SUPABASE_ANON_KEY__|${SUPABASE_ANON_KEY:-}|g" \
  -e "s|__ACCESS_CODE__|${ACCESS_CODE:-}|g" \
  "$DEST"

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "[crisis-radar] WARNING: SUPABASE_URL / SUPABASE_ANON_KEY not set — running in DEMO mode."
fi

exec nginx -g 'daemon off;'
