# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence. Without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

- **Runner:** Vitest 4.x
- **Environment:** jsdom
- **Assertion:** Vitest built-in + @testing-library/jest-dom
- **Component testing:** @testing-library/react

## Running tests

```bash
npm test          # single run
npm run test:watch  # watch mode
```

## Test directory

```
test/
├── setup.ts           # test setup (jest-dom matchers)
├── types.test.ts      # type contract tests
└── url-pattern.test.ts # URL detection logic tests
```

## Conventions

- File naming: `test/{name}.test.ts` or `test/{name}.test.tsx`
- Use `describe` blocks to group related tests
- One assertion per `it` block when practical
- Test behavior, not implementation
- Mock external dependencies (Supabase, OpenAI)

## Test layers

- **Unit tests:** Pure functions, type contracts, data transformations
- **Integration tests:** API route handlers with mocked Supabase
- **Component tests:** React components with @testing-library/react
- **E2E tests:** Future (Playwright)
