import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
const MemberProvider = lazy(() => import('./member-auth').then(m => ({ default: m.MemberProvider })));
export function MemberBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const accountRoute = pathname.startsWith('/workspace') || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
  if (import.meta.env.VITE_WORKSPACE_ENABLED !== 'true' || !accountRoute) return children;
  return <Suspense fallback={<p className="narrow-page" role="status">Opening your account…</p>}><MemberProvider>{children}</MemberProvider></Suspense>;
}
