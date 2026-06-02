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

| Order | File | What to test |
|-------|------|----------------|
| 1 | `documents.service.spec.ts` | Repository, S3, queue, Elasticsearch orchestration |
| 2 | `search.service.spec.ts` | Thin wrapper: ES search + summarize flow |
| 3 | `ai.service.spec.ts` | Mock mode, chains, truncation (done) |
| 4 | `document.processor.spec.ts` | Bull job, progress, status `INDEXED` / `ERROR` |

- Tests live next to source: `backend/src/**/*.spec.ts`
- Run: `cd backend` then `node node_modules/jest/bin/jest.js <name>.spec --forceExit` (Windows path with `&` can break `npm test`)
- **Unit tests** = mock all I/O (no real DB, ES, S3, API keys)
- Reference implementation: `backend/src/ai/ai.service.spec.ts`

---

## Topic 2 — Learning rule levels (`.cursor/rules/learning.mdc`)

**Question:** What do the help levels mean when asking the agent for guidance?

**Answer:**

| Phrase | What you get |
|--------|----------------|
| **"I need help" / "I need guidance"** | Pseudocode for tests; empty method skeletons for production code — no empty `it('...', () => {})` files |
| **"I need detailed guidance"** | Small snippets (5–10 lines), one pattern at a time |
| General question (no phrase) | Architecture and steps in prose, minimal code |
| **"stuck"** | Full working implementation (e.g. complete `*.spec.ts`) |

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

- **`describe('search')`** groups tests for the **`search()`** method. Two **`it`** blocks = two separate checks:
  1. ES `search` was **called** with the right query.
  2. The service **returns** what ES returned.
- **`fakeResults`** is fake data for the mock, not a Jest keyword. You control what `elasticsearchService.search` returns without a real cluster.
- **`describe('summarizeDocument')`** tests a **different** method. Those `it` blocks use **`documentsService`** and **`aiService`**, not Elasticsearch.
- **`fakeDocument`** (line ~84) is shared sample data for all summarize tests — defined once outside `it` to avoid copy-paste.

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

**Question 2:** What does **`it`** mean?

**Answer:**

- **`it('should ...', async () => { ... })`** = one test case: “**it** should behave like this.”
- Same as **`test(...)`** in Jest.
- Inside each `it`: **Arrange** (mocks) → **Act** (`await service.method()`) → **Assert** (`expect(...)`).
- **`beforeEach`** runs before every `it` so mocks and `service` are fresh (no leaked state).

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

<!-- Add new topics below this line -->
