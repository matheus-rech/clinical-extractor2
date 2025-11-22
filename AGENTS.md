# AGENTS.md – Coding Agent Guidelines

This file defines high‑level rules for AI coding agents (e.g. GPT‑5‑Codex, GPT‑5.1‑Codex, or other automation tools) when operating on this repository. Agents should read and adhere to these instructions **before** making any changes.

## 🔧 Environment & Tooling

1. **Working Directory:** The agent operates in the root of this repository. All file paths are relative to this directory. Do not create or modify files outside this repository.

2. **Supported Commands:** Use the following commands for common tasks:
   - Install frontend dependencies: `npm install`
   - Run frontend unit tests: `npm test`
   - Run frontend end‑to‑end tests: `npm run test:e2e`
   - Run ESLint and formatting: `npm run lint`
   - Install backend dependencies (Python): `pip install -r backend/requirements.txt` or, if using poetry, `cd backend && poetry install`
   - Run backend tests: `pytest` (from within `backend`)

3. **apply_patch Tool:** All file edits must be performed via the `apply_patch` tool. Do not manually edit files outside of `apply_patch`, as the automation relies on diffs to track changes.

4. **Shell Commands:** When running commands via a shell tool, always set the working directory (`workdir`) correctly and use safe, non‑destructive commands. Do not run long‑running processes (e.g. web servers) unless instructed.

## ✅ Definition of "Production Ready"

The codebase is considered production ready when:

1. **Backend‑first architecture:** All calls to external AI models are proxied through the FastAPI backend. No API keys or secret tokens are present in the compiled frontend.

2. **Security:** No hard‑coded credentials remain; proper authentication and rate limiting are in place. Security headers are configured on deployment.

3. **Functional completeness:** Every existing feature (upload, PDF viewing, extractions, PICO, summary, table extraction, deep analysis, multi‑agent flows, search, exports, etc.) still works after modifications. New features must not break existing ones.

4. **Testing:** All provided test suites pass without modification (unless a test is adjusted to reflect new backend integration). This includes Jest unit tests, Playwright E2E tests, and Pytest suites in `backend`.

5. **Documentation:** The README and related documentation accurately describe how to set up, run, and deploy the application. Any new files created (e.g. migration plans) must be documented.

6. **Performance:** Code changes should avoid regressions in performance. Heavy computations must run on the backend; the frontend should remain responsive during AI calls, using loading indicators.

## 🧪 Testing & Verification

Agents must validate their work through the provided test suites. Use the following workflow:

1. **Run tests frequently:** After each significant change, run `npm test` and `npm run test:e2e` to ensure frontend integrity. For backend changes, run `cd backend && pytest`.

2. **Fix regressions:** If a test fails due to your changes, diagnose the root cause and fix it. Do not silence or remove tests unless you have explicit instructions.

3. **Manual verification:** In addition to automated tests, perform manual exploratory testing (e.g. upload a sample PDF, run PICO, view extracted tables). Ensure the user experience is still smooth.

## 🚫 What Not to Do

1. **Do not leak secrets:** Never commit real API keys, tokens, or credentials. Use environment variables instead and update `.env.example` with placeholders.

2. **Do not remove features:** Unless explicitly asked, do not remove any functionality. All PICO, summary, extraction, annotation, search, and export features must stay intact.

3. **Do not over‑engineer:** Keep changes focused and minimal. Avoid large refactors that are not required by the modernization plan.

4. **Do not commit large binary files** (e.g. PDFs, images) unless necessary. Test fixtures should remain small.

## 📚 Reference Documents

Agents may consult the following files for additional context:

| File | Purpose |
|------|---------|
| `MODERNIZATION_EXECPLAN.md` | Step‑by‑step plan to migrate to a backend‑first architecture and improve UX. |
| `BACKEND_MIGRATION_PLAN.md` | Detailed description of tasks required to proxy AI calls through the backend securely. |
| `PRODUCTION_READINESS_ASSESSMENT.md` | List of gaps and issues to address before public deployment (security, legal, mobile). |
| `BACKEND_API_REFERENCE.md` | Documentation of current backend API endpoints. |
| `TESTING_QUICK_START.md` | Short guide on how to run tests. |

## 🎯 How To Use with Codex Web

When prompting Codex Web or other agents:

1. **Link to this file:** Make sure the agent is aware of these guidelines. For example:
   - "Please follow the guidelines in `AGENTS.md` for environment setup, testing, and production readiness while executing `MODERNIZATION_EXECPLAN.md`."

2. **Be explicit about tasks:** Describe clearly which sections of the modernization plan to execute. Avoid asking the agent to "do everything" in one step; break tasks into stages.

3. **Review intermediate results:** After each major change, inspect the diff and run tests. Provide feedback to the agent before proceeding further.

---

**Last updated:** Nov 20 2025
