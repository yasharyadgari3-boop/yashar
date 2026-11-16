#!/usr/bin/env bash
# Back up the database and the private files (license documents, product images).
# Usage: npm run backup            (reads DATABASE_URL and PRIVATE_STORAGE_DIR from .env)
# Output: backups/beautymed-YYYYMMDD-HHMMSS.dump and backups/private-YYYYMMDD-HHMMSS.tar.gz
# The backups folder holds personal data: keep it private and copy it off the server.
set -euo pipefail

if [ -f .env ]; then
  set -a; . ./.env; set +a
fi
: "${DATABASE_URL:?DATABASE_URL is not set}"

stamp="$(date +%Y%m%d-%H%M%S)"
dir="${BACKUP_DIR:-backups}"
mkdir -p "$dir"
chmod 700 "$dir"

# Prisma adds ?schema=... to the URL; pg_dump does not understand it.
pg_url="${DATABASE_URL%%\?*}"
pg_dump --format=custom --no-owner --file="$dir/beautymed-$stamp.dump" "$pg_url"

private_dir="${PRIVATE_STORAGE_DIR:-.data/private}"
if [ -d "$private_dir" ]; then
  tar -czf "$dir/private-$stamp.tar.gz" -C "$(dirname "$private_dir")" "$(basename "$private_dir")"
fi

chmod 600 "$dir"/*-"$stamp".* 2>/dev/null || true
echo "Backup written to $dir (stamp $stamp)"
