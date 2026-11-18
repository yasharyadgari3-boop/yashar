#!/usr/bin/env bash
# GitHub Codespaces helper (see docs/CODESPACES.md). Development only: mock SMS, payment and
# translation; nothing here is used on the real host.
#   bash beautymed/scripts/codespace.sh setup   once, when the codespace is created
#   bash beautymed/scripts/codespace.sh start   each time it opens: start the site on port 3000
set -euo pipefail
cd "$(dirname "$0")/.."

# The address the browser uses for port 3000 (outside Codespaces: localhost).
site_host() {
  if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
    echo "${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  fi
}

setup() {
  if [ ! -f .env ]; then
    host="$(site_host)"
    cp .env.example .env
    sed -i \
      -e "s#^DATABASE_URL=.*#DATABASE_URL=\"postgresql://beautymed:beautymed_dev@localhost:5432/beautymed_dev\"#" \
      -e "s#^AUTH_SECRET=.*#AUTH_SECRET=\"$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')\"#" \
      .env
    if [ -n "$host" ]; then
      sed -i \
        -e "s#^APP_URL=.*#APP_URL=\"https://${host}\"#" \
        -e "s#^ALLOWED_DEV_ORIGINS=.*#ALLOWED_DEV_ORIGINS=\"${host}\"#" \
        .env
    fi
    echo "Created .env for this codespace."
  fi

  npm ci --no-audit --no-fund

  echo "Waiting for the database..."
  for _ in $(seq 1 30); do
    if node -e "const {Client}=require('pg');const c=new Client({connectionString:'postgresql://beautymed:beautymed_dev@localhost:5432/beautymed_dev'});c.connect().then(()=>c.end()).then(()=>process.exit(0),()=>process.exit(1))"; then
      break
    fi
    sleep 2
  done

  npx prisma migrate deploy
  SEED_SAMPLE_ARTICLES=1 npm run db:seed
  echo "Setup finished. The site starts when the codespace opens (port 3000)."
}

start() {
  if node -e "require('net').connect(3000,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"; then
    echo "The site is already running on port 3000 (open the Ports tab)."
    return
  fi
  echo "Starting BeautyMed on port 3000. Keep this terminal open; the first page load takes a minute."
  exec npm run dev -- --port 3000
}

case "${1:-}" in
  setup) setup ;;
  start) start ;;
  *) echo "usage: codespace.sh setup|start" >&2; exit 2 ;;
esac
