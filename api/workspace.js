import { fault } from './_workspace/core.js';
import { actorOf, baseHeaders, bodyOf, limit, readiness, respondError, services } from './_workspace/http.js';

export default async function handler(req, res) {
  baseHeaders(res);
  try {
    const queryAction = String(req.query?.action || 'list');
    if (process.env.WAVES_WORKSPACE_ENABLED !== 'true') {
      if (req.method === 'GET' && queryAction === 'config') return res.status(200).json({ ready: false, message: 'Cohort invitations are opening soon. The Guide Library is available now.' });
      throw fault(503, 'Cohort invitations are opening soon.');
    }
    if (req.method === 'GET' && queryAction === 'config') return res.status(200).json(await readiness());
    const { service } = services();
    const actor = await actorOf(req);
    if (req.method === 'GET') {
      await limit(req, 'workspace-read', 240);
      if (queryAction === 'list') return res.status(200).json(await service.list(actor));
      if (queryAction === 'detail' || queryAction === 'export') {
        const detail = await service.detail(String(req.query?.id || ''), actor);
        if (queryAction === 'export') res.setHeader('Content-Disposition', `attachment; filename="wave-${detail.wave.slug}.json"`);
        return res.status(200).json(detail);
      }
      throw fault(400, 'Unknown workspace view.');
    }
    if (req.method !== 'POST') throw fault(405, 'Method not allowed.');
    const body = bodyOf(req);
    await limit(req, 'workspace-write', 80);
    return res.status(200).json(await service.mutate(String(body.action || req.query?.action || ''), body, actor));
  } catch (error) { return respondError(res, error); }
}
