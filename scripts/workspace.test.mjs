import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createWorkspaceService } from '../api/_workspace/core.js';
import { bodyOf, configured, readiness } from '../api/_workspace/http.js';

const admin = { email: 'team@example.test', userId: 'admin-user', isAdmin: true };
const builder = { email: 'builder@example.test', userId: 'builder-user', isAdmin: false };
const guide = { email: 'guide@example.test', userId: 'guide-user', isAdmin: false };
const outsider = { email: 'other@example.test', userId: 'outsider-user', isAdmin: false };
const secret = 'workspace-tests-only-not-a-deployed-secret';
const copy = value => structuredClone(value);
const status = expected => error => error.status === expected;
function harness() {
  const db = new Map();
  const store = {
    get: async id => copy(db.get(id) || null),
    bySlug: async slug => copy([...db.values()].find(item => item.slug === slug) || null),
    byReceipt: async receipt => copy([...db.values()].find(item => [...item.offers, ...item.passes].some(record => record.receiptHash === receipt)) || null),
    list: async actor => copy([...db.values()].filter(item => actor.isAdmin || item.members.some(member => member.email === actor.email))),
    publicList: async () => copy([...db.values()].filter(item => item.status === 'published')),
    insert: async wave => { if ([...db.values()].some(item => item.slug === wave.slug)) throw Object.assign(new Error('duplicate'), { status: 409 }); db.set(wave.id, copy(wave)); },
    save: async (wave, version) => { if (db.get(wave.id)?.version !== version) return false; db.set(wave.id, copy(wave)); return true; },
  };
  return { service: createWorkspaceService({ store, secret, now: () => '2026-09-24T12:00:00.000Z' }), db, store };
}
async function fixture(service, slug = 'pilot-wave') {
  const { wave } = await service.mutate('create', { title: 'Pilot Wave', slug, builderEmail: builder.email, guideEmail: guide.email, template: 'maker' }, admin);
  return wave;
}
const engagement = { scope: 'Build a community tool.', fee: 'USD 500 for the build', paymentSchedule: 'Half at agreement and half on acceptance.', deliveryWindow: 'Three weeks', revisions: 'Two review rounds.', ownership: 'The builder owns the original deliverables.', support: 'A handover session.' };
async function prepared(service) {
  let wave = await fixture(service);
  wave = (await service.mutate('update', { id: wave.id, version: wave.version, engagement,
    brief: { mission: 'Private discovery', audience: 'Private clients', needs: 'Private financial context' },
    draft: { title: 'A Community Tool', story: 'Build together.', guideName: 'First Guide', guideBio: 'A human Guide.', buildNotes: 'private code decisions', deliverableUrl: 'https://example.test/private-deliverable' },
    currentMove: { title: 'Review the first design', owner: 'The builder', needs: 'One design reviewer', completion: 'A completed review', status: 'open', outcome: '', evidence: '' },
  }, guide)).wave;
  wave = (await service.mutate('approveEngagement', { id: wave.id, version: wave.version, as: 'builder' }, builder)).wave;
  wave = (await service.mutate('approveEngagement', { id: wave.id, version: wave.version, as: 'guide' }, guide)).wave;
  return wave;
}
async function published(service) {
  let wave = await prepared(service);
  wave = (await service.mutate('publish', { id: wave.id, version: wave.version }, builder)).wave;
  return (await service.mutate('review', { id: wave.id, version: wave.version, decision: 'approve' }, admin)).wave;
}

test('invited membership isolates each Wave; admin cannot approve on behalf of a builder', async () => {
  const { service } = harness(), wave = await fixture(service);
  await assert.rejects(service.detail(wave.id, outsider), status(403));
  await assert.rejects(service.mutate('update', { id: wave.id, version: 1, brief: {} }, outsider), status(403));
  assert.equal((await service.list(outsider)).waves.length, 0);
  assert.equal((await service.list(builder)).waves.length, 1);
  await assert.rejects(service.mutate('create', { title: 'Another' }, builder), status(403));
  await assert.rejects(service.mutate('approveEngagement', { id: wave.id, version: 1, as: 'builder' }, admin), status(403));
});

test('paid engagement, builder approval and initial team review are enforced', async () => {
  const { service } = harness();
  let wave = await fixture(service);
  await assert.rejects(service.mutate('publish', { id: wave.id, version: wave.version }, builder), status(400));
  wave = (await service.mutate('update', { id: wave.id, version: wave.version, engagement: { ...engagement, fee: '$0' } }, guide)).wave;
  await assert.rejects(service.mutate('approveEngagement', { id: wave.id, version: wave.version, as: 'guide' }, guide), status(400));
  const other = harness().service;
  wave = await prepared(other);
  await assert.rejects(other.mutate('publish', { id: wave.id, version: wave.version }, guide), status(403));
  wave = (await other.mutate('publish', { id: wave.id, version: wave.version }, builder)).wave;
  assert.equal(wave.status, 'review');
  await assert.rejects(other.published(wave.slug), status(404));
  await assert.rejects(other.mutate('review', { id: wave.id, version: wave.version, decision: 'approve' }, builder), status(403));
  wave = (await other.mutate('review', { id: wave.id, version: wave.version, decision: 'approve' }, admin)).wave;
  assert.equal((await other.published(wave.slug)).wave.story, 'Build together.');
});

test('changed terms invalidate both approvals; support cannot publish or change terms', async () => {
  const { service } = harness();
  let wave = await prepared(service);
  wave = (await service.mutate('member', { id: wave.id, version: wave.version, email: outsider.email, role: 'support' }, admin)).wave;
  await assert.rejects(service.mutate('update', { id: wave.id, version: wave.version, engagement }, outsider), status(403));
  await assert.rejects(service.mutate('publish', { id: wave.id, version: wave.version }, outsider), status(403));
  wave = (await service.mutate('update', { id: wave.id, version: wave.version, engagement: { ...engagement, fee: 'USD 600' } }, guide)).wave;
  assert.equal(wave.engagement.builderApprovedAt, null);
  assert.equal(wave.engagement.guideApprovedAt, null);
});

test('concurrent saves reject one writer; removal immediately denies further access', async () => {
  const { service, db } = harness();
  let wave = await fixture(service);
  const results = await Promise.allSettled([
    service.mutate('update', { id: wave.id, version: wave.version, brief: { mission: 'One' } }, builder),
    service.mutate('update', { id: wave.id, version: wave.version, brief: { mission: 'Two' } }, guide),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.status, 409);
  wave = db.get(wave.id);
  wave = (await service.mutate('member', { id: wave.id, version: wave.version, email: outsider.email, role: 'support' }, admin)).wave;
  assert.ok((await service.detail(wave.id, outsider)).roles.includes('support'));
  wave = (await service.mutate('member', { id: wave.id, version: wave.version, email: outsider.email, role: 'support', remove: true }, admin)).wave;
  await assert.rejects(service.detail(wave.id, outsider), status(403));
});

test('public projection excludes private brief, fee, contact data, notes and unpublished changes', async () => {
  const { service } = harness();
  let wave = await published(service);
  const visible = JSON.stringify((await service.published(wave.slug)).wave);
  for (const term of ['Private discovery', 'Private clients', 'private code decisions', 'private-deliverable', builder.email, engagement.fee, 'receiptHash', 'members', 'engagement']) assert.ok(!visible.includes(term), term);
  wave = (await service.mutate('update', { id: wave.id, version: wave.version, draft: { ...wave.draft, story: 'A private revision' } }, guide)).wave;
  assert.equal((await service.published(wave.slug)).wave.story, 'Build together.');
  wave = (await service.mutate('publish', { id: wave.id, version: wave.version }, builder)).wave;
  assert.equal((await service.published(wave.slug)).wave.story, 'A private revision');
  await service.mutate('pause', { id: wave.id, version: wave.version }, builder);
  await assert.rejects(service.published(wave.slug), status(404));
});

test('offer retries return one receipt, receipt is stored hashed, and withdrawal removes recognition', async () => {
  const { service, db } = harness();
  let wave = await published(service);
  const request = { slug: wave.slug, requestId: randomUUID(), name: 'Contributor', email: 'contributor@example.test', message: 'I can review the design.', recognitionConsent: true };
  const first = await service.publicAction('offer', request);
  const second = await service.publicAction('offer', request);
  assert.equal(first.receipt, second.receipt);
  assert.equal(db.get(wave.id).offers.length, 1);
  assert.ok(!JSON.stringify(db.get(wave.id)).includes(first.receipt));
  assert.ok(!JSON.stringify(await service.detail(wave.id, guide)).includes('receiptHash'));
  await assert.rejects(service.publicAction('receipt', { receipt: first.receipt + 'tampered' }), status(404));
  for (const stage of ['acknowledged', 'agreed', 'completed']) {
    wave = (await service.detail(wave.id, guide)).wave;
    wave = (await service.mutate('offer', { id: wave.id, version: wave.version, offerId: first.record.id, status: stage, response: 'Review the first design.', outcome: 'Review delivered.', evidence: 'https://example.test/review' }, guide)).wave;
  }
  assert.equal((await service.published(wave.slug)).wave.contributions.length, 0);
  wave = (await service.mutate('publish', { id: wave.id, version: wave.version }, builder)).wave;
  assert.equal((await service.published(wave.slug)).wave.contributions[0].name, 'Contributor');
  const receipt = await service.publicAction('receipt', { receipt: first.receipt });
  assert.equal(receipt.record.outcome, 'Review delivered.');
  await service.publicAction('withdraw', { receipt: first.receipt });
  assert.equal((await service.published(wave.slug)).wave.contributions.length, 0);
});

test('carrying invitation requires acceptance and consent; it never gives workspace access', async () => {
  const { service } = harness();
  let wave = await published(service);
  const invitation = await service.mutate('pass', { id: wave.id, version: wave.version, name: 'A creator', purpose: 'Feature the project', expires: '2026-09-28T12:00:00.000Z' }, guide);
  assert.ok(invitation.receipt.startsWith('wp_'));
  await service.publicAction('passReply', { receipt: invitation.receipt, decision: 'accept', recognitionConsent: true });
  await assert.rejects(service.detail(wave.id, outsider), status(403));
  wave = (await service.detail(wave.id, builder)).wave;
  wave = (await service.mutate('publish', { id: wave.id, version: wave.version }, builder)).wave;
  assert.equal((await service.published(wave.slug)).wave.carrying.length, 1);
  await service.mutate('passUpdate', { id: wave.id, version: wave.version, passId: wave.passes[0].id, status: 'revoked' }, guide);
  assert.equal((await service.published(wave.slug)).wave.carrying.length, 0);
  await assert.rejects(service.publicAction('passReply', { receipt: invitation.receipt, decision: 'accept' }), status(400));
});

test('completion records a Journey and reopening creates the next move without losing it', async () => {
  const { service } = harness();
  let wave = await published(service);
  const firstMove = wave.currentMove.id;
  wave = (await service.mutate('update', { id: wave.id, version: wave.version, currentMove: { ...wave.currentMove, status: 'complete', outcome: 'The review changed our design.', evidence: 'https://example.test/outcome' } }, guide)).wave;
  assert.equal(wave.journey.length, 1);
  wave = (await service.mutate('update', { id: wave.id, version: wave.version, currentMove: { title: 'Test the working tool', status: 'open', needs: 'One tester' } }, guide)).wave;
  assert.notEqual(wave.currentMove.id, firstMove);
  assert.equal(wave.journey.length, 1);
});

test('request boundary rejects cross-site writes and unconfigured installation reports readiness', async () => {
  const safe = { headers: { origin: 'https://www.waves.fund', host: 'www.waves.fund', 'content-type': 'application/json' }, body: { action: 'receipt' } };
  assert.deepEqual(bodyOf(safe), { action: 'receipt' });
  assert.throws(() => bodyOf({ ...safe, headers: { ...safe.headers, origin: 'https://outside.example' } }), status(403));
  assert.throws(() => bodyOf({ ...safe, body: [] }), status(400));
  assert.throws(() => bodyOf({ ...safe, headers: { ...safe.headers, 'content-length': '100001' } }), status(413));
  if (!configured()) assert.equal((await readiness()).ready, false);
});

test('nonfinite or negative fees and credential-bearing evidence links are rejected', async () => {
  const { service } = harness();
  let wave = await fixture(service);
  for (const fee of ['USD -500', 'USD 1e999', 'USD 0']) {
    wave = (await service.mutate('update', { id: wave.id, version: wave.version, engagement: { ...engagement, fee } }, guide)).wave;
    await assert.rejects(service.mutate('approveEngagement', { id: wave.id, version: wave.version, as: 'guide' }, guide), status(400));
  }
  await assert.rejects(service.mutate('update', { id: wave.id, version: wave.version, draft: { title: 'Example', deliverableUrl: 'https://user:password@example.test' } }, guide), status(400));
});
