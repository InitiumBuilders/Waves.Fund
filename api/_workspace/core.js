import { createHmac, randomBytes, randomUUID } from 'node:crypto';

export const fault = (status, message) => Object.assign(new Error(message), { status });
const clean = (value, max = 2000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const email = value => clean(value, 254).toLowerCase();
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
const clone = value => structuredClone(value);
const templateNames = new Set(['growth', 'funding', 'innovation', 'story', 'hype', 'maker', 'work', 'brave', 'custom']);
const roles = new Set(['builder', 'guide', 'support']);
const fields = (input, names, max = 3000) => Object.fromEntries(names.map(name => [name, clean(input?.[name], max)]));
function link(value) {
  const result = clean(value, 2048);
  if (!result) return '';
  try { const url = new URL(result); if (url.protocol === 'https:' && !url.username && !url.password) return result; } catch { /* Validation below. */ }
  throw fault(400, 'Evidence must be an https link.');
}
function required(value, label) { if (!value) throw fault(400, `${label} is required.`); return value; }
function hash(value, secret) { return createHmac('sha256', secret).update(value).digest('hex'); }
function memberRoles(wave, actor) {
  const assigned = wave.members.filter(member => member.email === actor.email).map(member => member.role);
  return [...new Set([...(actor.isAdmin ? ['admin'] : []), ...assigned])];
}
function requireRole(wave, actor, allowed) {
  const available = memberRoles(wave, actor);
  if (!available.some(role => allowed.includes(role))) throw fault(403, 'You do not have access to this action.');
  return available;
}
function privateView(wave, actor) {
  const available = requireRole(wave, actor, ['admin', 'builder', 'guide', 'support']);
  const result = clone(wave);
  delete result.audit;
  for (const item of [...result.offers, ...result.passes]) {
    delete item.receiptHash;
    delete item.requestId;
  }
  if (!available.some(role => ['admin', 'builder', 'guide'].includes(role))) {
    for (const offer of result.offers) offer.email = '';
  }
  return { wave: result, role: available[0], roles: available, isAdmin: actor.isAdmin };
}
function expiredPass(pass, now) {
  if (['invited', 'accepted'].includes(pass.status) && Date.parse(pass.expires) < Date.parse(now)) return { ...pass, status: 'expired' };
  return pass;
}
function publicView(wave, now) {
  if (wave.status !== 'published' || !wave.published) return null;
  const result = clone(wave.published);
  // Consent withdrawal and expiry take effect immediately, without publishing a new story revision.
  result.contributions = result.contributions.filter(item => wave.offers.some(offer => offer.id === item.id && offer.recognitionConsent && offer.status === 'completed'));
  result.carrying = result.carrying.filter(item => wave.passes.some(pass => pass.id === item.id && pass.recognitionConsent && ['accepted', 'completed'].includes(expiredPass(pass, now).status)));
  result.contributions = result.contributions.map(({ id, ...item }) => item);
  result.carrying = result.carrying.map(({ id, ...item }) => item);
  return result;
}
function snapshot(wave, now) {
  return {
    id: wave.id, slug: wave.slug, template: wave.template, title: wave.draft.title,
    story: wave.draft.story, guideName: wave.draft.guideName, guideBio: wave.draft.guideBio,
    currentMove: clone(wave.currentMove), journey: clone(wave.journey), publishedAt: now,
    contributions: wave.offers.filter(item => item.status === 'completed' && item.recognitionConsent).map(item => ({ id: item.id, name: item.name, outcome: item.outcome, evidence: item.evidence })),
    carrying: wave.passes.filter(item => ['accepted', 'completed'].includes(expiredPass(item, now).status) && item.recognitionConsent).map(item => ({ id: item.id, name: item.name, purpose: item.purpose, status: item.status, outcome: item.outcome, evidence: item.evidence })),
  };
}
const engagementNames = ['scope', 'fee', 'paymentSchedule', 'deliveryWindow', 'revisions', 'ownership', 'support'];
function completeEngagement(engagement) {
  for (const name of ['scope', 'fee', 'paymentSchedule', 'deliveryWindow', 'ownership']) required(engagement[name], name);
  const amount = Number(engagement.fee.replace(/,/g, '').match(/[-+]?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i)?.[0]);
  if (!Number.isFinite(amount) || amount <= 0) throw fault(400, 'Record the agreed paid fee, including its positive amount.');
}
function normalizeMove(input, old) {
  const result = fields(input, ['title', 'owner', 'needs', 'completion', 'outcome']);
  result.id = old?.id || randomUUID();
  result.status = input?.status === 'complete' ? 'complete' : 'open';
  result.evidence = link(input?.evidence);
  if (old?.status === 'complete' && result.status === 'open') result.id = randomUUID();
  if (result.status === 'complete') {
    required(result.outcome, 'What changed'); required(result.evidence, 'Completion evidence');
  }
  return result;
}

/** Pure service with an injected persistence boundary, also used by the isolated flow tests. */
export function createWorkspaceService({ store, secret, now = () => new Date().toISOString() }) {
  if (!secret) throw fault(503, 'Workspaces are being prepared. Please return soon.');
  async function get(id) {
    if (!uuid(id)) throw fault(404, 'Wave not found.');
    const wave = await store.get(id);
    if (!wave) throw fault(404, 'Wave not found.');
    wave.passes = wave.passes.map(pass => expiredPass(pass, now()));
    return wave;
  }
  async function save(wave, expected, actor, action) {
    wave.updated = now();
    wave.audit = [...(wave.audit || []), { action, actor: actor.email || 'receipt holder', at: wave.updated }].slice(-200);
    wave.version = expected + 1;
    const written = await store.save(wave, expected);
    if (!written) throw fault(409, 'This Wave changed while you were working. Refresh it before saving again.');
    return wave;
  }
  function expectVersion(wave, body) {
    if (!Number.isSafeInteger(body.version) || body.version !== wave.version) throw fault(409, 'This Wave changed while you were working. Refresh it before saving again.');
  }
  async function create(body, actor) {
    if (!actor.isAdmin) throw fault(403, 'Only the team can create an invited workspace.');
    const slug = clean(body.slug, 80).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw fault(400, 'Use letters, numbers, and single hyphens for the Wave address.');
    const builderEmail = email(body.builderEmail), guideEmail = email(body.guideEmail);
    if (!validEmail(builderEmail) || !validEmail(guideEmail)) throw fault(400, 'A builder email and a lead Guide email are required.');
    const title = required(clean(body.title, 120), 'Wave title');
    const date = now();
    const wave = {
      id: randomUUID(), slug, title, template: templateNames.has(body.template) ? body.template : 'custom',
      legacyApplicationId: clean(body.legacyApplicationId, 100), version: 1, status: 'draft', created: date, updated: date,
      members: [{ email: builderEmail, role: 'builder' }, { email: guideEmail, role: 'guide' }],
      brief: { mission: '', audience: '', needs: '' }, draft: { title, story: '', guideName: '', guideBio: '', buildNotes: '', deliverableUrl: '' },
      engagement: { ...fields({}, engagementNames), builderApprovedAt: null, guideApprovedAt: null },
      currentMove: normalizeMove({}), journey: [], offers: [], passes: [], published: null, pending: null,
      initialReviewAt: null, audit: [{ action: 'create', actor: actor.email, at: date }],
    };
    await store.insert(wave);
    return privateView(wave, actor);
  }
  async function mutate(action, body, actor) {
    if (action === 'create') return create(body, actor);
    const wave = await get(body.id);
    requireRole(wave, actor, ['admin', 'builder', 'guide', 'support']);
    expectVersion(wave, body);
    const expected = wave.version;
    let receipt;
    if (action === 'update') {
      requireRole(wave, actor, ['builder', 'guide', 'support']);
      if (body.brief) wave.brief = fields(body.brief, ['mission', 'audience', 'needs']);
      if (body.draft) wave.draft = { ...fields(body.draft, ['title', 'story', 'guideName', 'guideBio', 'buildNotes'], 12000), title: required(clean(body.draft.title, 120), 'Wave title'), deliverableUrl: link(body.draft.deliverableUrl) };
      if (body.engagement) {
        requireRole(wave, actor, ['builder', 'guide']);
        const next = fields(body.engagement, engagementNames);
        if (engagementNames.some(name => next[name] !== wave.engagement[name])) wave.engagement = { ...next, builderApprovedAt: null, guideApprovedAt: null };
      }
      if (body.currentMove) {
        requireRole(wave, actor, ['builder', 'guide']);
        const previous = wave.currentMove;
        const next = normalizeMove(body.currentMove, previous);
        if (previous.status === 'open' && next.status === 'complete') wave.journey.push({ id: randomUUID(), title: previous.title || next.title, body: next.outcome, evidence: next.evidence, created: now() });
        wave.currentMove = next;
      }
      if (body.journey) {
        if (!Array.isArray(body.journey) || body.journey.length > 100) throw fault(400, 'A Journey can contain up to 100 entries.');
        const existing = new Map(wave.journey.map(item => [item.id, item]));
        wave.journey = body.journey.map(item => ({ id: existing.has(item.id) ? item.id : randomUUID(), title: required(clean(item.title, 160), 'Journey title'), body: clean(item.body, 4000), evidence: link(item.evidence), created: existing.get(item.id)?.created || now() }));
      }
      wave.title = wave.draft.title;
      wave.pending = null;
      if (wave.status === 'review') wave.status = 'draft';
    } else if (action === 'approveEngagement') {
      if (!['builder', 'guide'].includes(body.as)) throw fault(400, 'Choose the builder or lead Guide role.');
      requireRole(wave, actor, [body.as]); completeEngagement(wave.engagement);
      wave.engagement[body.as === 'builder' ? 'builderApprovedAt' : 'guideApprovedAt'] = now();
    } else if (action === 'publish') {
      requireRole(wave, actor, ['builder']);
      if (!wave.engagement.builderApprovedAt || !wave.engagement.guideApprovedAt) throw fault(400, 'The builder and lead Guide must approve the engagement first.');
      for (const [value, label] of [[wave.draft.title, 'Wave title'], [wave.draft.story, 'Story'], [wave.draft.guideName, 'Guide name'], [wave.currentMove.title, 'Current move'], [wave.currentMove.needs, 'Help needed']]) required(value, label);
      if (wave.initialReviewAt) { wave.published = snapshot(wave, now()); wave.status = 'published'; wave.pending = null; }
      else { wave.pending = snapshot(wave, now()); wave.status = 'review'; }
    } else if (action === 'review') {
      if (!actor.isAdmin) throw fault(403, 'Team review is required.');
      if (!wave.pending || wave.status !== 'review') throw fault(400, 'The builder has not submitted a revision for review.');
      if (body.decision === 'approve') { wave.published = wave.pending; wave.initialReviewAt = now(); wave.status = 'published'; }
      else if (body.decision === 'return') wave.status = 'draft';
      else throw fault(400, 'Choose approve or return.');
      wave.pending = null;
    } else if (action === 'pause') {
      requireRole(wave, actor, ['builder', 'admin']); wave.status = 'paused'; wave.pending = null;
    } else if (action === 'member') {
      if (!actor.isAdmin) throw fault(403, 'Only the team can change membership.');
      const address = email(body.email);
      if (!validEmail(address) || !roles.has(body.role)) throw fault(400, 'Choose a valid email and membership role.');
      if (body.remove) wave.members = wave.members.filter(item => !(item.email === address && item.role === body.role));
      else if (body.role === 'support') {
        if (!wave.members.some(item => item.email === address && item.role === 'support')) wave.members.push({ email: address, role: 'support' });
      } else {
        wave.members = wave.members.filter(item => item.role !== body.role);
        wave.members.push({ email: address, role: body.role });
      }
      if (!wave.members.some(item => item.role === 'builder') || !wave.members.some(item => item.role === 'guide')) throw fault(400, 'Assign a replacement builder or lead Guide before removing them.');
      if (wave.members.length > 20) throw fault(400, 'This pilot supports up to 20 memberships per Wave.');
      if (body.role !== 'support') { wave.engagement.builderApprovedAt = null; wave.engagement.guideApprovedAt = null; wave.pending = null; if (wave.status === 'review') wave.status = 'draft'; }
    } else if (action === 'offer') {
      requireRole(wave, actor, ['builder', 'guide']);
      const offer = wave.offers.find(item => item.id === body.offerId);
      if (!offer) throw fault(404, 'Offer not found.');
      const transitions = { offered: ['acknowledged', 'declined'], acknowledged: ['agreed', 'declined'], agreed: ['completed', 'declined'], completed: [], declined: [], withdrawn: [] };
      if (body.status !== offer.status && !transitions[offer.status].includes(body.status)) throw fault(400, 'Choose the next available contribution step.');
      offer.response = clean(body.response); offer.outcome = clean(body.outcome); offer.evidence = link(body.evidence);
      if (body.status === 'agreed') required(offer.response, 'Agreed responsibility');
      if (body.status === 'completed') { required(offer.outcome, 'Contribution outcome'); required(offer.evidence, 'Outcome evidence'); }
      offer.status = body.status; offer.updated = now(); wave.pending = null; if (wave.status === 'review') wave.status = 'draft';
    } else if (action === 'pass') {
      requireRole(wave, actor, ['builder', 'guide']);
      if (!wave.published || wave.status !== 'published') throw fault(400, 'Publish the Wave before inviting someone to carry it.');
      const expires = new Date(body.expires);
      if (!Number.isFinite(expires.getTime()) || expires.getTime() <= Date.parse(now()) || expires.getTime() > Date.parse(now()) + 90 * 86400000) throw fault(400, 'Choose an expiry within the next 90 days.');
      receipt = `wp_${randomBytes(32).toString('base64url')}`;
      wave.passes.push({ id: randomUUID(), name: required(clean(body.name, 120), 'Carrier name'), purpose: required(clean(body.purpose, 2000), 'Purpose'), expires: expires.toISOString(), status: 'invited', outcome: '', evidence: '', recognitionConsent: false, created: now(), updated: now(), receiptHash: hash(receipt, secret) });
    } else if (action === 'passUpdate') {
      requireRole(wave, actor, ['builder', 'guide']);
      const pass = wave.passes.find(item => item.id === body.passId);
      if (!pass) throw fault(404, 'Carrying invitation not found.');
      if (body.status === 'completed' && pass.status === 'accepted') { pass.outcome = required(clean(body.outcome), 'Outcome'); pass.evidence = required(link(body.evidence), 'Evidence'); }
      else if (!(body.status === 'revoked' && ['invited', 'accepted'].includes(pass.status))) throw fault(400, 'This invitation cannot make that transition.');
      pass.status = body.status; pass.updated = now(); wave.pending = null; if (wave.status === 'review') wave.status = 'draft';
    } else throw fault(400, 'Unknown workspace action.');
    if (wave.offers.length > 500 || wave.passes.length > 250) throw fault(400, 'This pilot Wave has reached its participation limit. Please contact the team.');
    await save(wave, expected, actor, action);
    return { ...privateView(wave, actor), ...(receipt ? { receipt } : {}) };
  }
  async function publicAction(action, body) {
    if (action === 'offer') {
      if (clean(body.website)) throw fault(400, 'This offer could not be submitted.');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId || '')) throw fault(400, 'Please reload the form and try again.');
      const wave = await store.bySlug(clean(body.slug, 80));
      if (!wave || !publicView(wave, now())) throw fault(404, 'This Wave is not available.');
      const receipt = `wo_${hash(`offer:${wave.id}:${body.requestId}`, secret)}`;
      const receiptHash = hash(receipt, secret);
      const existing = wave.offers.find(item => item.receiptHash === receiptHash);
      if (existing) return { receipt, ...receiptView(wave, existing, 'offer') };
      if (wave.currentMove.status !== 'open' || wave.currentMove.id !== wave.published.currentMove.id) throw fault(409, 'The current move is changing. Please return after its next update.');
      const address = email(body.email);
      if (!validEmail(address)) throw fault(400, 'Please enter your email.');
      const offer = { id: randomUUID(), name: required(clean(body.name, 120), 'Name'), email: address, message: required(clean(body.message, 3000), 'Your offer'), moveId: wave.currentMove.id, recognitionConsent: body.recognitionConsent === true, status: 'offered', response: '', outcome: '', evidence: '', created: now(), updated: now(), receiptHash };
      if (wave.offers.length >= 500) throw fault(400, 'This Wave has reached its pilot participation limit. Please contact the team.');
      wave.offers.push(offer);
      await save(wave, wave.version, {}, 'offerReceived');
      return { receipt, ...receiptView(wave, offer, 'offer') };
    }
    const receipt = clean(body.receipt, 150);
    if (!/^(wo_[a-f0-9]{64}|wp_[A-Za-z0-9_-]{43})$/.test(receipt)) throw fault(404, 'That receipt was not found.');
    const wave = await store.byReceipt(hash(receipt, secret));
    if (!wave) throw fault(404, 'That receipt was not found.');
    const kind = receipt.startsWith('wo_') ? 'offer' : 'pass';
    const item = (kind === 'offer' ? wave.offers : wave.passes).find(value => value.receiptHash === hash(receipt, secret));
    if (!item) throw fault(404, 'That receipt was not found.');
    if (action === 'receipt') return receiptView(wave, item, kind);
    if (action === 'withdraw' && kind === 'offer') {
      item.recognitionConsent = false; item.status = 'withdrawn'; item.updated = now();
    } else if (action === 'passReply' && kind === 'pass') {
      if (expiredPass(item, now()).status !== 'invited') throw fault(400, 'This invitation has already been answered or is no longer active.');
      if (!['accept', 'decline'].includes(body.decision)) throw fault(400, 'Choose accept or decline.');
      item.status = body.decision === 'accept' ? 'accepted' : 'declined'; item.recognitionConsent = body.recognitionConsent === true; item.updated = now();
    } else throw fault(400, 'That action is not available for this receipt.');
    await save(wave, wave.version, {}, action);
    return receiptView(wave, item, kind);
  }
  function receiptView(wave, item, kind) {
    const record = kind === 'pass' ? expiredPass(clone(item), now()) : clone(item);
    delete record.receiptHash; delete record.requestId;
    return { kind, wave: { title: wave.published?.title || wave.title, slug: wave.slug }, record, journey: publicView(wave, now())?.journey || [] };
  }
  return {
    async list(actor) { return { waves: (await store.list(actor)).map(wave => ({ ...privateView(wave, actor).wave, role: memberRoles(wave, actor)[0] })), isAdmin: actor.isAdmin, email: actor.email }; },
    async detail(id, actor) { return privateView(await get(id), actor); },
    mutate, publicAction,
    async published(slug) {
      if (slug) { const wave = await store.bySlug(slug); const result = wave && publicView(wave, now()); if (!result) throw fault(404, 'This Wave is not currently published.'); return { wave: result }; }
      return { waves: (await store.publicList()).map(wave => publicView(wave, now())).filter(Boolean) };
    },
  };
}
