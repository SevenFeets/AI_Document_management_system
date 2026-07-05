# Study Notes — Document Search Project

Personal Q&A log for concepts, debugging, and patterns learned while building this project.

**How to use this file**

- Each **topic** is a section with a clear title.
- Under each topic: **Question** (what you asked) and **Answer** (explanation in plain language).
- New topics are added at the **bottom** (newest last) unless a topic is being extended.
- Link to code when useful: `backend/src/...`

---

## Topic 1 — Phase 5.1 unit tests (overview)

**Question:** Where do I start with unit tests from `IMPLEMENTATION_PLAN.md` (document, search, AI, queue services)?

**Answer:**


| Order | File                         | What to test                                       | Status          |
| ----- | ---------------------------- | -------------------------------------------------- | --------------- |
| 1     | `documents.service.spec.ts`  | Repository, S3, queue, Elasticsearch orchestration | done (19 tests) |
| 2     | `search.service.spec.ts`     | Thin wrapper: ES search + summarize flow           | done (6 tests)  |
| 3     | `ai.service.spec.ts`         | Mock mode, chains, truncation                      | done (13 tests) |
| 4     | `document.processor.spec.ts` | Bull job, progress, status `INDEXED` / `ERROR`     | not started     |


- Tests live next to source: `backend/src/**/*.spec.ts`
- Run: `cd backend` then `node node_modules/jest/bin/jest.js <name>.spec --forceExit` (Windows path with `&` can break `npm test`)
- **Unit tests** = mock all I/O (no real DB, ES, S3, API keys)
- Reference implementation: `backend/src/ai/ai.service.spec.ts`

---

## Topic 2 — Learning rule levels (`.cursor/rules/learning.mdc`)

**Question:** What do the help levels mean when asking the agent for guidance?

**Answer:**


| Phrase                                | What you get                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **"I need help" / "I need guidance"** | Pseudocode for tests; empty method skeletons for production code — no empty `it('...', () => {})` files |
| **"I need detailed guidance"**        | Small snippets (5–10 lines), one pattern at a time                                                      |
| General question (no phrase)          | Architecture and steps in prose, minimal code                                                           |
| **"stuck"**                           | Full working implementation (e.g. complete `*.spec.ts`)                                                 |


---

## Topic 3 — Mock pitfall in NestJS tests

**Question:** Why didn’t my `summarizeDocument` tests work when I called `createMockDocumentsService().findOne.mockResolvedValue(...)` inside each `it`?

**Answer:**

Each `createMockDocumentsService()` call creates a **new object**. Nest injects the mock from `beforeEach` (`useValue: documentsService`). Stubs on a **different** object are never used by `SearchService`.

**Fix:**

```typescript
let documentsService: { findOne: jest.Mock }

beforeEach(() => {
  documentsService = { findOne: jest.fn() }
  // useValue: documentsService  ← same reference every time
})

it('...', async () => {
  documentsService.findOne.mockResolvedValue(fakeDoc)  // ← this instance
})
```

---

## Topic 4 — Jest: `describe`, `it`, and `search.service.spec.ts` structure

**Question 1:** Why at line ~41 do we use `describe` → `it` → `fakeResults` → `elasticsearchService`, and at line ~83 multiple `it` blocks — is Elasticsearch in each one?

**Answer:**

- `**describe('search')`** groups tests for the `**search()**` method. Two `**it**` blocks = two separate checks:
  1. ES `search` was **called** with the right query.
  2. The service **returns** what ES returned.
- `**fakeResults`** is fake data for the mock, not a Jest keyword. You control what `elasticsearchService.search` returns without a real cluster.
- `**describe('summarizeDocument')**` tests a **different** method. Those `it` blocks use `**documentsService`** and `**aiService**`, not Elasticsearch.
- `**fakeDocument**` (line ~84) is shared sample data for all summarize tests — defined once outside `it` to avoid copy-paste.

```text
describe('search')
  it → proves delegation to elasticsearchService.search
  it → proves return value

describe('summarizeDocument')
  fakeDocument (shared)
  it → findOne called
  it → AI called with placeholder + query
  it → returns { summary }
  it → errors propagate, AI not called
```

**Question 2:** What does `**it`** mean?

**Answer:**

- `**it('should ...', async () => { ... })`** = one test case: “**it** should behave like this.”
- Same as `**test(...)`** in Jest.
- Inside each `it`: **Arrange** (mocks) → **Act** (`await service.method()`) → **Assert** (`expect(...)`).
- `**beforeEach`** runs before every `it` so mocks and `service` are fresh (no leaked state).

---

## Topic 5 — `SearchService.summarizeDocument` vs test expectations

**Question:** Should tests pass `document.summary` into `aiService.summarizeDocument`?

**Answer:**

No — not with the current implementation. `search.service.ts` always passes a **placeholder** string to AI:

```text
'Document content would be fetched here'
```

`findOne` runs (document is loaded) but its text is not used yet. Tests must assert:

```typescript
expect(aiService.summarizeDocument).toHaveBeenCalledWith(
  'Document content would be fetched here',
  query,
)
```

When the service is updated to use `extractedText`, update tests to match.

---

## Topic 6 — `ElasticsearchService.search` return shape

**Question:** Why did tests fail when `fakeResults` was `{ hits: [], total: 0 }`?

**Answer:**

In this project, `ElasticsearchService.search()` returns an **array of hit objects**, not `{ hits, total }`. Each hit has `id`, `title`, `filename`, `snippet`, `score`, `metadata`. Mocks should match that array shape. See `backend/src/elasticsearch/elasticsearch.service.ts` (return at end of `search`).

---

## Topic 7 — `documents.service.spec.ts`: overall structure and the mock fix

**Question:** How is `documents.service.spec.ts` organized, and what was broken before it passed?

**Answer:**

This file follows the **same NestJS unit-test pattern** as `search.service.spec.ts`, but with more dependencies (TypeORM repo + S3 + queue + Elasticsearch). Reference: `backend/src/documents/documents.service.spec.ts`.

### Overall structure (top → bottom)

```text
imports
  ↓
describe('DocumentsService')          ← entire test file
  ↓
let service                           ← real service under test (from Nest DI)
let repository, s3Service, ...        ← mock objects we control in each test
  ↓
createMockEntity()                    ← fake DB row (test data)
toExpectedDto()                       ← expected output after toDTO()
createMockMulterFile()                ← fake uploaded file
  ↓
beforeEach                            ← runs before EVERY it()
  build mocks with jest.fn()
  Test.createTestingModule({ useValue: mocks })
  service = module.get(DocumentsService)
  ↓
describe('findAll')                   ← one group per public method
  it('should ...')                    ← one behavior per test
  it('should ...')
describe('findOne')
  ...
describe('uploadDocument')
  ...
describe('delete')
  ...
describe('reindexAllDocuments')
  ...
describe('reindexDocument')
  ...
```

**Rule of thumb:** outer `describe` = file/service; inner `describe` = method; `it` = one specific behavior.

### Layer 1 — `let` variables (lines 11–24)

Declare mocks **outside** `beforeEach` so every `it` can use the same references:

```typescript
let repository: {
  find: jest.Mock
  findOne: jest.Mock   // ← needed: findOne, delete, reindexDocument
  save: jest.Mock
  create: jest.Mock    // ← needed: uploadDocument
  remove: jest.Mock     // ← needed: delete
}
```

Only list methods the **real service actually calls**. Read `documents.service.ts` and grep for `this.documentRepository.` — that tells you what to mock.


| Mock method | Used by service in                     |
| ----------- | -------------------------------------- |
| `find`      | `findAll`, `reindexAllDocuments`       |
| `findOne`   | `findOne`, `delete`, `reindexDocument` |
| `create`    | `uploadDocument`                       |
| `save`      | `uploadDocument`                       |
| `remove`    | `delete`                               |


Same idea for `s3Service` (`uploadFile`, `deleteFile`), `queueService` (`addDocumentProcessingJob`), `elasticsearchService` (`indexDocument`, `deleteDocument`).

### Layer 2 — Helper factories (lines 26–66)

Not Jest magic — just **DRY test data**:


| Helper                             | Purpose                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `createMockEntity(overrides?)`     | One fake `DocumentEntity` row; override fields per test (`{ id: 'doc-2' }`) |
| `toExpectedDto(entity)`            | What `toDTO()` returns — especially `uploadDate` as ISO string, not `Date`  |
| `createMockMulterFile(overrides?)` | Fake `Express.Multer.File` for upload tests                                 |


Compare to search spec: `fakeDocument` is inline shared data; documents uses a factory because entities have more fields.

### Layer 3 — `beforeEach` (lines 68–111)

Two jobs every time:

1. **Create fresh mocks** — `jest.fn()` so call history doesn’t leak between tests.
2. **Inject those exact objects into Nest** — `useValue: repository` must be the **same** object you assign in step 1.

```typescript
beforeEach(async () => {
  repository = { find: jest.fn(), findOne: jest.fn(), ... }
  s3Service = { uploadFile: jest.fn(), deleteFile: jest.fn() }
  // ...
  const module = await Test.createTestingModule({
    providers: [
      DocumentsService,
      { provide: getRepositoryToken(DocumentEntity), useValue: repository },
      { provide: S3Service, useValue: s3Service },
      // ...
    ],
  }).compile()
  service = module.get(DocumentsService)
})
```

**Note:** The current `documents.service.spec.ts` does **not** have a `createMockRepository()` function anymore — we removed it in the fix. That name referred to your **earlier draft** of the file, which looked like this:

```typescript
// ❌ BROKEN (your draft before the fix) — two different objects
const createMockRepository = () => ({ find: jest.fn(), save: jest.fn(), update: jest.fn() })

beforeEach(async () => {
  repository = { find: jest.fn(), findOne: jest.fn(), ... }  // object A

  const module = await Test.createTestingModule({
    providers: [
      { provide: getRepositoryToken(DocumentEntity), useValue: createMockRepository() },  // object B ← different!
    ],
  }).compile()
})

it('...', async () => {
  repository.find.mockResolvedValue(...)  // stubs object A; service uses object B
})
```

**The bug (same idea as Topic 3):** you assigned mocks to `let repository`, but Nest received a **new** object from `createMockRepository()` (or `createMockS3Service()`, etc.). Tests stubbed `repository`, while `DocumentsService` called methods on the anonymous copy Nest injected — stubs never ran, or `findOne` was missing → “not a function”.

**Fix:** one object, one reference: build → assign to `let` → pass **that `let`** to `useValue`. No second factory call in `providers`. The working file inlines mocks directly in `beforeEach` (lines 69–86) and passes `repository`, `s3Service`, etc. (lines 92–105).

### Layer 4 — Inner `describe` + `it` (lines 113+)

Each public method gets its own `describe`. Each `it` follows **Arrange → Act → Assert**:

```typescript
it('should map entities to DTO shape', async () => {
  // Arrange — tell mock what to return
  const entity = createMockEntity()
  repository.find.mockResolvedValue([entity])

  // Act — call real service (mocks stand in for DB/S3/ES)
  const result = await service.findAll()

  // Assert — check return value and/or that mocks were called correctly
  expect(result).toEqual([toExpectedDto(entity)])
})
```

Some tests assert **delegation** (was `find` called with `{ order: { uploadDate: 'DESC' } }`?). Others assert **return shape** or **errors** (`rejects.toThrow(...)`).

### Method groups at a glance

```text
findAll
  → repository.find order + toDTO mapping

findOne
  → repository.findOne + DTO, or throw if null

uploadDocument
  → s3 upload, repository create/save, queue job, return { id, message }
  → Date.now() mocked when S3 key must be predictable

delete
  → s3 delete, ES delete, repository.remove
  → ES failure is swallowed; DB remove still runs

reindexAllDocuments
  → find with status INDEXED + extractedText Not(IsNull())
  → loop indexDocument; count success/failed

reindexDocument
  → validations (exists, INDEXED, has extractedText)
  → indexDocument or throw wrapped error
```

### Side-by-side: search vs documents spec


| Piece              | `search.service.spec.ts`           | `documents.service.spec.ts`    |
| ------------------ | ---------------------------------- | ------------------------------ |
| Service under test | `SearchService`                    | `DocumentsService`             |
| # of mocks         | 3                                  | 4 (+ TypeORM token)            |
| Shared test data   | `fakeDocument` constant            | `createMockEntity()` factory   |
| Grouping           | `describe` per method              | same                           |
| Mock wiring        | `let` + `useValue` in `beforeEach` | same                           |
| Typical assert     | “called ES with query”             | “called repo with order/where” |


### Checklist before writing an `it`

1. Which dependency does this method call? Stub **that** mock.
2. Is the mock on the **same object** Nest injected?
3. Did you **act** (`await service.method()`)?
4. Does mock data use real field names (`filename`, not `fileName`)?
5. For DTO tests: is `uploadDate` compared as `.toISOString()`?

---

## Topic 8 — Fake repository and `TestingModule` in unit tests

**Question 1:** What is the “fake repository” in `documents.service.spec.ts`?

**Answer:**

A **fake repository** is a **stand-in for the real TypeORM / PostgreSQL layer** during unit tests.

In production, `DocumentsService` calls:

```typescript
this.documentRepository.find(...)
this.documentRepository.findOne(...)
```

That would hit a real database. In tests we **don’t** want that, so we replace the repository with a plain object whose methods are `jest.fn()`:

```typescript
repository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
}
```

Nest injects this object instead of a real `Repository<DocumentEntity>`. The service still calls `this.documentRepository.find(...)` — it doesn’t know it’s fake.

In each test you decide what the “database” returns:

```typescript
repository.find.mockResolvedValue([createMockEntity()])
```

No SQL, no Postgres — just “when `find` is called, return this array.”

**One line:** fake repository = a **programmable pretend database** so you test `DocumentsService` logic in isolation. Same idea as faking `S3Service`, `QueueService`, or `ElasticsearchService` in the same file.

---

**Question 2:** What is the `module` at line 88 (`Test.createTestingModule(...).compile()`)?

**Answer:**

It builds a **mini Nest app used only for testing** — same dependency-injection idea as production, but with fakes instead of real DB / S3 / ES.

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    DocumentsService,                                    // real class under test
    { provide: getRepositoryToken(DocumentEntity), useValue: repository },
    { provide: S3Service, useValue: s3Service },
    { provide: QueueService, useValue: queueService },
    { provide: ElasticsearchService, useValue: elasticsearchService },
  ],
}).compile()

service = module.get<DocumentsService>(DocumentsService)
```


| Piece                                         | Meaning                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `Test.createTestingModule(...)`               | Nest test helper; starts a throwaway DI container                          |
| `providers: [...]`                            | What to register (like `documents.module.ts`, but with test doubles)       |
| `{ provide: S3Service, useValue: s3Service }` | “When something needs `S3Service`, inject **our fake**”                    |
| `.compile()`                                  | Wires dependencies and returns a `TestingModule`                           |
| `module.get(DocumentsService)`                | Pulls the wired-up service out so tests can call `service.findAll()`, etc. |


What happens inside:

```text
DocumentsService  (real)
  ← repository              (fake)
  ← s3Service               (fake)
  ← queueService            (fake)
  ← elasticsearchService    (fake)
```

No Postgres, no AWS — just the real service class with fake dependencies plugged in.

**One line:** the module is a **test-only Nest container** that creates a real `DocumentsService` with fake dependencies. Compare to production: `documents.module.ts` registers real implementations; the spec registers mocks via `useValue`.

---

## Topic 9 — Every `describe` in `documents.service.spec.ts`

**Question:** What does each `describe` block test?

**Answer:**

File: `backend/src/documents/documents.service.spec.ts`. Each inner `describe` maps to one **public method** on `DocumentsService`. Each `it` inside checks **one behavior**.

### Outer: `describe('DocumentsService')` (line 10)

Wraps the whole file. Holds shared setup: mock variables, helpers (`createMockEntity`, `toExpectedDto`), and `beforeEach` that builds the test Nest module. Not a test itself — a container for all document-service tests.

---

### `describe('findAll')` (line 113)

Tests listing all documents.


| `it`                                                 | What it checks                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| ordered by `uploadDate` descending                   | `repository.find` called with `{ order: { uploadDate: 'DESC' } }` |
| map entities to DTO (**Data Transfer Object)** shape | Return value matches `toDTO` (e.g. `uploadDate` as ISO string)    |


**Flow reminder:** `mockResolvedValue` = fake DB returns data → `service.findAll()` runs real code → `expect` = pass/fail check. First test asserts **how** repo is queried; second asserts **what** comes back.

---

### `describe('findOne')` (line 135)

Tests fetching a single document by id.


| `it`                              | What it checks                                     |
| --------------------------------- | -------------------------------------------------- |
| return a DTO when document exists | `findOne({ where: { id } })` called; result is DTO |
| throw when not found              | `findOne` returns `null` → error with document id  |


---

### `describe('uploadDocument')` (line 155)

Tests the upload pipeline: S3 → DB record → queue job.


| `it`                                  | What it checks                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| upload to S3 with `documents/` prefix | `s3Service.uploadFile` called with key like `documents/<timestamp>-report.pdf` (`Date.now` mocked) |
| save with `PROCESSING` status         | `repository.create` called with file metadata + `DocumentStatus.PROCESSING`                        |
| enqueue processing job                | `queueService.addDocumentProcessingJob(id, s3Key)` called after save                               |
| return id and message                 | `{ id, message: 'Document uploaded successfully...' }`                                             |


---

### `describe('delete')` (line 239)

Tests removing a document from S3, Elasticsearch, and the database.


| `it`                               | What it checks                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| delete from S3, ES, and DB         | Happy path: `deleteFile`, `deleteDocument`, `remove` all called                   |
| throw when not found               | No deletes run if `findOne` returns `null`                                        |
| still remove from DB when ES fails | ES `deleteDocument` rejects; `repository.remove` still runs (ES errors swallowed) |


---

### `describe('reindexAllDocuments')` (line 283)

Tests bulk re-sync of indexed documents into Elasticsearch.


| `it`                                        | What it checks                                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| only reindex `INDEXED` with `extractedText` | `find` uses `status: INDEXED` + `extractedText: Not(IsNull())`; `indexDocument` called with entity fields |
| return total, success, failed counts        | `{ total, success, failed, message }` when all succeed                                                    |
| continue when individual index fails        | One `indexDocument` fails, next still runs; counts reflect partial success                                |


---

### `describe('reindexDocument')` (line 348)

Tests reindexing **one** document by id (with validation).


| `it`                               | What it checks                                               |
| ---------------------------------- | ------------------------------------------------------------ |
| reindex valid indexed document     | `indexDocument` called; returns `{ success: true, message }` |
| throw when not found               | `findOne` returns `null` → error; ES not called              |
| throw when status not `INDEXED`    | e.g. still `PROCESSING` → error                              |
| throw when `extractedText` missing | No text to index → error                                     |
| throw when ES indexing fails       | ES rejects → wrapped error `Failed to reindex document: ...` |


---

### Quick map

```text
DocumentsService          ← whole file + beforeEach
├── findAll               ← list + sort + DTO
├── findOne               ← get by id / not found
├── uploadDocument        ← S3 + create/save + queue
├── delete                ← S3 + ES + DB / ES failure tolerance
├── reindexAllDocuments   ← bulk ES sync + counts
└── reindexDocument       ← single doc reindex + guards
```

**19 tests total** — 2 + 2 + 4 + 3 + 3 + 5.

---

## Topic 10 — Phase 5.3 E2E tests (`backend/test/e2e/`)

**Question:** What are the E2E files, how do they work, and in what order were they created?

**Answer:**

### What “E2E” means in this project

Here, **E2E = full API workflows** exercised with **supertest** against a real NestJS app — not browser/UI tests (no Playwright). They sit on top of the integration layer from §5.2:

| Layer | Location | Real DB? | Real S3/ES/AI? | What it proves |
| ----- | -------- | -------- | -------------- | -------------- |
| Unit | `backend/src/**/*.spec.ts` | No | No (all mocked) | One service’s logic in isolation |
| Integration | `backend/test/integration/*.integration-spec.ts` | Yes | No (mocked) | One HTTP flow at a time (upload, search, errors…) |
| E2E | `backend/test/e2e/*.e2e-spec.ts` | Yes | No (mocked) | Longer user journeys + edge cases (file types, size limits, concurrency) |

E2E **reuses** the integration harness: `createIntegrationTestApp()` from `test/integration/support/test-app.factory.ts`, plus `resetExternalMocks()` and the same S3 / queue / Elasticsearch / AI mocks. PostgreSQL must be running (same as integration tests).

Run: `cd backend` then `npm run test:e2e` (uses `node node_modules/jest/bin/jest.js` for Windows paths with `&`).

---

### Files and creation order

All three E2E files were added in **one commit** (`completed 5.3, creating e2e test`, 2026-06-19). The **logical build order** inside that work was:

| Step | File | Why this order |
| ---- | ---- | -------------- |
| 1 | `backend/test/jest-e2e.json` | Jest config first — tells Jest to match `test/e2e/.*\.e2e-spec\.ts$`, `rootDir: ..`, 120s timeout |
| 2 | `backend/test/e2e/support/fixtures.ts` | Shared upload helpers before any test that attaches files |
| 3 | `backend/test/e2e/api.e2e-spec.ts` | Main spec file — imports fixtures + integration factory |

`package.json` got `"test:e2e": "node node_modules/jest/bin/jest.js --config ./test/jest-e2e.json"` and CI gained an E2E job in the same phase.

---

### `fixtures.ts` — fake files for uploads

Defines an `UploadFixture` type (`buffer`, `filename`, `contentType`) and a `fixtures` object:

- `txt()` — plain text (default or custom content)
- `pdf()` — minimal valid PDF header (passes upload validators; content is not parsed in E2E)
- `docx()` / `doc()` — placeholder buffers with correct MIME types
- `largeTxt(sizeBytes)` — builds a buffer of exact size (for 10MB limit tests)

`attachFixture(requestBuilder, fixture)` wraps supertest’s `.attach('file', buffer, { filename, contentType })` so every test uses the same field name the API expects.

---

### `api.e2e-spec.ts` — four `describe` blocks (IMPLEMENTATION_PLAN §5.3 order)

Each block follows the same lifecycle copied from integration tests:

1. `beforeAll` — `createIntegrationTestApp()`; if DB is down, set `dbAvailable = false` and skip
2. `afterAll` — `app.close()`
3. `beforeEach` — `resetExternalMocks()` + `documentRepository.clear()`

**Describe blocks were added in this order:**

| Order | `describe` | Tests | What it covers |
| ----- | ---------- | ----- | -------------- |
| 1 | `End-to-end API workflows` | 1 | Full journey: upload → list → search → summarize → detail → delete → 404; stubs ES search + AI summary; manually sets DB row to `INDEXED` (skips waiting for Bull processor) |
| 2 | `End-to-end file type uploads` | 4 (`it.each`) | txt, pdf, docx, doc all return 200; DB row + `s3.uploadFile` called |
| 3 | `End-to-end large file uploads` | 2 | Accept just under 10MB; reject over 10MB with 400 and no S3/DB write |
| 4 | `End-to-end concurrent uploads` | 1 | Five parallel uploads → five unique IDs, five S3/queue calls, list returns 5 |

**Why the first test patches the DB:** the real pipeline is upload → queue → parse → AI → ES index. E2E focuses on **HTTP + persistence**, not waiting on Bull. After upload, the test updates the row to `INDEXED` with `extractedText` / `summary`, then mocks ES and AI for search/summarize steps.

---

### Quick map

```text
backend/test/
├── jest-e2e.json              ← Jest config for E2E
└── e2e/
    ├── api.e2e-spec.ts        ← all E2E scenarios
    └── support/
        └── fixtures.ts        ← upload buffers + attachFixture()

Reused from integration:
└── test/integration/support/
    ├── test-app.factory.ts    ← createIntegrationTestApp()
    ├── integration-test.module.ts
    └── mocks.ts               ← mock S3, queue, ES, AI
```

**7 E2E tests total** — 1 + 4 + 2 + 1 (skipped entirely if PostgreSQL is unavailable).

---

## Topic 11 — Phase 5.2 integration tests (`backend/test/integration/`)

**Question:** What is the purpose of the integration support files and spec files (`test-app.factory.ts`, `integration-test.module.ts`, `upload`, `search`, `errors`)?

**Answer:**

Integration tests (IMPLEMENTATION_PLAN §5.2) exercise **real HTTP** via supertest against a **real PostgreSQL** database, while **mocking** external services (S3, Bull queue, Elasticsearch, AI). They prove one API flow at a time — shorter and more focused than E2E (Topic 10).

Run: `cd backend` then `npm run test:integration` (PostgreSQL required; default DB `document_search_test`).

---

### Support layer (shared foundation)

#### `support/integration-test.module.ts`

A **slim NestJS app** for tests only — not the full `AppModule`. It wires:

- `ConfigModule` with hard-coded test env (`ignoreEnvFile: true`, test bucket, etc.)
- **Real PostgreSQL** via TypeORM (`synchronize: true`, `retryAttempts: 1`)
- `DocumentsController` + `SearchController` and their services
- **Mocked** S3, queue, Elasticsearch, and AI (from `mocks.ts`)

So: real HTTP + real DB, but no AWS, Redis/Bull, ES, or OpenAI.

#### `support/test-app.factory.ts`

**Bootstrap helper** used by every integration and E2E spec. `createIntegrationTestApp()`:

1. Compiles `IntegrationTestModule`
2. Applies the same global setup as production (`ValidationPipe`, `GlobalExceptionFilter`)
3. Returns `{ app, moduleFixture, mocks }` so tests can call `request(app.getHttpServer())` and tweak mock return values

Also exports `IntegrationTestContext` — the type every spec uses for `ctx`, `app`, and `mocks`.

#### `support/mocks.ts` (not listed, but required)

Defines jest mocks for S3, queue, ES, and AI, plus `resetExternalMocks()` and `externalServiceMocks` (provider tokens for the test module).

---

### Spec files (one flow per file)

#### `upload.integration-spec.ts` — upload + document CRUD


| `it` | What it checks |
| ---- | -------------- |
| POST upload | File “saved” to S3 (mock), job queued, DB row `PROCESSING` with correct `s3Key` |
| GET list | Uploaded doc appears in `/api/documents` |
| GET by id | Single document detail returns correct fields |


**3 tests.**

#### `search.integration-spec.ts` — search + summarize

Two `describe` blocks in one file:

**`Search flow (integration)`**


| `it` | What it checks |
| ---- | -------------- |
| GET with `q` | Delegates to mocked ES `search`, returns hits |
| GET without `q` | Empty array; ES not called |


**`Summarization flow (integration)`**

- `beforeEach` seeds an `INDEXED` document in DB directly (skips upload/queue pipeline)
- `POST /api/search/summarize` → mocked AI returns summary; asserts call args

**3 tests** (2 search + 1 summarize).

#### `errors.integration-spec.ts` — failure paths


| `it` | Expected |
| ---- | -------- |
| GET missing doc | 404 + message contains “not found” |
| DELETE missing doc | 404 |
| Upload with no file | 400; S3 and queue not called |
| Upload `.exe` | 400; S3 not called |
| Summarize missing doc | 404; AI not called |


**5 tests.**

---

### How the pieces fit together

```text
integration-test.module.ts   ← what gets loaded (controllers, DB, mock providers)
        ↑
test-app.factory.ts          ← boots app + returns mocks
        ↑
upload / search / errors     ← individual HTTP scenarios (§5.2)
        ↑
e2e/api.e2e-spec.ts          ← longer workflows; reuses same factory (§5.3)
```

**11 integration tests total** — 3 + 3 + 5 (all skipped if PostgreSQL is unavailable).

---

## Topic 12 — `IntegrationTestModule`: `.forRoot` and module structure

**Question:** In `integration-test.module.ts`, what is `.forRoot`? How is this `@Module` structured?

**Answer:**

### What `.forRoot` means in NestJS

Many Nest packages are **dynamic modules** — you don’t just `import ConfigModule`; you call a static method that **returns a configured module**:

```typescript
ConfigModule.forRoot({ ... })   // not: imports: [ConfigModule]
TypeOrmModule.forRoot({ ... })
```

**`.forRoot(...)`** = “register this once at the **application root**” (global setup). Options passed in configure how that library behaves for the whole app.

Contrast with **`.forFeature(...)`** = “register a **slice** of that library for one feature” (e.g. one entity’s repository), usually inside a feature module.

| Method | Scope | Typical use |
| ------ | ----- | ----------- |
| `forRoot` / `forRootAsync` | App-wide, once | DB connection, config loader |
| `forFeature` | Per entity/feature | `@InjectRepository(DocumentEntity)` in a service |

Production `AppModule` uses the same pattern — e.g. `ConfigModule.forRoot({ load: [configuration], validate })` and `DatabaseModule` which wraps `TypeOrmModule.forRootAsync(...)`.

---

### Line-by-line: `imports` array

```11:38:backend/test/integration/support/integration-test.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [
        () => ({
          NODE_ENV: 'test',
          PORT: 4000,
          LOG_LEVEL: 'error',
          AWS_S3_BUCKET: 'test-bucket',
          FRONTEND_URL: 'http://localhost:3000',
        }),
      ],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      // ...
      synchronize: true,
      retryAttempts: 1,
    }),
    TypeOrmModule.forFeature([DocumentEntity]),
  ],
```

#### 1. `ConfigModule.forRoot({ ... })`

| Option | Meaning |
| ------ | ------- |
| `isGlobal: true` | `ConfigService` available everywhere without re-importing `ConfigModule` |
| `ignoreEnvFile: true` | Do **not** read `.env` — tests get predictable config |
| `load: [() => ({ ... })]` | Factory functions that merge key/value pairs into config (like a mini `configuration.ts`) |

Services that call `configService.get('AWS_S3_BUCKET')` get `'test-bucket'`. DB host/user still come from `process.env` in the TypeORM block below (or defaults).

#### 2. `TypeOrmModule.forRoot({ ... })`

Opens the **single PostgreSQL connection** for the test app.

| Field | Test value | Note |
| ----- | ---------- | ---- |
| `database` | `document_search_test` | Separate from prod DB |
| `synchronize: true` | auto-create/update schema from `DocumentEntity` | OK for tests; not for prod |
| `retryAttempts: 1` | fail fast if Postgres is down | specs set `dbAvailable = false` and skip |

This is the **root** DB registration — equivalent to `DatabaseModule`’s `forRootAsync` in production.

#### 3. `TypeOrmModule.forFeature([DocumentEntity])`

Registers the **repository** for `DocumentEntity` so `DocumentsService` can use `@InjectRepository(DocumentEntity)`.

`forRoot` = connection; `forFeature` = repos for specific entities. Both are needed.

---

### `controllers` and `providers`

```40:41:backend/test/integration/support/integration-test.module.ts
  controllers: [DocumentsController, SearchController],
  providers: [DocumentsService, SearchService, ...externalServiceMocks],
```

| Section | Role |
| ------- | ---- |
| `controllers` | HTTP routes under test (`/api/documents`, `/api/search`) |
| `providers` | Injectable classes Nest constructs and injects |

`DocumentsService` depends on `S3Service`, `QueueService`, `ElasticsearchService`, repository, etc. In production those come from `DocumentsModule` → `S3Module`, `QueueModule`, …

In tests, **`externalServiceMocks`** replaces the real modules:

```typescript
{ provide: S3Service, useValue: mockS3Service }
```

Nest DI: “when something asks for `S3Service`, give `mockS3Service`.” Same for queue, ES, AI.

**Not registered:** `UploadModule`, `DocumentProcessor`, Bull, real S3/ES clients — integration tests only need the HTTP surface + DB + mocked I/O.

---

### Structure diagram

```text
IntegrationTestModule (@Module)
│
├── imports
│   ├── ConfigModule.forRoot        ← global config (test values, no .env)
│   ├── TypeOrmModule.forRoot       ← one Postgres connection
│   └── TypeOrmModule.forFeature    ← DocumentEntity repository
│
├── controllers
│   ├── DocumentsController         ← upload, list, get, delete
│   └── SearchController            ← search, summarize
│
└── providers
    ├── DocumentsService            ← real business logic
    ├── SearchService               ← real business logic
    └── externalServiceMocks        ← fake S3, Queue, ES, AI (useValue)
```

**Flow:** supertest hits `DocumentsController` → `DocumentsService` runs real code → talks to **real** `documentRepository` and **mock** `S3Service` / `QueueService`.

---

### vs production `AppModule`

| | Production `AppModule` | `IntegrationTestModule` |
| - | ---------------------- | ----------------------- |
| Config | `.env` + `configuration` + `validate` | Inline `load`, `ignoreEnvFile` |
| Database | `DatabaseModule` (`forRootAsync`) | Inline `TypeOrmModule.forRoot` |
| External services | Real `S3Module`, `QueueModule`, … | `useValue` mocks |
| Modules | Full tree (upload, queue processor, …) | Only controllers + services under test |
| Purpose | Run the app | Fast, isolated HTTP + DB tests |

---

## Topic 13 — `createIntegrationTestApp`: Promise, `Test.createTestingModule`, and `imports`

**Question:** The factory exports an `async` function that returns `Promise<IntegrationTestContext>`. What is that? And why does `Test.createTestingModule` use `imports: [IntegrationTestModule]`?

**Answer:**

### What `Promise` means here

A **Promise** is JavaScript’s way of saying: *“this value isn’t ready yet — wait for async work to finish.”*

```typescript
export async function createIntegrationTestApp(): Promise<IntegrationTestContext>
```

| Piece | Meaning |
| ----- | ------- |
| `async function` | Function can use `await`; **always returns a Promise** (even if you `return { app, ... }`) |
| `Promise<IntegrationTestContext>` | When done, the Promise **resolves to** an object `{ app, moduleFixture, mocks }` |
| `await` inside (lines 26–28, 42) | Pause until Nest finishes compiling / initializing |

**Why async?** Bootstrapping Nest is not instant:

1. `.compile()` — builds the DI container, may connect to Postgres
2. `app.init()` — starts the HTTP layer

Callers do:

```typescript
ctx = await createIntegrationTestApp()  // wait until app is ready
app = ctx.app
```

Without `await`, `ctx` would be a Promise object, not the real context — `request(app.getHttpServer())` would fail.

---

### What `Test.createTestingModule` is

From `@nestjs/testing` — Nest’s **test harness** (not used in production `main.ts`).

```typescript
const moduleFixture = await Test.createTestingModule({
  imports: [IntegrationTestModule],
}).compile()
```

| Step | What happens |
| ---- | ------------ |
| `Test.createTestingModule({ ... })` | Returns a `TestingModuleBuilder` — “describe the test app” |
| `.compile()` | Nest **wires DI**: creates providers, resolves injections, runs module `onModuleInit` (e.g. TypeORM connect) |
| Result: `moduleFixture` | A `TestingModule` — same DI graph as a real app, but built for tests |

In **unit** tests you often add `.overrideProvider(S3Service).useValue(mock)` on the builder before `.compile()`. Integration tests skip overrides because `IntegrationTestModule` already registers mocks in `providers`.

---

### Why `imports: [IntegrationTestModule]`?

`imports` here works **exactly like** `AppModule`’s `imports` array (Topic 12): “load these modules as the root of this Nest application.”

```typescript
// Production (main.ts boots this)
@Module({ imports: [ConfigModule.forRoot(...), DatabaseModule, DocumentsModule, ...] })
export class AppModule {}

// Integration tests (factory boots this instead)
Test.createTestingModule({
  imports: [IntegrationTestModule],  // ← our slim test AppModule
})
```

**We use `IntegrationTestModule` because it already declares everything the test app needs:**

- `ConfigModule.forRoot` + `TypeOrmModule.forRoot` / `forFeature`
- `DocumentsController`, `SearchController`
- `DocumentsService`, `SearchService`, mock S3/queue/ES/AI

The factory’s job is **not** to repeat that list — it only:

1. Compiles the module
2. Creates `INestApplication` (`createNestApplication()`)
3. Adds global pipe + filter (same as production behavior)
4. Calls `app.init()` and returns `{ app, moduleFixture, mocks }`

**Alternative (not used):** put `controllers`, `providers`, and `imports` directly inside `createTestingModule({ ... })`. That would duplicate `integration-test.module.ts` and be harder to maintain.

```text
integration-test.module.ts     ← WHAT the test app is (wiring)
test-app.factory.ts            ← HOW to boot it (HTTP app + globals + return value)
*.integration-spec.ts            ← tests call createIntegrationTestApp()
```

---

### Full factory flow (lines 25–54)

```text
createIntegrationTestApp()
  │
  ├─ Test.createTestingModule({ imports: [IntegrationTestModule] })
  │     └─ .compile()                    → moduleFixture (DI ready)
  │
  ├─ moduleFixture.createNestApplication() → app (HTTP server)
  ├─ app.useGlobalFilters / useGlobalPipes  → match production
  ├─ await app.init()                    → listen-ready
  ├─ resetExternalMocks()                → clean jest state
  └─ return { app, moduleFixture, mocks }
```

---

## Topic 14 — Phase 5.4 performance tests (`backend/test/performance/`)

**Question:** What is Phase 5.4? Summarize `upload.perf-spec.ts` imports, explain `durationMs`, the search timing block, and `timing.ts`.

**Answer:**

Phase 5.4 (IMPLEMENTATION_PLAN) adds **latency checks** on top of the same integration harness (Topics 11–13). Tests measure how long HTTP calls take and fail if they exceed tunable thresholds — not load testing at production scale.

| Plan item | Spec file |
| --------- | --------- |
| Upload performance | `upload.perf-spec.ts` |
| Search performance | `search.perf-spec.ts` |
| Multiple users | `concurrent-users.perf-spec.ts` |

Run: `cd backend` then `npm run test:performance` (PostgreSQL required; config in `test/jest-performance.json`).

---

### 1. `upload.perf-spec.ts` imports (lines 1–13)

| Import | From | Purpose |
| ------ | ---- | ------- |
| `INestApplication` | `@nestjs/common` | Type for `app` — the HTTP server supertest calls |
| `getRepositoryToken` | `@nestjs/typeorm` | Get the TypeORM repo from the test module (`DocumentEntity`) |
| `request` | `supertest` | Send real HTTP requests (`POST /api/documents/upload`, etc.) |
| `Repository` | `typeorm` | Type for `documentRepository` (clear DB between tests) |
| `DocumentEntity` | `src/database/entities/...` | Entity cleared in `beforeEach` |
| `attachFixture`, `fixtures` | `../e2e/support/fixtures` | Reuse E2E upload helpers (`txt`, `largeTxt`) |
| `createIntegrationTestApp`, `IntegrationTestContext` | `../integration/support/test-app.factory` | Boot slim test app + mocks (same as integration/E2E) |
| `resetExternalMocks` | `../integration/support/mocks` | Reset jest mocks before each test |
| `PERF` | `./support/thresholds` | Max allowed milliseconds per scenario |
| `measureMs` | `./support/timing` | Wrap a request and return elapsed time |

**Pattern:** performance specs **reuse** integration + E2E infrastructure; they only add **timing** + **thresholds** on top.

`search.perf-spec.ts` uses the same imports except it skips `attachFixture` / `fixtures` (no file upload in that file).

---

### 2. What is `durationMs`?

`durationMs` is a **number**: how many **milliseconds** one operation took.

```typescript
const durationMs = await measureMs(async () => {
  await attachFixture(...).expect(200)
})

expect(durationMs).toBeLessThan(PERF.uploadP95Ms)
```

Flow:

1. `measureMs` records time **before** and **after** the callback runs.
2. The callback performs one HTTP request (upload or search).
3. `durationMs` = end − start.
4. Test asserts it is **below** the threshold in `PERF` (e.g. `uploadP95Ms: 2000`).

Tests also `console.log` the actual value so you can tune `thresholds.ts` after a local run. The name “p95” in constants is aspirational for single-run tests; `concurrent-users.perf-spec.ts` uses real **p95** via `percentile()` over many parallel requests.

---

### 3. `search.perf-spec.ts` lines 63–68

```typescript
const durationMs = await measureMs(async () => {
  await request(app.getHttpServer())
    .get('/api/search')
    .query({ q: 'machine learning' })
    .expect(200)
})
```

| Part | Meaning |
| ---- | ------- |
| `measureMs(async () => { ... })` | Time only this block |
| `request(app.getHttpServer())` | supertest client bound to the Nest HTTP server |
| `.get('/api/search')` | Hit search endpoint |
| `.query({ q: 'machine learning' })` | `?q=machine+learning` |
| `.expect(200)` | Must succeed (assert status inside the timed window) |
| `await` | Wait for response before `measureMs` stops the clock |

**Setup before this (line 61):** `ctx.mocks.elasticsearch.search.mockResolvedValue(fakeSearchHits(20))` — ES is mocked so the test measures **API + service overhead**, not a real Elasticsearch cluster. Then `expect(durationMs).toBeLessThan(PERF.searchP95Ms)` (500ms default).

---

### 4. `support/timing.ts`

Small utility module for performance specs.

#### `measureMs(fn)`

```typescript
export async function measureMs(fn: () => Promise<void>): Promise<number> {
  const start = Date.now()
  await fn()
  return Date.now() - start
}
```

- Takes an **async function** (the work to time).
- Uses `Date.now()` wall-clock ms (good enough for coarse API latency checks).
- Returns elapsed milliseconds.

Used for single-request tests (upload, search) and per-client timing in concurrent search.

#### `percentile(values, p)`

```typescript
export function percentile(values: number[], p: number): number
```

- Sorts an array of durations.
- Returns the value at percentile `p` (e.g. `95` → p95).
- Used in `concurrent-users.perf-spec.ts`: 10 parallel searches → 10 durations → `percentile(durations, 95)` compared to `PERF.searchP95Ms`.

---

### Quick map (Phase 5.4)

```text
backend/test/performance/
├── support/
│   ├── timing.ts          ← measureMs, percentile
│   └── thresholds.ts      ← PERF.* ms limits
├── upload.perf-spec.ts    ← small + large upload latency
├── search.perf-spec.ts    ← single search latency
└── concurrent-users.perf-spec.ts  ← parallel search p95 + parallel upload wall time

Reused: integration test-app.factory, mocks, e2e fixtures
```

---

### 5. `concurrent-users.perf-spec.ts` — how parallel works

**Question:** How does this file run multiple “users” in parallel?

**Answer:**

Same setup as other perf specs (`beforeAll` → app, `beforeEach` → clear DB + mocks). Two tests simulate **many clients at once** using **`Promise.all`** — the same pattern as E2E concurrent uploads (Topic 10), but with **timing assertions**.

#### What makes it “parallel”

`Promise.all([...])` starts **every promise in the array immediately**. None of them wait for the previous one to finish.

```typescript
await Promise.all([
  requestA(),  // starts now
  requestB(),  // starts now
  requestC(),  // starts now
])
// await resumes only when ALL have completed
```

`Array.from({ length: N }, ...)` builds **N separate requests** (10 searches or 5 uploads). Each element is its own in-flight HTTP call against the same `app`.

```text
Time →
Client 1  ████████████
Client 2  ██████████
Client 3  █████████████
...
Promise.all waits until the longest bar finishes
```

This is **concurrent requests in one Node process** (supertest), not 10 real browsers or 10 machines — but it still stresses the Nest app + DB with overlapping work.

---

#### Test 1 — parallel searches + p95 (lines 59–78)

```typescript
ctx.mocks.elasticsearch.search.mockResolvedValue(fakeSearchHits(20))

const durations = await Promise.all(
  Array.from({ length: PERF.concurrentSearchUsers }, () =>   // 10 users
    measureMs(async () => {
      await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'term' })
        .expect(200)
    }),
  ),
)

const p95 = percentile(durations, 95)
expect(p95).toBeLessThan(PERF.searchP95Ms)
```

| Step | What happens |
| ---- | ------------ |
| `Array.from({ length: 10 }, () => measureMs(...))` | Creates **10** `measureMs` promises — each times **one** search |
| `Promise.all` | Runs all 10 searches **at the same time** |
| `durations` | Array of 10 numbers, e.g. `[45, 52, 48, 120, 51, ...]` — each client’s own latency |
| `percentile(durations, 95)` | Sort durations; pick the **95th percentile** value (slowest-ish outlier bar) |
| `expect(p95).toBeLessThan(500)` | Even under load, p95 search must stay under `PERF.searchP95Ms` |

**Why p95 here but a single `durationMs` in `search.perf-spec.ts`?** One search measures typical latency; ten parallel searches produce a **spread** — p95 catches “most users are fine, but the slow tail must still be acceptable.”

Each `measureMs` has its **own** start/end clock for that client. They overlap in wall time, but you still get per-request durations.

---

#### Test 2 — parallel uploads + wall clock (lines 80–99)

```typescript
const wallStart = Date.now()
await Promise.all(
  Array.from({ length: PERF.concurrentUploadUsers }, (_, index) =>
    attachFixture(
      request(app.getHttpServer()).post('/api/documents/upload'),
      fixtures.txt(`Concurrent perf upload ${index + 1}`),
    ).expect(200),
  ),
)
const wallMs = Date.now() - wallStart

expect(wallMs).toBeLessThan(PERF.concurrentUploadTotalMs)
expect(await documentRepository.count()).toBe(PERF.concurrentUploadUsers)
```

| Step | What happens |
| ---- | ------------ |
| `wallStart` | One clock for the **whole batch** |
| `Promise.all` + 5 uploads | Five uploads fire **together** |
| `wallMs` | Total elapsed until **all five** finish (dominated by the slowest upload) |
| `expect(wallMs).toBeLessThan(5000)` | Entire batch must complete within `PERF.concurrentUploadTotalMs` |
| `documentRepository.count()` | Sanity check: 5 distinct DB rows (no lost uploads) |

**Search vs upload timing difference:**

| Test | Metric | Measures |
| ---- | ------ | -------- |
| Parallel search | `percentile(durations, 95)` | Per-client latency distribution under concurrency |
| Parallel upload | `wallMs` (end − start around `Promise.all`) | Total batch time for all uploads to succeed |

Uploads use **wall clock** because the assertion is “5 parallel uploads all done within 5s,” not “each upload’s individual p95.”

---

#### Thresholds used (`thresholds.ts`)

| Constant | Value | Used for |
| -------- | ----- | -------- |
| `concurrentSearchUsers` | 10 | How many parallel `GET /api/search` |
| `searchP95Ms` | 500 | Max allowed p95 of those 10 durations |
| `concurrentUploadUsers` | 5 | How many parallel uploads |
| `concurrentUploadTotalMs` | 5000 | Max wall time for the whole upload batch |

---

