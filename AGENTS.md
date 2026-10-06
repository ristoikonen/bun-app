# AI Agent Guide (AGENTS.md)

This file provides architectural context, commands, and conventions for AI coding assistants working on this repository.

## Project Overview
* **Runtime & Package Manager:** [Bun](https://bun.sh)
* **Language:** TypeScript (ES Modules)
* **Core Purpose:** High-performance web application/API powered by Bun's native APIs.

---

## Development Commands

Always use `bun` as the package manager and runner instead of npm, yarn, or node.

* **Install Dependencies:** `bun install`
* **Run Development Server:** `bun --hot run server.ts`
* **Run Tests:** `bun test`
* **Run a Single Test File:** `bun test src/path/to/test.test.ts`

---

## Architecture & Conventions

### 1. Runtime & Environment
* Target **Bun's native runtime APIs** wherever possible (e.g., `Bun.serve()`, `Bun.file()`, `Bun.password`, native SQLite support via `bun:sqlite`) rather than pulling in heavy third-party Node.js packages.
* Environment variables are accessed via `Bun.env.VARIABLE_NAME`.

### 2. Routing & HTTP
* Use clean, idiomatic TypeScript handlers.
* Leverage Bun's built-in routing capabilities or lightweight request matching.
* Ensure proper error handling and consistent response formatting (e.g., JSON payloads with appropriate HTTP status codes).

### 3. Code Style & TypeScript
* Use **strict TypeScript**. Avoid `any` types where possible; define explicit interfaces or types for request bodies, responses, and data models.
* Use ES module syntax (`import`/`export`) exclusively.
* Keep functions modular, small, and well-documented with JSDoc comments where logic is complex.

### 4. Testing
* Write unit and integration tests using Bun's built-in test runner (`import { test, expect } from "bun:test"`).
* Place test files alongside source files (e.g., `feature.ts` and `feature.test.ts`) or inside a dedicated `tests/` directory.

### 5. Future Development
* Add basic website user interaction capabilities like email OTN and webhook usage.
* Expand tests to include outside Requests/Responses using Urlquery and Httpbin.