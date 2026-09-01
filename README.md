# My Bun & TypeScript App

A web application built using [Bun](https://bun.sh) and TypeScript.
Analyses images with Gemini.
Upload handler:
 - Validates image and metadata
 - Generates filename
 - Saves original image into UPLOAD_DIR 
 - Generates jpeg thumbnail into THUMB_DIR
 - Generates Base64 string from image
 - Generate Base64 -placeholder for a blur-up
 

## 🤔 What is Bun?

[Bun](https://bun.sh) is an all-in-one JavaScript and TypeScript runtime, package manager, bundler, and test runner 
owned and backed by Anthropic. It is designed from the ground up for speed, executing code significantly faster than Node.js.   

* Bun runs .ts, .tsx, and .jsx files  with no configuration or compilers.  
* It natively supports global fetch, WebSockets, ReadableStream and node_modules and built-in Node packages.  
* Includes an embedded, fast SQLite database driver, native bindings for working with SQL databases and S3-compatible storage services.
* Native Redis client with a Promise-based API.


### 🔄 What Bun Replaces

Instead of chaining together multiple slow tools, Bun natively replaces your entire development ecosystem:

* **Node.js** – The core JavaScript/TypeScript runtime engine.
* **npm / yarn / pnpm** – The package manager for installing modules.
* **ts-node / tsx** – The direct executor for running TypeScript files instantly.
* **Webpack / Vite / esbuild** – The bundler for packaging your production code.
* **Jest / Vitest** – The framework for running unit tests.

## 🚀 Prerequisites

Ensure you have Bun installed on your local machine. If you don't have it yet, run:

```bash
# macOS and Linux
curl -fsSL https://bun.shinstall | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

## 🛠️ Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd <project-folder-name>
```

### 2. Install Dependencies

Bun installs packages up to 25x faster than npm:

```bash
bun install
```

### 3. Add Bun types 

Run command to enable auto-complete, IntelliSense, and type safety (like Bun.env.GOOGLE_API_KEY)

```bash
bun add -d @types/bun
```


### 3. Set Up Environment Variables

Create .env file, use the the example below to get required keys of the environment file.
Edit .env and source code to suit your environment.
Sample code runs in AWS and accesses Google API for AI services.

```txt
GOOGLE_API_KEY=AQ.fatduckfoundhistuck
AWS_ACCESS_KEY_ID=MONGTHECLOUDSLIKEELO
AWS_SECRET_ACCESS_KEY=MUMBOJUMBOTRULY
AWS_REGION=ap-southeast-2
AWS_BUCKET=aws-fun-bucket-123-ap-southeast-2-an
```
Populate it with your local secrets, this file is excluded from Git for security:

```bash
cp .env.example .env
```

## 🏃 Available Scripts

You can run the following commands in the project directory:

### Development Mode
Runs the application with Bun's built-in hot reloader. The app will automatically restart when you make changes to the code:
```bash
bun run dev
```

### Production Build
Compiles the TypeScript code and prepares the application for production deployment:
```bash
bun run build
```

### Run Production Server
Starts the compiled application in production mode:
```bash
bun run start
```

### Run Tests
Executes the test suite using Bun's built-in, ultra-fast test runner:
```bash
bun test
```

## 🧰 Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Language:** [TypeScript](https://typescriptlang.org)
