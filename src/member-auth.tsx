import { ClerkProvider, SignIn, SignUp } from '@clerk/react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Intro } from './ui';
const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const workspaceKey = import.meta.env.VITE_WORKSPACE_ENABLED === 'true' ? key : '';
// Vercel named the Clerk application "waves-fund-members", and Clerk puts that name into some of its own lines.
// These are Clerk's default English lines with the name set to Waves.Fund. (Clerk's emails use the name set in
// its dashboard.)
const NAME = 'Waves.Fund';
const toContinue = { subtitle: `to continue to ${NAME}` };
const localization = {
  signIn: {
    start: { title: `Sign in to ${NAME}`, titleCombined: `Continue to ${NAME}` },
    emailCode: toContinue, emailCodeMfa: toContinue, emailLink: toContinue, emailLinkMfa: toContinue,
    phoneCode: toContinue, alternativePhoneCodeProvider: toContinue, ssoFallback: { code: toContinue },
  },
  signUp: { emailLink: toContinue },
  organizationList: toContinue,
};
// Clerk's buttons wear the site's own: a dark plate inside the cyan-to-violet rim, with light text.
const plate = 'linear-gradient(160deg, #081c3e, #030b1f 72%) padding-box, linear-gradient(120deg, #9df4ff, #4f8fff 52%, #a28dff) border-box';
const appearance = {
  variables: { colorPrimary: '#56dfff', colorPrimaryForeground: '#eafdff', colorTextOnPrimaryBackground: '#eafdff', colorBackground: '#06172b', colorForeground: '#ffffff', colorMutedForeground: '#ffffff', colorInput: '#031020', colorInputForeground: '#ffffff', colorNeutral: '#ffffff', borderRadius: '1rem', fontFamily: 'Inter Variable, sans-serif' },
  elements: {
    formButtonPrimary: { background: plate, border: '1.4px solid transparent', color: '#eafdff', minHeight: '48px', borderRadius: '18px', fontWeight: 600, boxShadow: '0 0 22px rgba(94, 233, 255, 0.16)', '&:hover': { boxShadow: '0 0 30px rgba(94, 233, 255, 0.3)' }, '&::after': { opacity: 0 } },
    socialButtonsBlockButton: { background: 'linear-gradient(160deg, #081c3e, #030b1f 72%)', border: '1px solid rgba(130, 220, 255, 0.38)', color: '#eafdff', minHeight: '48px', borderRadius: '16px' },
    footerActionLink: { color: '#8ff0ff' },
  },
};
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
      localization={localization}
    >
      {children}
    </ClerkProvider>
  );
}
export function MemberSignIn({ signup = false }: { signup?: boolean }) {
  return <div className="narrow-page"><Intro eyebrow="YOUR WAVE WORKSPACE" title="Build Together." /><section className="panel" style={{ display: 'grid', justifyItems: 'center', gap: 20 }}><p>Use the email invited to your Wave. Your builder and Guide share a private place for the work.</p>{workspaceKey ? signup ? <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" /> : <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" /> : <p>Account setup is being completed. The Guide Library is available now.</p>}<Link to="/guide/library" className="text-button">Explore The Guide Library</Link></section></div>;
}
