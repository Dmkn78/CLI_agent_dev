const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const {sourceLaunchPlan} = require('../scripts/launch-desktop.cjs');
const {SourceDesktopService, sourcePython} = require('../desktop/service.cjs');
const ROOT = path.resolve(__dirname, '..');

test('the branded app leaves console Node mode and manages a service only without an explicit URL', () => {
  const plan = sourceLaunchPlan('/source', '/Atelier.app/Contents/MacOS/Electron', ['--atelier-code'], {ELECTRON_RUN_AS_NODE: '1'});
  assert.deepEqual(plan.argv, ['/source', '--atelier-code']);
  assert.equal(plan.options.env.ELECTRON_RUN_AS_NODE, undefined);
  assert.equal(plan.options.env.ATELIER_SOURCE_SERVICE, '1');
  const borrowed = sourceLaunchPlan('/source', '/Atelier', [], {ATELIER_URL: 'http://127.0.0.1:4320/', ELECTRON_RUN_AS_NODE: '1'});
  assert.equal(borrowed.options.env.ATELIER_SOURCE_SERVICE, undefined);
  assert.equal(borrowed.options.env.ATELIER_URL, 'http://127.0.0.1:4320/');
  assert.throws(() => sourceLaunchPlan('/source', '/Atelier', ['--arbitrary']), /invalide/);
});

test('source desktop borrows the matching existing backend and leaves it running on close', async () => {
  const server = http.createServer((request, response) => {
    if (request.url === '/') { response.end('<meta name="atelier-token" content="fixture-local-token">'); return; }
    assert.equal(request.headers['x-atelier-token'], 'fixture-local-token');
    response.setHeader('Content-Type', 'application/json');
    assert.equal(request.url, '/api/desktop/service');
    response.end(JSON.stringify({workspace: ROOT, dataPath: path.join(ROOT, '.atelier')}));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    const service = new SourceDesktopService({rootPath: ROOT, existingURL: url});
    assert.equal((await service.start()).href, url);
    assert.equal(service.child, null);
    await service.stop();
    assert.equal((await fetch(url)).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('a backend with another private data store cannot be reused even for the same workspace', async () => {
  const server = http.createServer((request, response) => response.end(request.url === '/' ?
    '<meta name="atelier-token" content="fixture-local-token">' : JSON.stringify({workspace: ROOT, dataPath: '/another-store'})));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const service = new SourceDesktopService({rootPath: ROOT, existingURL: `http://127.0.0.1:${server.address().port}/`});
    await assert.rejects(service.start(), /Un autre service Atelier/);
    assert.equal(service.child, null);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('the source app owns a provider-free Python service and stops it while retaining its isolated data', async t => {
  try { sourcePython(); } catch (error) { t.skip(error.message); return; }
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'atelier-source-service-'));
  const failures = [];
  const service = new SourceDesktopService({rootPath: ROOT, dataPath: directory, skipDiscovery: true, onFailure: error => failures.push(error)});
  try {
    const origin = await service.start();
    const html = await (await fetch(origin)).text();
    const token = /name="atelier-token" content="([^"]+)"/.exec(html)[1];
    const state = await (await fetch(new URL('/api/state', origin), {headers: {'X-Atelier-Token': token}})).json();
    assert.equal(state.projects[0].path, ROOT);
    assert.deepEqual(state.sessions, []);
    assert.equal(state.providers[0].status, 'unchecked');
    assert(service.child.pid > 0);
    await service.stop();
    await assert.rejects(fetch(origin));
    assert.equal(failures.length, 0);
    assert((await fs.readdir(directory)).length > 0);
  } finally { await service.stop(); await fs.rm(directory, {recursive: true, force: true}); }
});
