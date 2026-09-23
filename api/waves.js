import { fault } from './_workspace/core.js';
import { baseHeaders, bodyOf, limit, respondError, services } from './_workspace/http.js';

export default async function handler(req, res) {
  baseHeaders(res);
  try {
    if (process.env.WAVES_WORKSPACE_ENABLED !== 'true') throw fault(503, 'The first shared Wave workspaces are being prepared. Explore the Wave examples and Guide Library.');
    const { service } = services();
    if (req.method === 'GET') return res.status(200).json(await service.published(String(req.query?.slug || '')));
    if (req.method !== 'POST') throw fault(405, 'Method not allowed.');
    const body = bodyOf(req), action = String(body.action || req.query?.action || '');
    await limit(req, action === 'offer' ? 'public-offer' : 'public-receipt', action === 'offer' ? 15 : 60);
    return res.status(200).json(await service.publicAction(action, body));
  } catch (error) { return respondError(res, error); }
}
