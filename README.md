# MyScoutee E2E

Canonical shared E2E helpers and stress engines for `myscoutee-backend` and
`myscoutee-template`. Both applications use the `e2e` submodule at `e2e/common`, on branch `master`.
The gitlink records the shared revision.
Requires Node.js 22 or newer; no npm dependencies.

Tests import shared modules directly from `e2e/common`. The remaining application
entry points pass their
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
git -C e2e/common switch master
git -C e2e/common merge --ff-only "$(git rev-parse :e2e/common)"
```

Shared regression checks (no application stack or real browser required):

```sh
node --test shared/*.test.mjs functional/ui/lib/*.test.mjs stress/*.test.mjs
```

Commit shared changes here first, publish that revision, then update the
`e2e/common` gitlink in each application. Application-local launchers only supply project composition. The extracted
helper and test files are removed from the applications.
