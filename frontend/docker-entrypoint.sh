#!/bin/sh
set -e

CHECKSUM_FILE="/app/node_modules/.package-lock-checksum"
CURRENT_CHECKSUM=$(md5sum /app/package-lock.json 2>/dev/null | cut -d' ' -f1 || echo "none")

if [ ! -d "/app/node_modules" ] || [ ! -f "$CHECKSUM_FILE" ] || [ "$(cat $CHECKSUM_FILE 2>/dev/null)" != "$CURRENT_CHECKSUM" ]; then
  echo "Dependencies changed, running npm install..."
  npm install
  echo "$CURRENT_CHECKSUM" > "$CHECKSUM_FILE"
else
  echo "Dependencies up to date"
fi

exec "$@"
