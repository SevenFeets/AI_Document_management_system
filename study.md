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

