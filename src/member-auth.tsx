import { ClerkProvider, SignIn, SignUp } from '@clerk/react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Intro } from './ui';
const key = import.meta.env.VITE_WORKSPACE_ENABLED === 'true' ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY : '';
export function MemberProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const accountRoute = pathname.startsWith('/workspace') || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
  if (!key || !accountRoute) return children;
  return <ClerkProvider publishableKey={key} signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/workspace" signUpFallbackRedirectUrl="/workspace" appearance={{ variables: { colorPrimary: '#56dfff', colorBackground: '#06172b', colorForeground: '#ffffff', colorMutedForeground: '#ffffff', colorInput: '#031020', colorInputForeground: '#ffffff', colorNeutral: '#ffffff', borderRadius: '1rem', fontFamily: 'Inter Variable, sans-serif' } }}>{children}</ClerkProvider>;
}
export function MemberSignIn({ signup = false }: { signup?: boolean }) {
  return <div className="narrow-page"><Intro eyebrow="YOUR WAVE WORKSPACE" title="Build Together." /><section className="panel" style={{ display: 'grid', justifyItems: 'center', gap: 20 }}><p>Use the email invited to your Wave. Your builder and Guide share a private place for the work.</p>{key ? signup ? <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" /> : <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" /> : <p>Account setup is being completed. The Guide Library is available now.</p>}<Link to="/guide/library" className="text-button">Explore The Guide Library</Link></section></div>;
}
