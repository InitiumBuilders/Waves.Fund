import { createClerkClient } from '@clerk/backend';
import { createHmac } from 'node:crypto';
import { createWorkspaceService, fault } from './core.js';
import { createNeonStore } from './store.js';

const message = 'Shared workspaces are being prepared. The Guide library and project applications are available now.';
export const configured = () => !!(process.env.DATABASE_URL && process.env.CLERK_SECRET_KEY && (process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && process.env.WAVES_DATA_KEY && process.env.WAVES_WORKSPACE_ADMIN_EMAILS);
let cached;
export function services() {
  if (!configured()) throw fault(503, message);
  if (!cached) {
    const store = createNeonStore(process.env.DATABASE_URL);
    cached = { store, service: createWorkspaceService({ store, secret: process.env.WAVES_DATA_KEY }) };
  }
  return cached;
}
export async function readiness() {
  if (!configured()) return { ready: false, message };
  try { await services().store.ready(); return { ready: true }; }
  catch { return { ready: false, message }; }
}
const allowedOrigins = () => [
  'https://www.waves.fund', 'https://waves.fund',
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ...(process.env.WAVES_WORKSPACE_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
  ...(!process.env.VERCEL && process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : []),
];
export function baseHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}
export function bodyOf(req) {
  const origin = req.headers.origin;
  let match = false;
  try { match = new URL(origin).host === req.headers.host && allowedOrigins().includes(new URL(origin).origin); } catch { /* Reject absent/invalid origins below. */ }
  if (!match) throw fault(403, 'Please submit from Waves.Fund.');
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw fault(415, 'JSON required.');
  if (Number(req.headers['content-length'] || 0) > 100000) throw fault(413, 'This update is too large.');
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { throw fault(400, 'Invalid request.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 100000) throw fault(400, 'Invalid request.');
  return body;
}
export async function actorOf(req) {
  if (!String(req.headers.authorization || '').startsWith('Bearer ')) throw fault(401, 'Sign in to your invited account.');
  const client = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  const protocol = String(req.headers.host || '').startsWith('localhost') || String(req.headers.host || '').startsWith('127.0.0.1') ? 'http' : 'https';
  const request = new Request(`${protocol}://${req.headers.host}${req.url || '/api/workspace'}`, { headers });
  let authentication;
  try { authentication = await client.authenticateRequest(request, { authorizedParties: allowedOrigins(), acceptsToken: 'session_token' }); }
  catch { throw fault(401, 'Your session could not be verified. Please sign in again.'); }
  if (!authentication.isAuthenticated) throw fault(401, 'Sign in to your invited account.');
  const auth = authentication.toAuth();
  if (!auth.userId) throw fault(401, 'Sign in to your invited account.');
  const user = await client.users.getUser(auth.userId);
  if (user.banned || user.locked) throw fault(403, 'This account cannot access a workspace.');
  const primary = user.emailAddresses.find(value => value.id === user.primaryEmailAddressId && value.verification?.status === 'verified');
  if (!primary) throw fault(403, 'Verify your primary email before opening a workspace.');
  const email = primary.emailAddress.toLowerCase();
  const admins = (process.env.WAVES_WORKSPACE_ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return { userId: auth.userId, email, isAdmin: admins.includes(email) };
}
export async function limit(req, action, maximum = 60) {
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const hour = Math.floor(Date.now() / 3600000);
  const bucket = createHmac('sha256', process.env.WAVES_DATA_KEY).update(`${ip}:${action}:${hour}`).digest('hex');
  await services().store.limit(bucket, maximum, new Date((hour + 2) * 3600000).toISOString());
}
export function respondError(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 503;
  if (status >= 500) console.error('Workspace request unavailable:', error.name || 'Error');
  return res.status(status).json({ error: status >= 500 ? message : error.message });
}
