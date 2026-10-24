import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const engine = new URL('./backend/run.mjs', import.meta.url).href;
const http = new URL('../shared/http.mjs', import.meta.url).href;

test('load engine uses each caller collection, context and reset when launched outside the project', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shared-e2e-runner-'));
  const requests = [];
  const server = createServer((request, response) => {
    requests.push(request.url);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  // Keep developer deployment/selection variables out of this isolated fixture.
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('E2E_')));
  try {
    for (const name of ['backend', 'template']) {
      const root = path.join(directory, name);
      const resetFile = path.join(root, 'reset.json');
      const cases = path.join(root, 'e2e/functional/backend/owned');
      const scenarios = path.join(root, 'e2e/stress/backend/scenarios');
      await mkdir(cases, { recursive: true });
      await mkdir(scenarios, { recursive: true });
      await writeFile(path.join(cases, 'request.json'), JSON.stringify({ method: 'GET', path: '/{{owner}}', e2eOnly: true }));
      await writeFile(path.join(cases, 'response.json'), '{"status":200}');
      await writeFile(path.join(scenarios, 'owned.json'), JSON.stringify({
        name, mode: 'stress', baseUrl, users: 1, iterations: 2,
        thresholds: { errorRate: 0 }, steps: [{ collectionCase: 'owned' }]
      }));
      const entry = path.join(root, 'entry.mjs');
      await writeFile(entry, `
import { writeFile } from 'node:fs/promises';
import { runBackendStress } from ${JSON.stringify(engine)};
import { createHttpClient } from ${JSON.stringify(http)};
await runBackendStress({
  repoRoot: ${JSON.stringify(root)}, sessionActors: () => [],
  createProjectContext: ({ baseUrl, mode }) => ({ mode, http: createHttpClient({ baseUrl }), vars: { owner: ${JSON.stringify(name)} } }),
  resetE2eDatabase: ctx => writeFile(${JSON.stringify(resetFile)}, JSON.stringify({ mode: ctx.mode, owner: ctx.vars.owner }))
});
`);
      const result = await exec(process.execPath, [entry, '--scenario', 'owned'], { cwd: directory, env });
      assert.match(result.stdout, /requests: 2, passed: 2, failed: 0/);
      assert.deepEqual(JSON.parse(await readFile(resetFile, 'utf8')), { mode: 'stress', owner: name });
    }
    assert.deepEqual(requests, ['/backend', '/backend', '/template', '/template']);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
