# AGENTS.md

Dispose Me — AWS-hosted disposable email service. TypeScript, AWS CDK, Express,
Lambda, DynamoDB, S3, SES. Node.js >= 22, pnpm >= 10.24.

## Build / Lint / Test Commands

```bash
pnpm install --frozen-lockfile   # Install dependencies (use frozen lockfile)
pnpm build                       # Install + clean dist/ + build CSS + webpack bundle
pnpm build:css                   # Build Tailwind CSS (generates output.css)
pnpm lint                        # Biome check (lint + format) on bin/ lib/ service/
pnpm test                        # Jest (all tests)
pnpm test:coverage               # Jest with coverage report
```

**Important:** The `build` command automatically runs `build:css` before webpack bundling.
If running webpack directly, ensure `build:css` has been executed first to generate
`service/assets/css/output.css`.

### Running a single test

```bash
pnpm test -- --testPathPattern='EmailDatabase'          # by filename pattern
pnpm test -- test/service/tools/EmailDatabase.test.ts   # by exact path
pnpm test -- -t 'should store email'                    # by test name pattern
```

### Deploy (requires AWS credentials)

```bash
pnpm deploy          # build + lint + test + cdk deploy
pnpm deploy:ci       # webpack + cdk deploy (no approval prompt)
```

## Styling

**Tailwind CSS v4** is used for all styling (configured in `service/assets/css/styles.css`).

- Source file: `service/assets/css/styles.css` (Tailwind directives and configuration)
- Generated output: `service/assets/css/output.css` (built by `pnpm build:css`)
- The generated `output.css` is excluded from version control (`.gitignore`)
- Static assets are deployed to CloudFront with 1-year cache (invalidated on deploy)

Tailwind v4 uses CSS-based configuration instead of JavaScript config files:
- Theme customization via `@theme` directive in `styles.css`
- Content scanning via `@source` directive (currently scans `service/views/**/*.ejs`)
- No `tailwind.config.js` file needed

**Do not** add inline styles or custom CSS files. Use Tailwind utility classes in EJS templates.

## Code Style

Formatting and linting are handled by **Biome** (config in `biome.json`).

- **Indent**: 2 spaces
- **Quotes**: single quotes for JS/TS
- **Line width**: 100 characters max
- **Semicolons**: required (Biome default)
- **Trailing commas**: all (Biome default)
- **Console**: `console.*` is forbidden — use the custom `Logger` from `service/tools/log.ts`
- Run `pnpm lint` before committing to catch issues

### Imports

Order imports in this sequence, separated by blank lines:

1. Node built-ins with `node:` prefix (`import * as path from 'node:path'`)
2. Third-party packages (`@aws-sdk/*`, `express`, `dayjs`, etc.)
3. Relative/internal imports (`../tools/EmailDatabase`, etc.)

Additional rules:
- Use `import type { X }` for type-only imports (enforced by convention)
- Prefer named imports over default imports
- Biome auto-organizes imports via `organizeImports: "on"`

### File Naming

- **PascalCase** for files containing a class: `EmailDatabase.ts`, `InboxController.ts`
- **kebab-case** for entry points and CDK constructs: `email-processor.ts`, `dispose-me-stack.ts`
- **camelCase** for utility/config modules: `const.ts`, `feed.ts`, `utils.ts`, `validators.ts`

### Naming Conventions

| Element            | Convention       | Example                            |
|--------------------|------------------|------------------------------------|
| Classes            | PascalCase       | `EmailDatabase`, `InboxController` |
| Interfaces         | PascalCase       | `InboxListParams`, `GetApiKeyProps`|
| Type aliases       | PascalCase       | `ParsedEmail`, `EmailDetails`      |
| Functions/methods  | camelCase        | `normalizeUsername`, `getToken`     |
| Exported constants | UPPER_SNAKE_CASE | `TABLE_NAME`, `EMAIL_TTL_DAYS`     |
| Local variables    | camelCase        | `emailDatabase`, `fileSystem`      |
| Class members      | `protected`      | use `protected`, not `private`     |

### Types and Interfaces

- Define types/interfaces close to where they are used (same file), not in a central types file
- Use `interface` for object shapes and contracts (request params, props)
- Use `type` for aliases, unions, and computed types (`type InboxResponse = Promise<Response>`)
- The `types/` directory is only for ambient module declarations for untyped packages

### Exports

- Use **named exports** everywhere (`export class`, `export const`, `export type`)
- Do not use default exports (the sole exception is `Logger` in `log.ts`)
- Export standalone functions as arrow functions assigned to `const`:
  ```typescript
  export const normalizeUsername = (input: string): string => { ... };
  ```
- Lambda handlers: `export const handler: SESHandler = async (event) => { ... }`

### Error Handling

- **Service/processing layer**: try/catch, log the error, re-throw
  ```typescript
  catch (err) {
    log.error('Failed to process email', err);
    throw err;
  }
  ```
- **Controller layer**: never throw; render appropriate HTTP status (403/404/422/500)
  with `res.status(code).render(...)`. Validation errors return 422 via `express-validator`.
- **Never expose internal error details** to clients

### Async Patterns

- Use `async/await` exclusively — no `.then()/.catch()` promise chains
- Use `Promise.all()` for parallel operations
- Environment variable access: always use nullish coalescing fallback
  (`process.env.X ?? 'default'`)

### Logging

Use the custom `Logger` class (`service/tools/log.ts`), not `console.*`:
```typescript
import log from './tools/log';
log.info('message');
log.error('message', error);
```
Log levels are numeric via `LOG_LEVEL` env var (1=error through 5=trace).

## Testing

- **Framework**: Jest 30 with ts-jest preset, Node test environment
- **Test location**: `test/` directory mirrors `service/` structure
- **File naming**: `<SourceFileName>.test.ts`
- **Config**: `jest.config.js` — sets env vars, coverage thresholds (75% branches,
  80% functions/lines/statements)

### Test Structure

- Use `describe()` to group by class/module, then by method
- Use `test()` — **never** `it()`
- Use `test.each()` for parameterized/data-driven tests
- Structure test bodies with comments: `// given`, `// when`, `// then`, `// and`

```typescript
describe('EmailDatabase', () => {
  describe('store()', () => {
    test('should store email metadata', async () => {
      // given
      const email = mockParsedEmail();

      // when
      await database.store('user', 'msg-id', email);

      // then
      expect(ddbMock).toHaveReceivedCommandWith(PutCommand, expect.objectContaining({
        TableName: 'emails',
      }));
    });
  });
});
```

### Mocking Strategies

1. **Manual mocks** (`__mocks__/` directories): used for core service classes
   (`EmailDatabase`, `EmailParser`, `S3FileSystem`). Activated with `jest.mock('...')`.
2. **`aws-sdk-client-mock`**: for AWS SDK clients (DynamoDB, S3).
   `const ddbMock = mockClient(DynamoDBDocumentClient)`
3. **`fetch-mock`**: for HTTP request mocking in validator tests.
4. **Inline `jest.fn()`**: for simple one-off mocks and Express req/res objects.

Shared test utilities live in `test/utils.ts` (mock factories for Request, Response,
ParsedEmail, typed mock accessors).

### Assertions

- `expect(x).toEqual(y)` for deep equality
- `expect(x).toMatchObject(y)` for partial matching
- `expect(x).toHaveBeenCalledWith(...)` for mock verification
- `expect.objectContaining({...})` and `expect.any(Type)` for flexible matching
- `await expect(fn()).rejects.toThrow('msg')` for async error assertions

## Pull Requests

- Always create pull requests in **Draft** mode (`gh pr create --draft`) unless
  explicitly instructed otherwise.
- When creating release notes or "What's Changed" summaries, base the format on
  `.github/PULL_REQUEST_TEMPLATE.md`

## Project Structure

```
bin/              CDK app entry point
lib/              CDK infrastructure (stacks, constructs)
service/          Lambda handlers + business logic
  api/            Express controller (InboxController)
  processor/      Email processing (IncomingEmailProcessor)
  tools/          Shared utilities (DB, S3, parser, logger, validators, constants)
  views/          EJS templates
test/             Tests (mirrors service/ structure)
types/            Ambient type declarations for untyped packages
```
