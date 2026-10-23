import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';
import * as editing from '../src/services/specimenEditing.js';
import { mapSpecimen, featuredSpecimens } from '../src/services/publicCatalogModel.js';

function clientMock({ relations = [], failTable, partialApproval = false, user = { id: 'editor' } } = {}) {
  const calls = [];
  const client = {
    calls, auth: { getUser: async () => ({ data: { user }, error: null }) },
    from(table) {
      const call = { table }; calls.push(call);
      const query = {
        update(payload) { call.payload = payload; return query; },
        insert(payload) { call.payload = payload; return query; },
        delete() { return query; },
        select() { return query; },
        eq(key, value) { (call.filters ??= {})[key] = value; return query; },
        in(key, value) { (call.filters ??= {})[key] = value; return query; },
        single() { call.single = true; return query; },
        then(resolve, reject) {
          const error = table === failTable ? new Error('Falha de gravação') : null;
          const data = table === 'specimen_media' ? relations : table === 'media' ? (partialApproval ? [] : (Array.isArray(call.filters?.id) ? call.filters.id : [call.filters?.id]).filter(Boolean).map((id) => ({ id }))) : { id: 'specimen', ...call.payload };
          return Promise.resolve({ data, error }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return client;
}

const pending = { media: { id: 'old-photo', type: 'image', status: 'pending', alt_text: 'Crânio fóssil em vista lateral' } };

test('nullable database fields remain editable and serialize to valid optional values', () => {
  const row = Object.fromEntries(Object.keys(editing.emptySpecimen).map((key) => [key, null]));
  row.scientific_name = '  Morrinhosuchus  '; row.status = 'published'; row.latitude = 0;
  const form = editing.normalizeSpecimen(row);
  assert.equal(form.museum_code, '');
  assert.equal(form.is_featured, false);
  const payload = editing.specimenPayload(form, true);
  assert.equal(payload.scientific_name, 'Morrinhosuchus');
  assert.equal(payload.museum_code, null);
  assert.equal(payload.length_meters, null);
  assert.equal(payload.latitude, 0);
  assert.equal(payload.slug, 'morrinhosuchus');
  assert.equal(editing.specimenPayload(form, false).status, 'draft');
});

test('publishing approves existing pending photos before changing visibility, preserving archived media', async () => {
  const client = clientMock({ relations: [pending, { media: { ...pending.media, id: 'archived', status: 'archived' } }, { media: { ...pending.media, id: 'approved', status: 'approved' } }] });
  await editing.changeSpecimenStatus(client, 'specimen', 'published');
  const writes = client.calls.filter((call) => call.payload);
  assert.deepEqual(writes.map((call) => call.table), ['media', 'specimens']);
  assert.deepEqual(writes[0].filters.id, ['old-photo']);
  assert.equal(writes[0].payload.approved_by, 'editor');
  assert.equal(writes[1].payload.status, 'published');
});

test('missing descriptions, approval failures and expired sessions prevent publication', async () => {
  for (const options of [
    { relations: [{ media: { ...pending.media, alt_text: null } }] },
    { relations: [pending], failTable: 'media' },
    { relations: [pending], partialApproval: true },
    { user: null },
  ]) {
    const client = clientMock(options);
    await assert.rejects(editing.changeSpecimenStatus(client, 'specimen', 'published'));
    assert.equal(client.calls.some((call) => call.table === 'specimens' && call.payload), false);
  }
});

test('unpublishing works without approving images or calling the translation provider', async () => {
  const client = clientMock({ relations: [pending] });
  const result = await editing.changeSpecimenStatus(client, 'specimen', 'draft');
  assert.equal(result.status, 'draft');
  assert.deepEqual(client.calls.map((call) => call.table), ['specimens']);
});

test('public mapping carries the featured choice and only shows approved media', () => {
  const row = { id: 'specimen', scientific_name: 'Morrinhosuchus', is_featured: true, specimen_media: [
    { ...pending, purpose: 'cover' },
    { media: { ...pending.media, id: 'visible', status: 'approved' }, purpose: 'gallery' },
  ] };
  const mapped = mapSpecimen(row, new Map([['visible', 'photo-url']]));
  assert.equal(mapped.isFeatured, true);
  assert.equal(mapped.image, 'photo-url');
  assert.equal(mapped.media.length, 1);
  const specimens = [{ id: 'not-featured', isFeatured: false }, ...Array.from({ length: 6 }, (_, id) => ({ id, isFeatured: true }))];
  assert.deepEqual(featuredSpecimens(specimens).map((item) => item.id), [0, 1, 2, 3]);
  assert.deepEqual(featuredSpecimens([{ isFeatured: false }]), []);
});

// Exercise the actual JSX submit handler with hook state and a fake backend.
const source = (await fs.readFile(new URL('../src/components/AdminPanel.jsx', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '').replace('export function AdminPanel', 'function AdminPanel');
const compiled = await transformWithOxc(source + '\nglobalThis.TestForm = SpecimenForm;', 'AdminPanel.jsx', { jsx: { runtime: 'classic' } });
function mountForm(client, overrides = {}) {
  const states = []; let cursor = 0; const saved = [];
  const context = {
    ...editing, supabase: client, console,
    translateSpecimen: async () => { throw new Error('Tradutor indisponível'); },
    useState(initial) {
      const index = cursor++;
      states[index] = Object.hasOwn(overrides, index) ? overrides[index] : typeof initial === 'function' ? initial() : initial;
      return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    },
    useEffect() {}, React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
  };
  vm.createContext(context); vm.runInContext(compiled.code, context);
  const tree = context.TestForm({ specimen: { id: 'specimen', scientific_name: 'Morrinhosuchus', museum_code: null, common_name: null, summary: null, status: 'draft', specimen_categories: [{ category_id: 'category' }] }, roles: ['operator'], onSaved: (...args) => saved.push(args), onCancel() {} });
  return { tree, states, saved };
}

test('actual edit handler saves nullable records and releases the saving state after success', async () => {
  const client = clientMock();
  const { tree, states, saved } = mountForm(client, { 4: false });
  await tree.props.onSubmit({ preventDefault() {} });
  assert.equal(saved.length, 1);
  assert.equal(client.calls.find((call) => call.table === 'specimens').payload.museum_code, null);
  assert.equal(states[9], false); // saving
  assert.equal(saved[0][1].length, 2); // Both translation failures are visible warnings.
});

test('actual edit handler releases saving and displays failed authentication or database writes', async () => {
  for (const options of [{ failTable: 'specimens' }, { user: null }]) {
    const { tree, states, saved } = mountForm(clientMock(options), { 4: false });
    await tree.props.onSubmit({ preventDefault() {} });
    assert.equal(saved.length, 0);
    assert.equal(states[9], false);
    assert.ok(states[10]); // visible error
  }
});


test('actual publication saves fields first, then approves old photos and publishes despite translation warnings', async () => {
  const client = clientMock({ relations: [pending] });
  const form = editing.normalizeSpecimen({ scientific_name: 'Morrinhosuchus', status: 'published' });
  const image = { id: 'existing', existing: true, mediaId: 'old-photo', altText: pending.media.alt_text, isCover: false };
  const { tree, states, saved } = mountForm(client, { 0: form, 3: [image], 4: false });
  await tree.props.onSubmit({ preventDefault() {} });
  const writes = client.calls.filter((call) => call.payload);
  assert.equal(writes[0].payload.status, 'draft');
  assert.equal(writes.at(-1).payload.status, 'published');
  assert.equal(writes.at(-2).payload.status, 'approved');
  assert.equal(saved[0][0].status, 'published');
  assert.equal(saved[0][1].length, 2);
  assert.equal(states[9], false);
});

test('failed image edits keep a draft unpublished, and loading images blocks all saves', async () => {
  const client = clientMock({ relations: [pending], failTable: 'media' });
  const form = editing.normalizeSpecimen({ scientific_name: 'Morrinhosuchus', status: 'published' });
  const image = { id: 'existing', existing: true, mediaId: 'old-photo', altText: pending.media.alt_text, isCover: false };
  const { tree, saved } = mountForm(client, { 0: form, 3: [image], 4: false });
  await tree.props.onSubmit({ preventDefault() {} });
  assert.equal(client.calls.some((call) => call.payload?.status === 'published'), false);
  assert.match(saved[0][1].join(' '), /publicação e aprovação/);
  const loadingClient = clientMock();
  const loadingForm = mountForm(loadingClient);
  await loadingForm.tree.props.onSubmit({ preventDefault() {} });
  assert.equal(loadingClient.calls.length, 0);
});
