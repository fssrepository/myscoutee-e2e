import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('packed release installs independently and exposes every helper and the comparison CLI', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'myscoutee-e2e-package-'));
  try {
    const { stdout } = await exec('npm', ['pack', '--json', '--pack-destination', directory], { cwd: root });
    const [packed] = JSON.parse(stdout);
    assert.equal(packed.name, pkg.name);
    assert.equal(packed.version, pkg.version);
    const names = new Set(packed.files.map(file => file.path));
    assert(names.has('shared/mongo-fixture-ssh.sh'), 'SSH transport must ship with its module');
    for (const target of [...Object.values(pkg.exports), ...Object.values(pkg.bin)]) {
      assert(names.has(target.slice(2)), `Missing published entry: ${target}`);
    }
    assert(![...names].some(name => /(?:^|\/)(?:node_modules|\.github|test)\/|\.test\.mjs$|\.npmrc$/.test(name)));
    await writeFile(path.join(directory, 'package.json'), '{"private":true,"type":"module"}\n');
    await exec('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', path.join(directory, packed.filename)], { cwd: directory });
    const entry = path.join(directory, 'verify.mjs');
    await writeFile(entry, Object.keys(pkg.exports).map(name => `await import(${JSON.stringify(pkg.name + name.slice(1))});`).join('\n'));
    await exec(process.execPath, [entry], { cwd: os.tmpdir() });
    const cli = await exec(path.join(directory, 'node_modules/.bin/myscoutee-e2e-compare'), ['--help'], { cwd: directory });
    assert.match(cli.stdout, /BASELINE_SUMMARY_OR_DIR CANDIDATE_SUMMARY_OR_DIR/);
    const invalidDb = path.join(directory, 'invalid-db.mjs');
    await writeFile(invalidDb, `
import assert from 'node:assert/strict';
import { runE2eMongo } from '${pkg.name}/shared/mongo-fixture.mjs';
process.env.E2E_MONGO_TRANSPORT = 'ssh';
await assert.rejects(runE2eMongo({ vars: { e2eDatabase: 'production' } }, '', { repoRoot: '/unused' }), /SSH fixtures permit demo_db only/);
`);
    await exec(process.execPath, [invalidDb], { cwd: directory });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
