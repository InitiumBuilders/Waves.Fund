import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ClerkFailed, SignIn, SignUp, useAuth } from "@clerk/react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthContext, GiveNav, Loading, MeProvider, PageHead, devActor, forgetMe, useGiveAuth, useMe } from "./core";
import type { GiveAuth } from "./core";
import { CONTACT } from "../ui";
import "./give.css";

const ProfilePage = lazy(() => import("./profile"));
const GuidePage = lazy(() => import("./guide"));
const SpacePage = lazy(() => import("./space"));
const Opportunities = lazy(() => import("./opportunities").then((m) => ({ default: m.Opportunities })));
const NewOpportunity = lazy(() => import("./opportunities").then((m) => ({ default: m.NewOpportunity })));
const WavePage = lazy(() => import("./wave"));
const RecordPage = lazy(() => import("./record").then((m) => ({ default: m.RecordPage })));
const PrivacyPage = lazy(() => import("./record").then((m) => ({ default: m.PrivacyPage })));

const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/* Give Together, everything under /give/. The landing page at /give is src/give.tsx.
   Accounts are the site's Clerk accounts; in local development ?as=dev_a stands in for one. */
export default function GiveApp() {
  const dev = useMemo(devActor, []);
  if (dev) return <DevAuth actor={dev} />;
  if (!key) return <Frame><Unavailable /></Frame>;
  return <ClerkAuth />;
}

function DevAuth({ actor }: { actor: string }) {
  const value = useMemo<GiveAuth>(() => ({ ready: true, signedIn: true, dev: actor, token: async () => null, signOut: async () => { sessionStorage.removeItem("give-dev-actor"); forgetMe(); location.assign("/give"); } }), [actor]);
  return <AuthContext.Provider value={value}><Screens who={actor} /></AuthContext.Provider>;
}

function ClerkAuth() {
  const { isLoaded, isSignedIn, getToken, signOut, userId } = useAuth();
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => { if (isLoaded) return; const t = setTimeout(() => setSlow(true), 8000); return () => clearTimeout(t); }, [isLoaded]);
  const value = useMemo<GiveAuth>(() => ({
    ready: isLoaded, signedIn: Boolean(isSignedIn), dev: null, token: () => getToken(),
    signOut: async () => { forgetMe(); await signOut({ redirectUrl: "/give" }); },
  }), [isLoaded, isSignedIn, getToken, signOut]);
  return (
    <AuthContext.Provider value={value}>
      <ClerkFailed><Flag set={setFailed} /></ClerkFailed>
      {failed || (slow && !isLoaded) ? <Frame><Unavailable /></Frame> : <Screens who={userId || ""} />}
    </AuthContext.Provider>
  );
}
function Flag({ set }: { set: (v: boolean) => void }) { useEffect(() => set(true), [set]); return null; }

function Screens({ who }: { who: string }) {
  return (
    <Routes>
      <Route path="sign-in/*" element={<Enter join={false} />} />
      <Route path="join/*" element={<Enter join />} />
      <Route path="*" element={<Member who={who} />} />
    </Routes>
  );
}

// Every signed-in page: the Give Together nav, then the page. Pages that need a Give Profile send you to make one.
function Member({ who }: { who: string }) {
  const auth = useGiveAuth();
  const { pathname } = useLocation();
  if (!auth.ready) return <Frame><Loading>Opening Give Together…</Loading></Frame>;
  if (!auth.signedIn) return <Enter join={false} from={pathname} />;
  return (
    <MeProvider who={who}>
      <Frame nav>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="profile" element={<ProfilePage />} />
            <Route path="guide" element={<NeedsProfile><GuidePage /></NeedsProfile>} />
            <Route path="with/:id" element={<NeedsProfile><SpacePage /></NeedsProfile>} />
            <Route path="opportunities" element={<NeedsProfile><Opportunities /></NeedsProfile>} />
            <Route path="opportunities/new" element={<NeedsProfile><NewOpportunity /></NeedsProfile>} />
            <Route path="wave/:id" element={<NeedsProfile><WavePage /></NeedsProfile>} />
            <Route path="record" element={<NeedsProfile><RecordPage /></NeedsProfile>} />
            <Route path="privacy" element={<NeedsProfile><PrivacyPage /></NeedsProfile>} />
            <Route path="*" element={<Navigate to="/give/guide" replace />} />
          </Routes>
        </Suspense>
      </Frame>
    </MeProvider>
  );
}

function NeedsProfile({ children }: { children: ReactNode }) {
  const { me, error } = useMe();
  const { pathname } = useLocation();
  if (!me) return error ? <Unavailable message={error} /> : <Loading />;
  if (!me.profile) return <Navigate to="/give/profile" replace state={{ from: pathname }} />;
  if (me.profile.status === "suspended") {
    return (
      <section className="panel gt-card">
        <h2>Your Give Profile Is Paused</h2>
        <p>Someone reported a concern, and the team is looking at it. While they review it, matching and messages are paused. If you think this is a mistake, write to the team.</p>
        <a className="text-button" href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </section>
    );
  }
  return children;
}

function Frame({ children, nav = false }: { children: ReactNode; nav?: boolean }) {
  return (
    <div className="gt-page document-page">
      {nav && <GiveNav />}
      {children}
    </div>
  );
}

function Unavailable({ message }: { message?: string }) {
  return (
    <section className="panel gt-card gt-unavailable">
      <PageHead eyebrow="GIVE" title="Give Together" />
      <p>{message || "Sign-in for Give Together is being connected. It opens here as soon as it is ready."}</p>
      <p className="fine-print">You can still read about Give Together and Teachbacks, and give to this month’s Wave Partner.</p>
      <div className="gt-actions">
        <Link className="glow-button" to="/give">Give Together</Link>
        <Link className="text-button" to="/guide/teachback">The Teachback</Link>
      </div>
    </section>
  );
}

// Sign in or create an account. Clerk draws the form; the page around it is ours.
function Enter({ join, from }: { join: boolean; from?: string }) {
  const auth = useGiveAuth();
  if (auth.dev) return <Navigate to="/give/guide" replace />;
  if (auth.ready && auth.signedIn && !from) return <Navigate to="/give/profile" replace />;
  const redirect = from && from !== "/give/" ? from : "/give/profile";
  return (
    <Frame>
      <div className="gt-enter">
        <PageHead title={<>Give <span>Together</span></>}>
          <p>Find Your People. Give Together. Build a Wave.</p>
        </PageHead>
        <p className="gt-enter-note">{join ? "Create an account to make your Give Profile. You must be 18 or older." : "Sign in to open your Give Profile, your Give Guide and your Waves. New here? Create an account."}</p>
        <div className="gt-clerk">
          {!auth.ready ? <Loading>Opening sign-in…</Loading>
            : join ? <SignUp routing="path" path="/give/join" signInUrl="/give/sign-in" forceRedirectUrl={redirect} />
            : from ? <SignIn routing="hash" signUpUrl="/give/join" forceRedirectUrl={redirect} />
            : <SignIn routing="path" path="/give/sign-in" signUpUrl="/give/join" forceRedirectUrl={redirect} />}
        </div>
        <p className="fine-print">Your account is only used for Give Together and your Wave workspace. <Link to="/privacy">Privacy & Participation</Link></p>
      </div>
    </Frame>
  );
}
