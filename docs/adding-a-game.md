# Adding a new game package

How to add `packages/<game>` to this monorepo, using `tic-tac-toe` as the reference implementation.

## 1. Package layout

```
packages/<game>/
  src/        # shipped: schema + strategy (or pre-generated table). No game progression, no search
  reference/  # test-only oracle: rules + exhaustive search. Not shipped (files: lib/ only)
  test/       # exhaustive cross-checks and property tests
  readme.md   # English (canonical)
  readme.ja.md
  package.json
  tsconfig.json        # build: src/ -> lib/
  tsconfig.check.json  # typecheck: src + reference + test
```

Policies that shape the code:

- **Shipped code holds neither game progression nor search.** A concise strategy becomes conditionals; otherwise the package looks up a pre-generated table.
- **Correctness is guaranteed by tests**: cross-check every reachable position against `reference/`, and verify the oracle itself against independently known numbers (position counts, outcome breakdowns).
- **States that cannot arise in a real game throw.** If reachability cannot be checked cheaply, state in the readme that behavior is undefined instead.
- Public API is aligned across games: `bestMove(state)` (null when over), `stateSchema` / `parseState`, `initialState`.

## 2. package.json checklist

Copy from `packages/tic-tac-toe/package.json` and adjust:

- `name`: `@gamod/<game>`, `version`: `0.1.0`
- dual exports: `lib/cjs` (with `{"type":"commonjs"}` marker) + `lib/esm` + `lib/types`
- `files: ["lib/"]`, `sideEffects: false`
- `repository.directory`: `packages/<game>` (required for provenance in a monorepo)
- `publishConfig.access: "public"`, `prepublishOnly: "pnpm build"`
- copy the root `LICENSE` into the package

Build scripts are plain `tsc` (see tic-tac-toe). Root `pnpm test` picks up `packages/*/test/**/*.test.ts` automatically via `vitest.config.ts`.

## 3. Demo

Add `apps/demo/src/games/<game>.ts` exporting a `Demo` (see `games/ticTacToe.ts`), then append it to `demos` in `apps/demo/src/main.ts`. Tabs, language switch, and the readme link are derived automatically. The demo re-implements game progression locally — never import from `reference/`.

## 4. Publishing

### First publish (manual, once per package)

npm cannot bootstrap a package over OIDC: the trusted-publisher setting lives on the package page, so the package must exist first (npm/cli#8544). Classic tokens are dead, so the first publish is local:

```bash
cd packages/<game>
npm login                # if needed
npx npm@latest publish   # npm >= 12: browser auth flow works with passkeys
```

Notes:

- Passkey-only accounts have no 6-digit OTP; use the browser flow above. Open the auth URL **in a browser already logged into npmjs.com**, promptly (the auth ID is short-lived).
- After a successful PUT, npm's publish-time malware scan hides the package for ~5–15 minutes. `npm view` returning 404 right after publishing is expected.
- npm 2FA setting: use "Require two-factor authentication and disallow bypass 2fa tokens". OIDC is not a token and keeps working. Set this **before** registering the trusted publisher — changing it later can silently drop the registration.

### Trusted publisher setup (once per package, on npmjs.com)

Package → Settings → Trusted Publisher:

| field | value |
| --- | --- |
| Provider | GitHub Actions |
| Organization/user | `elzup` |
| Repository | `gamod` |
| Workflow filename | `npm-publish.yml` (exact match) |
| Environment | (empty) |

### Subsequent releases (CI)

```bash
# bump version in packages/<game>/package.json, commit, then:
git tag <game>-v<version>
git push origin refs/tags/<game>-v<version>
```

`.github/workflows/npm-publish.yml` runs test + publish with provenance. When a second package exists, generalize the workflow (e.g. one job per package or a matrix) — do not build the abstraction before then.

## 5. When the second game lands

- Extract `reference/engine.ts` into a test-only `@gamod/core` (planned; not before).
- Revisit this doc and fix whatever drifted.
