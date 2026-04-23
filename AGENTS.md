# AGENTS

This file is the Codex-facing project guide. It mirrors the intent of
`CLAUDE.md` and provides a single reference point for repository-specific
working conventions.

## Project summary

- App type: Next.js application
- Language: TypeScript
- Package manager: npm
- Main concerns: Supabase-backed auth/data flows, API routes, React UI, tests in
  `test/`

## Core commands

- Dev server: `npm run dev`
- Build: `npm run build`
- Production server: `npm run start`
- Lint: `npm run lint`
- Tests: `npm test`
- Watch tests: `npm run test:watch`

## Skill routing

When the user's request matches an available specialized skill in the current
agent environment, prefer invoking that skill first instead of handling the
task ad hoc.

Routing guidance from `CLAUDE.md`:

- Product ideas, "is this worth building", brainstorming -> `office-hours`
- Bugs, errors, "why is this broken", 500 errors -> `investigate`
- Ship, deploy, push, create PR -> `ship`
- QA, test the site, find bugs -> `qa`
- Code review, check my diff -> `review`
- Update docs after shipping -> `document-release`
- Weekly retro -> `retro`
- Design system, brand -> `design-consultation`
- Visual audit, design polish -> `design-review`
- Architecture review -> `plan-eng-review`
- Save progress, checkpoint, resume -> `checkpoint`
- Code quality, health check -> `health`

If a named skill is not available in the current runtime, follow the same
intent with the standard toolchain and repository conventions.

## Testing rules

- Test runner: Vitest
- Test directory: `test/`
- See `TESTING.md` for conventions and examples
- When writing new functions, write a corresponding test
- When fixing a bug, add a regression test
- When adding error handling, add a test that triggers the error
- When adding a conditional branch, test both paths
- Never leave the repository with known failing tests caused by your changes

## Test conventions

- File naming: `test/{name}.test.ts` or `test/{name}.test.tsx`
- Prefer `describe` blocks for related behavior
- Test behavior over implementation details
- Mock external dependencies such as Supabase and OpenAI where appropriate

## Working notes

- Check `.env.local` when auth, Supabase, or OpenAI-backed flows fail at runtime
- Supabase-related code exists in `src/lib/supabase/` and auth flow code under
  `src/app/auth/`
- API routes live under `src/app/api/`
- Keep changes small, verify them, and preserve unrelated user changes
