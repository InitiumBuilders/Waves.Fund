import { ClerkProvider, SignIn, SignUp } from '@clerk/react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Intro } from './ui';
const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const workspaceKey = import.meta.env.VITE_WORKSPACE_ENABLED === 'true' ? key : '';
const appearance = { variables: { colorPrimary: '#56dfff', colorBackground: '#06172b', colorForeground: '#ffffff', colorMutedForeground: '#ffffff', colorInput: '#031020', colorInputForeground: '#ffffff', colorNeutral: '#ffffff', borderRadius: '1rem', fontFamily: 'Inter Variable, sans-serif' } };
export function MemberProvider({ area, children }: { area: 'give' | 'workspace'; children: ReactNode }) {
  const navigate = useNavigate();
  const give = area === 'give';
  return (
    <ClerkProvider
      publishableKey={key}
      signInUrl={give ? '/give/sign-in' : '/sign-in'}
      signUpUrl={give ? '/give/join' : '/sign-up'}
      signInFallbackRedirectUrl={give ? '/give/profile' : '/workspace'}
      signUpFallbackRedirectUrl={give ? '/give/profile' : '/workspace'}
      routerPush={(to: string) => navigate(to)}
      routerReplace={(to: string) => navigate(to, { replace: true })}
      appearance={appearance}
    >
      {children}
    </ClerkProvider>
  );
}
export function MemberSignIn({ signup = false }: { signup?: boolean }) {
  return <div className="narrow-page"><Intro eyebrow="YOUR WAVE WORKSPACE" title="Build Together." /><section className="panel" style={{ display: 'grid', justifyItems: 'center', gap: 20 }}><p>Use the email invited to your Wave. Your builder and Guide share a private place for the work.</p>{workspaceKey ? signup ? <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" /> : <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" /> : <p>Account setup is being completed. The Guide Library is available now.</p>}<Link to="/guide/library" className="text-button">Explore The Guide Library</Link></section></div>;
}
