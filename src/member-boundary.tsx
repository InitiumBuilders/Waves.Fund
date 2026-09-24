import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
const MemberProvider = lazy(() => import('./member-auth').then(m => ({ default: m.MemberProvider })));
const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const workspaceOn = import.meta.env.VITE_WORKSPACE_ENABLED === 'true';
// Only account pages load Clerk. The Give landing at /give stays free of it; everything under /give/ uses it.
export function accountArea(pathname: string): 'give' | 'workspace' | null {
  if (!key) return null;
  if (pathname.startsWith('/give/')) return 'give';
  if (workspaceOn && (pathname.startsWith('/workspace') || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) return 'workspace';
  return null;
}
export function MemberBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const area = accountArea(pathname);
  if (!area) return children;
  return <Suspense fallback={<p className="narrow-page" role="status">Opening your account…</p>}><MemberProvider area={area}>{children}</MemberProvider></Suspense>;
}
