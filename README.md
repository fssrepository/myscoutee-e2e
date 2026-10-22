# MyScoutee E2E

Canonical shared E2E helpers and stress engines for `myscoutee-backend` and
`myscoutee-template`. Both applications pin this repository as `e2e/common`.
Requires Node.js 22 or newer; no npm dependencies.

Application entry points remain under each application's `e2e/`. They pass their
repository root, context/session actors and reset policy to these engines.
Cases, scenarios, fixtures, QA matrices, deployment configuration and artifacts
belong to the application. Run the existing commands from that application's
README; the working directory does not select another application's fixtures.

- `shared/`: assertions, collection runner, HTTP, WebSocket, native DEMO sessions
  and Mongo fixture transports. Mongo callers supply `{ repoRoot }` as the third
  argument; SSH and KVM continue using that application's guarded transports.
- `functional/ui/lib/`: Chrome/CDP and common UI contracts.
- `stress/backend/`: backend load, ramp and comparison engines.
- `stress/ui/`: UI load engine; reset behavior comes from the application.

After cloning either application:

```sh
git submodule update --init --recursive
```

Shared regression checks (no application stack or real browser required):

```sh
node --test shared/*.test.mjs functional/ui/lib/*.test.mjs
```

Commit shared changes here first, publish that revision, then update the
`e2e/common` gitlink in each application. Application-local modules are only
composition/re-export entry points, not copied implementations.
