# MyScoutee E2E

Canonical shared E2E helpers and stress engines for `myscoutee-backend` and
`myscoutee-template`, released as `@fssrepository/myscoutee-e2e` on GitHub Packages.
Requires Node.js 22 or newer; no runtime npm dependencies.

## Application installation

Each application owns `e2e/package.json`, its lockfile and an `.npmrc` containing:

```ini
@fssrepository:registry=https://npm.pkg.github.com
```

Authenticate to GitHub Packages using your user npm configuration, then install
the application's exact released version from its repository root:

```sh
npm ci --prefix e2e
```

GitHub Packages requires authentication for package installation. Keep tokens in
the user npm configuration or CI secrets; never commit them to an application.

```js
import { assert } from '@fssrepository/myscoutee-e2e/shared/assertions.mjs';
import { runBackendStress } from '@fssrepository/myscoutee-e2e/stress/backend/run.mjs';
```

Application entry points supply their repository root, context/session actors
and reset policy. Cases, scenarios, fixtures, QA matrices, deployment
configuration and artifacts belong to the application. The working directory
does not select another application's fixtures.

- `shared/`: assertions, collection runner, HTTP, WebSocket, native DEMO sessions
  and Mongo fixture transports. Mongo callers supply `{ repoRoot }` as the third
  argument; SSH and KVM continue using that application's guarded transports.
- `functional/ui/lib/`: Chrome/CDP and common UI contracts.
- `stress/backend/`: backend load, ramp and comparison engines.
- `stress/ui/`: UI load engine; reset behavior comes from the application.

Compare application-owned stress artifacts from the application repository root:

```sh
npm exec --prefix e2e -- myscoutee-e2e-compare baseline/summary.json candidate/summary.json
```

## Development and releases

Edit shared implementations only in this repository. Applications consume a
published package; they do not contain shared source copies or an E2E submodule.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:package
```

The package test packs and installs the artifact into an independent temporary
project, imports every exported helper, executes the comparison CLI and checks
the bundled SSH transport. These checks need no application stack or real browser.

For a release, update `package.json`, `package-lock.json` and `CHANGELOG.md`, commit
the tested source, then create and push an annotated `vX.Y.Z` tag matching the
package version. The tag-triggered release workflow checks that identity, runs
the tests on Node.js 22, publishes the tested tarball to GitHub Packages, verifies
registry integrity and creates a GitHub Release with the tarball and SHA-256 sum.
The workflow uses its repository `GITHUB_TOKEN` with `packages: write`.

Update consumers explicitly after publication:

```sh
npm install --prefix e2e --save-dev --save-exact @fssrepository/myscoutee-e2e@X.Y.Z
```

Commit each application's manifest and lockfile together. Release tags and
published versions are never moved or overwritten; further changes get a new
version.
