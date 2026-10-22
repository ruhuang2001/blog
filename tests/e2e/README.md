# Performance regression fixture

Run `bash tests/e2e/run.sh` after `pnpm install --frozen-lockfile`.
It builds and starts the production app on port 3100 (override with `E2E_PORT`),
uses a fresh Chrome session via pinned Playwright CLI, and exits nonzero on failure.
Chrome must be installed. It leaves JSON reports, build/server logs, and desktop,
dark-mode and mobile screenshots in `output/playwright/`; generated files are ignored.
The script closes its browser and server on exit. Build requires access to the talks
source (with the existing fallback); browser checks only read the comment service,
never submit comments. Notion data is the local fixture, not the live database.

Failure modes to check before changing production code:

- Pagination loses or duplicates published posts; RSS changes database order.
- A missing article body breaks its page or the entire RSS feed.
- Lazy code blocks lose highlighting or Mermaid diagrams after a theme change.
- Cold article loads hydrate a following sibling against server-only lazy equation
  markup; use a fresh browser context to cover this module-loading race.
- Nested collection rows disappear or cause hydration errors.
- Italic text loses its font; toggle children or heading navigation stop working.

Security failure modes to check before changing implementation:

- Restricting remote image hosts accidentally prevents local public images from
  being optimized, or a forbidden remote URL reaches an upstream server.
- Mermaid HTML labels or JavaScript links execute script, inject executable DOM,
  or navigate the browser when their diagram nodes are clicked.
- Malformed Mermaid syntax creates an unhandled rejection, leaves a misleading
  SVG, or hides the original source instead of showing an accessible fallback.
- A failed or malicious diagram breaks other diagrams or theme changes.
- Article metadata containing a closing script tag escapes its JSON-LD element,
  executes JavaScript, or loses the original description during safe serialization.

The security examples live only on `/fixture-post-8`. Local optimizer checks use
`/favicon.png` and `/talks/from-chat-to-agent.png`; the forbidden remote target
uses this same local fixture server, so the security checks need no external host.
The browser report records status and content type for image checks and verifies
script sentinels, rendered DOM, fallback source, and light/dark theme changes.
`e2e-security.png` records the final fallback and rendered diagrams.

Generate the isolated fixture with `node tests/e2e/create-fixture.cjs`.
Run the application with `NOTION_PAGE_ID=11111111111111111111111111111111`
and `NOTION_API_FIXTURE_PATH=output/playwright/notion-api.json`.
The original fixture is never modified.

Exercise `/`, `/page/2`, `/search`, `/tag/Testing`, `/fixture-post`,
`/fixture-post-9`, `/about`, and `/feed` in a production build.
Database order is Fixture Post, Fixture Post 2 through Fixture Post 9;
post 9 intentionally has no body fixture. Page one has seven posts.
RSS should retain all nine posts and use post 9's summary as fallback.

On `/fixture-post`, verify `Fixture Heading`, `pre code` containing
`const fixtureAnswer = 42`, a Mermaid SVG containing `Fixture Start`,
`em` containing `Fixture italic text`, `details summary` containing
`Fixture Toggle`, its child `Fixture toggle child`, and nested database
row `Fixture Collection Row`. Click the heading's `[data-target-id]` link,
open the toggle, and switch the browser's preferred color scheme.
Save screenshots, browser errors, request/transfer measurements, and assertion
results under `output/playwright/` as repeatable E2E artifacts.

## Notion availability regression

Before implementation, cover these failure modes in `node tests/e2e/notion-failure.cjs`:

- Missing database responses must reject a production build.
- Failed upstream requests must preserve previously generated home, search, tag,
  pagination, and article pages during ISR instead of replacing them with empty data.
- Missing views, malformed reducers, missing referenced rows, and invalid schemas
  must return RSS 503 with no-store rather than publishing an empty feed.
- An uncached article request during an outage must fail instead of caching a 404.
- Recovery must update the homepage and RSS; an actually unknown article must 404.
- An explicitly empty, valid collection must still return a successful empty feed.
- An existing blank draft row without properties is legitimate and must not prevent
  the nine published fixture posts from appearing in RSS; absent row blocks still fail.

This production-server check uses Node's standard library, isolated fixture copies,
port 3102, and shortened revalidation in the generated build manifest only. It leaves
repeatable JSON results and build/server logs in `output/playwright/failures/`.
Run separately from other Next build/server checks because it uses `.next`.

## Braces stack-exhaustion regression

Before writing the local dependency patch, cover these isolated failure modes:

- Deep balanced braces, parentheses, or mixed nesting below the upstream character
  limit reach recursive compile, expand, or stringify walkers and overflow the stack.
- Deep unclosed input reaches parser cleanup before a nesting guard can reject it.
- Direct AST inputs bypass parser protection, including cyclic child structures.
- Direct imports of the dependency's recursive walkers bypass public entry guards.
- User options disable the guard or raise it beyond the safe fixed nesting bound.
- A guard mistakes escaped, quoted, or square-bracket literals for nested blocks.
- Ordinary compile, expand, stringify, ranges, and malformed shallow input change
  behavior; rejected input prevents a subsequent ordinary operation from succeeding.
- Verification accidentally exercises an unpatched package copy or records success
  after a child process crashes, hangs, or exits without a valid result.

Run `node tests/e2e/braces-security.cjs` after installing the patched dependency.
It runs the actual installed package in bounded subprocesses and writes the
repeatable report `output/playwright/security/braces.json`, including package
paths, patch fingerprint, successful compatibility cases, and rejected attacks.
The local patch mitigates GHSA-vfj7-8cjw-p6xm; upstream version 3.0.3 remains
affected in advisory databases, so an audit can still report that version.
