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
- Nested collection rows disappear or cause hydration errors.
- Italic text loses its font; toggle children or heading navigation stop working.

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
