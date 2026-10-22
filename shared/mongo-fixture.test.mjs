import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { queryE2eMongo, runE2eMongo } from './mongo-fixture.mjs';

test('KVM fixtures use the supplied application helper and send the script through stdin', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'e2e-mongo-root-'));
  const previous = { PATH: process.env.PATH, E2E_MONGO_TRANSPORT: process.env.E2E_MONGO_TRANSPORT };
  try {
    const bin = path.join(directory, 'bin');
    await mkdir(bin);
    await writeFile(path.join(bin, 'python3'), `#!${process.execPath}\nlet input = '';\nfor await (const chunk of process.stdin) input += chunk;\nconsole.log(JSON.stringify({ args: process.argv.slice(2), input }));\n`, { mode: 0o755 });
    process.env.PATH = `${bin}${path.delimiter}${previous.PATH}`;
    process.env.E2E_MONGO_TRANSPORT = 'kvm';
    for (const application of ['backend with spaces', 'template']) {
      const repoRoot = path.join(directory, application);
      const expression = 'db.session.countDocuments({})';
      const result = await queryE2eMongo({ vars: { e2eDatabase: 'demo_db' } }, expression, { repoRoot });
      assert.deepEqual(result.args, [path.join(repoRoot, 'microservices/tools/e2e-mongo.py'), '--database', 'demo_db']);
      assert.equal(result.input, `print(EJSON.stringify((${expression}), { relaxed: true }));`);
    }
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
});

test('shared SSH fixtures still reject databases other than demo_db before connecting', async () => {
  const previous = process.env.E2E_MONGO_TRANSPORT;
  process.env.E2E_MONGO_TRANSPORT = 'ssh';
  try {
    await assert.rejects(runE2eMongo({ vars: { e2eDatabase: 'production' } }, 'db.dropDatabase()', { repoRoot: '/unused' }), /SSH fixtures permit demo_db only/);
  } finally {
    if (previous === undefined) delete process.env.E2E_MONGO_TRANSPORT;
    else process.env.E2E_MONGO_TRANSPORT = previous;
  }
});
