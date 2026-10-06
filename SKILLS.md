---
name: bun-app-skillset
description: Comprehensive skills and automation playbook for building, auditing, and deploying high-performance applications in the bun-app workspace. Use when developing, reviewing, or extending Bun runtime solutions.
---

# Bun-App Workspace Skillset

This document outlines the specialized core skills, operational workflows, and technical guidelines configured for the **bun-app** project workspace (`https://www.dropbox.com/home/bun-app`).

---

## 1. Core Technical Competencies

### A. Bun Runtime Mastery
* **Native Server Management:** Leverage `Bun.serve()` for high-throughput routing, request parsing, and native WebSocket/HTTP streaming.
* **File System & Bundling:** Utilize fast native APIs (`Bun.file`, `Bun.write`) and Bun's built-in bundler/transpiler for optimized builds.
* **Environment Configuration:** Manage secure runtime parameters using `Bun.env` with strict runtime type-checking.

### B. Enterprise Telemetry & Compliance
* **M-21-31 & ASD ISM Standards:** Ensure structured JSON logging, execution duration tracking, and unique correlation ID propagation (`crypto.randomUUID()`) across all inbound requests.
* **Cryptographic Privacy:** Enforce salted SHA-256 IP hashing (`OPENSSL_HEX_SECRET_PEPPER`) to guarantee zero plaintext IP storage.

### C. Data Persistence & Validation
* **Edge & Serverless Databases:** Integrate lightweight relational stores (Turso/LibSQL) or distributed databases with connection pooling.
* **Payload Validation:** Validate incoming request bodies and schemas using **Zod** to prevent malformed injections.

---

## 2. Standardized Development Workflows

### Phase 1: Environment Setup
1. Initialize dependencies using Bun:
   ```bash
   bun install