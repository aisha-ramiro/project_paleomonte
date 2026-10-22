import test from 'node:test';
import assert from 'node:assert/strict';
import { capacityState, classifyFailure, buildDiagnosticCards, mergeDiagnosticEvents } from '../src/services/diagnosticModel.js';
import { authorizeEditorial } from '../server/editorialAuth.js';
import { getTranslationDiagnostics } from '../server/translationDiagnostics.js';
import { POST as translate } from '../api/translate.js';
import { diagnosticFetch, readLocalDiagnosticEvents, recordDiagnosticEvent } from '../src/services/diagnosticEvents.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
function env(t, values) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) value == null ? delete process.env[key] : process.env[key] = value;
  t.after(() => { for (const [key, value] of Object.entries(previous)) value == null ? delete process.env[key] : process.env[key] = value; });
}
const authEnv = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'public-test', DEEPL_API_KEY: 'private-test:fx' };
const request = () => new Request('https://example.test/api/diagnostics', { headers: { Authorization: 'Bearer test-session' } });

test('capacity warnings have precise boundaries and missing readings never mean healthy', () => {
  assert.equal(capacityState(79, 100), 'ok');
  assert.equal(capacityState(80, 100), 'warning');
  assert.equal(capacityState(94, 100), 'warning');
  assert.equal(capacityState(95, 100), 'critical');
  assert.equal(capacityState(110, 100), 'critical');
  for (const pair of [[null, 100], [0, null], [NaN, 1], [1, -1], [-1, 100]]) assert.equal(capacityState(...pair), 'unknown');
  assert.equal(capacityState(0, 0), 'critical');
  assert.equal(classifyFailure(429), 'rate_limit');
  assert.equal(classifyFailure(402), 'quota_exceeded');
  assert.equal(classifyFailure(503, 'not_configured'), 'not_configured');
});

test('hosting reads expire, and page views cannot substitute hosting requests', () => {
  const snapshot = { checked_at: '2026-10-22T12:00:00Z', monthly_accesses: 900, settings: { access_monthly_limit: 1000, hosting_request_used: 200, hosting_request_limit: 1000, hosting_measured_at: '2026-10-20T12:00:00Z', hosting_period_start: '2026-10-01', hosting_period_end: '2026-10-31' } };
  const cards = buildDiagnosticCards(snapshot, null, {}, new Date('2026-10-22T12:00:00Z'));
  assert.equal(cards.find((card) => card.id === 'access').state, 'warning');
  assert.equal(cards.find((card) => card.id === 'hosting').state, 'unknown');
  assert.equal(cards.find((card) => card.id === 'hosting').used, 200);
  assert.equal(cards.find((card) => card.id === 'translation').state, 'unknown');
  snapshot.settings.hosting_measured_at = '2026-11-01T00:00:00Z';
  const timezoneCards = buildDiagnosticCards(snapshot, null, {}, new Date('2026-11-01T00:30:00Z'));
  assert.equal(timezoneCards.find((card) => card.id === 'hosting').state, 'ok', 'Still October in São Paulo');
  const nextMonth = buildDiagnosticCards(snapshot, null, {}, new Date('2026-11-01T10:30:00Z'));
  assert.equal(nextMonth.find((card) => card.id === 'hosting').state, 'unknown');
});

test('a newer local occurrence stays unread even when an older shared occurrence was read', () => {
  const shared = [{ source: 'translation', code: 'rate_limit', last_seen: '2026-10-22T10:00:00Z', acknowledged_at: '2026-10-22T11:00:00Z' }];
  const local = [{ source: 'translation', code: 'rate_limit', last_seen: '2026-10-22T12:00:00Z', acknowledged_at: null }];
  const result = mergeDiagnosticEvents(shared, local);
  assert.equal(result.length, 1);
  assert.equal(result[0].origin, 'local');
  assert.equal(result[0].acknowledged_at, null);
});

test('provider access requires a valid session and an editorial role', async (t) => {
  env(t, authEnv);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url) => { calls++; return String(url).includes('/auth/') ? json({ id: 'editor-id' }) : json([{ role: 'viewer' }]); });
  assert.equal((await authorizeEditorial(new Request('https://example.test'))).status, 401);
  assert.equal(calls, 0);
  assert.equal((await authorizeEditorial(request())).status, 403);
});

test('operators can read provider quotas, but auth service failures fail closed', async (t) => {
  env(t, authEnv);
  t.mock.method(globalThis, 'fetch', async (url) => String(url).includes('/auth/') ? json({ id: 'operator-id' }) : json([{ role: 'operator' }]));
  assert.equal((await authorizeEditorial(request())).status, 200);
  globalThis.fetch.mock.mockImplementation(async () => { throw new Error('network'); });
  assert.equal((await authorizeEditorial(request())).status, 503);
});

test('DeepL chooses the quota closest to exhaustion, including key limits and zero limits', async (t) => {
  env(t, authEnv);
  let payload = { character_count: 10, character_limit: 500000, api_key_character_count: 980, api_key_character_limit: 1000 };
  t.mock.method(globalThis, 'fetch', async () => json(payload));
  assert.equal((await getTranslationDiagnostics()).quota.scope, 'key');
  payload = { character_count: 0, character_limit: 0 };
  assert.equal((await getTranslationDiagnostics()).quota.limit, 0);
  payload = { character_count: 100, character_limit: 1e12 };
  assert.equal((await getTranslationDiagnostics()).state, 'unknown');
  assert.equal((await getTranslationDiagnostics()).quota.limit, null);
});

test('DeepL unavailable, exhausted and malformed readings have distinct states', async (t) => {
  env(t, authEnv);
  let status = 456;
  t.mock.method(globalThis, 'fetch', async () => json({}, status));
  assert.equal((await getTranslationDiagnostics()).code, 'quota_exceeded');
  status = 429;
  assert.equal((await getTranslationDiagnostics()).code, 'rate_limit');
  status = 200;
  assert.equal((await getTranslationDiagnostics()).state, 'unknown');
  delete process.env.DEEPL_API_KEY;
  const before = globalThis.fetch.mock.callCount();
  assert.equal((await getTranslationDiagnostics()).code, 'not_configured');
  assert.equal(globalThis.fetch.mock.callCount(), before);
});

test('diagnostics endpoint authenticates before reading cached data and never returns secrets', async (t) => {
  env(t, authEnv);
  let usageCalls = 0;
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (String(url).includes('/auth/')) return json({ id: 'editor-id' });
    if (String(url).includes('/user_roles')) return json([{ role: 'admin' }]);
    usageCalls++; return json({ character_count: 100, character_limit: 500000 });
  });
  const { GET } = await import('../api/diagnostics.js?isolated-test');
  const response = await GET(request());
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.ok(!text.includes('private-test'));
  await GET(request());
  assert.equal(usageCalls, 1, 'Short server cache avoids repeated provider queries');
  assert.equal((await GET(new Request('https://example.test'))).status, 401);
});

test('translation preserves provider rate and quota errors for diagnostic alerts', async (t) => {
  env(t, authEnv);
  let providerStatus = 456;
  t.mock.method(globalThis, 'fetch', async (url) => String(url).includes('/auth/') ? json({ id: 'editor-id' }) : String(url).includes('/user_roles') ? json([{ role: 'operator' }]) : json({}, providerStatus));
  const translateRequest = () => new Request('https://example.test/api/translate', { method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify({ record: { description: 'Texto do museu' }, targetLanguage: 'ES' }) });
  const exhausted = await translate(translateRequest());
  assert.equal(exhausted.status, 402);
  assert.equal((await exhausted.json()).code, 'quota_exceeded');
  providerStatus = 429;
  const limited = await translate(translateRequest());
  assert.equal(limited.status, 429);
});

test('error capture stores safe codes, never payloads, and skips its own reporting failures', async (t) => {
  const previousWindow = globalThis.window;
  const store = new Map();
  const eventTarget = new EventTarget();
  globalThis.window = Object.assign(eventTarget, { location: { origin: 'https://example.test' }, localStorage: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) } });
  t.after(() => { previousWindow === undefined ? delete globalThis.window : globalThis.window = previousWindow; });
  t.mock.method(globalThis, 'fetch', async () => json({ code: 'quota_exceeded', error: 'PRIVATE_CONTENT_TOKEN_USER_EMAIL' }, 402));
  await diagnosticFetch('/api/translate', { method: 'POST' });
  const [event] = readLocalDiagnosticEvents();
  assert.equal(event.source, 'translation');
  assert.equal(event.code, 'quota_exceeded');
  assert.ok(!JSON.stringify([...store.values()]).includes('PRIVATE_CONTENT'));
  await diagnosticFetch('https://example.supabase.co/rest/v1/rpc/record_diagnostic_event');
  assert.equal(readLocalDiagnosticEvents().length, 1, 'Does not recursively report reporting errors');
  globalThis.fetch.mock.mockImplementation(async () => { throw new DOMException('cancelled', 'AbortError'); });
  await assert.rejects(diagnosticFetch('/rest/v1/specimens'));
  assert.equal(readLocalDiagnosticEvents().length, 1, 'Cancellation is not an outage');
  globalThis.fetch.mock.mockImplementation(async () => { throw new TypeError('network contains PRIVATE_CONTENT'); });
  await assert.rejects(diagnosticFetch('/rest/v1/specimens'));
  assert.ok(readLocalDiagnosticEvents().some((item) => item.source === 'database' && item.code === 'network'));
  for (const source of ['database', 'storage', 'translation', 'users', 'access', 'catalog', 'auth', 'interface']) {
    for (const code of ['quota_exceeded', 'rate_limit', 'network', 'unauthorized', 'forbidden', 'not_configured', 'server_error', 'request_failed', 'runtime_error']) recordDiagnosticEvent(source, code);
  }
  assert.equal(readLocalDiagnosticEvents().length, 40, 'Local retention is bounded');
});
