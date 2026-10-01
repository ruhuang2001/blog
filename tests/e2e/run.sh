#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

node tests/e2e/create-fixture.cjs
export NOTION_API_USE_FIXTURES=1
export NOTION_API_FIXTURE_PATH=output/playwright/notion-api.json
export NOTION_PAGE_ID=11111111111111111111111111111111
export VERCEL_ENV=production
port="${E2E_PORT:-3100}"
session="blog-e2e-$$"
pw() { npx --yes --package @playwright/cli@0.1.22 playwright-cli -s="$session" "$@"; }

# Refuse to test a different process accidentally listening on this port.
node -e 'const s = require("node:net").createServer(); s.on("error", () => process.exit(1)); s.listen(Number(process.argv[1]), () => s.close())' "$port"
pnpm build > output/playwright/build.log 2>&1
pnpm start --port "$port" > output/playwright/server.log 2>&1 &
server_pid=$!
cleanup() { pw close >/dev/null 2>&1 || true; kill "$server_pid" 2>/dev/null || true; }
trap cleanup EXIT
for attempt in {1..30}; do
  if curl --silent --fail "http://127.0.0.1:$port/" > /dev/null; then break; fi
  sleep 1
done
pw open "http://127.0.0.1:$port/" > output/playwright/browser.log
pw run-code --filename tests/e2e/browser.js --raw > output/playwright/e2e-result.json
node -e 'const r = require("./output/playwright/e2e-result.json"); console.log(`${r.passed}/${r.checks.length} E2E scenarios passed`); if (r.failed.length) { console.error(r.failed); process.exit(1) }'
pw run-code --filename tests/e2e/measure.js --raw > output/playwright/optimized-measurement.json
node -e 'const r = require("./output/playwright/optimized-measurement.json"); if (r.pageErrors.length || r.home.fonts.some(f => /Italic/.test(f.path)) || !r.article.codeNodeRetainedOnThemeChange || r.article.toggleCount !== 1) process.exit(1); console.log(`Home font bytes: ${r.home.fontBytes}`)'
