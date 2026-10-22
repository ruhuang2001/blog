# Dependency security verification

Use a supported Node.js release (Node 24 in CI and Docker) and the pnpm version
declared in `package.json`. Install with `pnpm install --frozen-lockfile`.

## Repeatable verification

- `pnpm lint` and `pnpm test`: static checks and the existing regression suite.
- `pnpm test:e2e`: production build and Chrome checks for pages, pagination,
  images, Mermaid, KaTeX, metadata escaping, themes, and browser errors.
- `pnpm test:isr`: production-server upstream outage, stale page preservation,
  recovery, feed failure, and legitimate empty-database checks. Run separately
  from browser E2E because both use `.next`.
- `pnpm test:braces`: bounded subprocess verification of the installed dependency
  patch, including nested strings and external ASTs.
- `pnpm audit:dependencies`: fresh advisory lookup for every lockfile package,
  including optional platform binaries. Uses npm bulk advisories, with an
  authenticated `gh` GraphQL fallback if npm is unavailable. Incomplete audits
  and matched advisories return nonzero. No advisories are suppressed.

Reports, screenshots, logs, dependency versions, and the lockfile fingerprint
are saved under `output/playwright/`. CI uploads E2E evidence even on failure.
To compare a historical Dependabot snapshot, set `AUDIT_BASELINE` to a JSON array
downloaded from the repository's Dependabot alerts API.
The default optional baseline is `output/playwright/security/dependabot-before.json`;
if absent, only the fresh full-lock audit runs. Withdrawn baseline advisories do
not affect the result.

## Local braces mitigation

As checked on 2026-10-22, GHSA-vfj7-8cjw-p6xm affects braces through 3.0.3 and
has no published fixed version. Its recursive AST walkers can exhaust the stack
on deeply nested input. The version remains visible to advisory scanners.

`pnpm.patchedDependencies` applies `patches/braces@3.0.3.patch` at installation.
It bounds parsed nesting and validates external AST depth before recursive
walkers; over-deep input rejects with `ERR_BRACES_DEPTH`. The patch is exercised
through the installed package used by micromatch, with repeatable results in
`output/playwright/security/braces.json`. CI requires these checks to pass.

Treat this as a maintained local mitigation, not an upstream fixed release or
a clean advisory scan. Keep the alert visible until an upstream fix is available,
then replace the patch and rerun browser, ISR, and dependency verification.
