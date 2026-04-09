# bdoc

`bdoc` is a browser-based OpenAPI explorer and request runner. It loads a remote OpenAPI 3.x JSON document, builds a browsable endpoint tree, lets you edit params and request bodies inline, and sends requests directly from the UI.

## What It Does

- Loads remote OpenAPI 3.x JSON specs
- Groups and searches operations by tag, method, path, and summary
- Builds request forms for path, query, header, and body inputs
- Supports bearer auth when the spec defines it
- Sends live requests and shows response body, headers, and timing
- Persists auth, selected specs, workspaces, and request drafts in local storage
- Merges saved JSON request bodies with updated spec examples so newly added fields appear without wiping existing values

## Stack

- React 19
- TypeScript
- Vite
- TanStack Router
- Zustand
- Tailwind CSS 4

## Requirements

- Node.js 20+ recommended
- pnpm

## Getting Started

```bash
pnpm install
pnpm dev
```

Open the local Vite URL printed in the terminal, then paste an OpenAPI JSON URL into the app and load it.

## Available Scripts

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
```

## How It Works

### Loading a Spec

Enter a public OpenAPI JSON URL in the sidebar and load it. The app currently supports OpenAPI 3.x JSON documents.

### Editing Requests

For each operation, `bdoc` generates editable sections for:

- Path parameters
- Query parameters
- Header parameters
- Request body content types
- Bearer token auth

### Sending Requests

Requests are executed from the browser UI. The response panel shows:

- Parsed or raw response body
- Response headers
- Request snapshot
- Expected response examples from the spec
- Duration and status

## Persistence Behavior

The app stores console state in `localStorage` under the `bdoc-console` key.

Persisted state includes:

- Auth token
- Recent specs
- Saved workspaces
- Selected operation
- Draft params and request bodies per operation

For JSON request bodies, saved drafts are merged with the latest generated example when the spec changes. That means:

- Existing user-entered values are preserved
- New fields introduced by the API spec are added into the saved body
- Non-JSON bodies are left untouched

## Dev Proxy

In development, Vite mounts a local proxy at `/__bdoc_proxy` so the app can fetch remote specs and send cross-origin API requests without browser CORS failures during local work.

This proxy is a development convenience, not a production backend.

## Project Structure

```text
src/
  components/api-console/   Main console UI
  lib/openapi.ts            OpenAPI parsing and draft seeding
  stores/api-console-store.ts  Persisted console state
  routes/                   TanStack Router routes
```

## Notes

- The app expects JSON specs, not YAML.
- If a remote API blocks requests or requires private network access, the browser app will still be limited by your environment.
- Production deployment may need a server-side proxy depending on the APIs you want to call.
