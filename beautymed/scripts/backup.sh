#!/usr/bin/env bash
# Back up the database and the private files (license documents, product images).
# Usage: npm run backup            (reads DATABASE_URL and PRIVATE_STORAGE_DIR from .env)
# Output: backups/beautymed-YYYYMMDD-HHMMSS.dump and backups/private-YYYYMMDD-HHMMSS.tar.gz
# The backups folder holds personal data: keep it private and copy it off the server.
set -euo pipefail

# Read .env, but a variable already set in the environment wins (so
# `DATABASE_URL=... npm run backup` backs up that database, not the one in .env).
if [ -f .env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    key="${line%%=*}"
    value="${line#*=}"
    value="${value%\"}"; value="${value#\"}"
    [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue
    if [ -z "${!key:-}" ] && [ -n "$value" ]; then export "$key=$value"; fi
  done < .env
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
