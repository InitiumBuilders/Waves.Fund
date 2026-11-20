import { fault } from './_workspace/core.js';
import { baseHeaders, bodyOf, limit, respondError, services } from './_workspace/http.js';
import { notify } from './_notify.js';

export default async function handler(req, res) {
  baseHeaders(res);
  try {
    if (process.env.WAVES_WORKSPACE_ENABLED !== 'true') throw fault(503, 'The first shared Wave workspaces are being prepared. Explore the Wave examples and Guide Library.');
    const { service } = services();
    if (req.method === 'GET') return res.status(200).json(await service.published(String(req.query?.slug || '')));
    if (req.method !== 'POST') throw fault(405, 'Method not allowed.');
    const body = bodyOf(req), action = String(body.action || req.query?.action || '');
    await limit(req, action === 'offer' ? 'public-offer' : 'public-receipt', action === 'offer' ? 15 : 60);
    const result = await service.publicAction(action, body);
    // A new offer reaches the team by mail, as an application does (nothing is sent until the mail key exists; the
    // offer's own words stay in the workspace).
    if (action === 'offer') await notify('A new offer on a Wave', [`Someone offered help on ${result.wave?.title || 'a Wave'}.`, 'Read it: https://www.waves.fund/workspace']);
    return res.status(200).json(result);
  } catch (error) { return respondError(res, error); }
}
