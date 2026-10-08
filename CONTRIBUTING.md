# Contributing

Bug reports and fixes are welcome. For anything bigger than a fix, open an [issue](https://github.com/haruhimemoe/tourney.haruhime.moe/issues) first so we can agree on it.

Read [AGENTS.md](./AGENTS.md) before changing code. It has the layout, code style and data rules.

## Setup

Requires Bun 1.4+ and Node 24+.

```sh
bun install
cp .env.example .env.local
bun run dev
```

The dev server runs on http://localhost:3000. The site needs a MongoDB replica set (bracket saves use transactions): set `MONGODB_URI` in `.env.local` (`mongod --replSet rs0` plus `rs.initiate()` works locally). Sign-in runs on the haruhime.moe hub, not here: tourney reads the hub's session from the `identity` database with the hub's `BETTER_AUTH_SECRET`, so signing in locally means running the hub too (both under `*.localhost` hosts, see next-kit's README, Identity, Local dev) and pointing `HUB_URL` at it. Player lookups and mp links need an osu! OAuth app's client credentials: fill in the first four variables (each one has a comment in `.env.example`).

`bun install` also sets up a lefthook pre-commit hook that runs Biome on staged files.

## Making a change

1. Branch from `main` (`feat/<topic>`, `fix/<topic>`).
2. Write a failing test in `tests/`, make it pass, and keep commits small.
3. If people will see the change, update the copy that describes it in the same PR: the README, `/data`, `/submit`, the credits page, the legal pages or llms.txt. AGENTS.md section 7 lists them.
4. Run the full check before opening a PR:

   ```sh
   bun run check && bun run typecheck && bun run test:coverage && SKIP_ENV_VALIDATION=true bun run build
   ```

5. Open a PR using the template. CI must be green before merge.

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).

## Tests

`bun run test` runs three Vitest projects. Run one with `bun run test:unit`, `test:components` or `test:integration`.

- `tests/unit/`: pure code, in Node, with `TZ=America/Los_Angeles`.
- `tests/components/`: React components in jsdom.
- `tests/integration/`: route handlers and services against an in-memory MongoDB replica set (mongodb-memory-server). The first run downloads the MongoDB binary.

Tests never reach osu!, the mirror (its batch lookup and its search), otdb or packs: msw stands in for them (`setupMsw` from `@haruhimemoe/next-kit/testing`, `tests/helpers/*-server.ts`, `tests/helpers/mirror-search.ts`, and `@haruhimemoe/mirror/testing`'s answers recorded from the mirror), with recorded fixtures in `tests/fixtures/`.

`tests/unit/tooling/` checks the repo itself: file headers and a doc comment on every export, and client imports.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Dev server |
| `bun run build` | Production build |
| `bun run check` / `check:fix` | Biome lint, format and import order |
| `bun run typecheck` | Route type generation, then `tsc` |
| `bun run test` | All Vitest projects |
| `bun run test:coverage` | Tests with v8 coverage; fails under 90% on `src/utils/` and `src/schemas/` |

CI runs the same checks, with `test:coverage` in place of `test`.
