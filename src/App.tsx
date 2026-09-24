import { lazy, Suspense, useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  ArrowRight,
  Search,
} from "lucide-react";
import {
  ActionButton,
  Background,
  BottomNav,
  ButtonLink,
  Footer,
  Graphic,
  Header,
  Intro,
  Sheet,
  Status,
} from "./ui";
import { Home } from "./home";
import { MindAnchor, mindWave, WaveMind, Stock } from "./mind/WaveMind";
import { Give } from "./give";
import { MemberBoundary } from "./member-boundary";
import { Current } from "./mind/Current";
import { Vessel } from "./vessel";
import { useStateStore } from "./state";
import { Trax, TraxCollector } from "./trax";
import { FlowNavigation } from "./flow";
import { api, CommunityProvider, useCommunity } from "./community";
import type { Project } from "./community";
import { Application, Privacy, ReceiptTracker, TeamReview } from "./forms";
import {
  GreenReef,
  Learn,
  OceanPartner,
  Partners,
  Proposal,
  SemblePartner,
  Team,
} from "./pages";
const Begin = lazy(() => import("./begin"));
const GuidePitch = lazy(() => import("./guide-library").then(m => ({ default: m.GuidePitch })));
const GuideLibrary = lazy(() => import("./guide-library").then(m => ({ default: m.GuideLibrary })));
const GuideLesson = lazy(() => import("./guide-library").then(m => ({ default: m.GuideLesson })));
const Workspace = lazy(() => import("./workspace").then(m => ({ default: m.Workspace })));
const PublicWave = lazy(() => import("./public-wave").then(m => ({ default: m.PublicWave })));
const MemberSignIn = lazy(() => import("./member-auth").then(m => ({ default: m.MemberSignIn })));
const GiveApp = lazy(() => import("./together/app"));
const Teachback = lazy(() => import("./teachback"));
const MindLab = import.meta.env.DEV ? lazy(() => import("./mind/MindLab")) : null;
const TITLES: Record<string, string> = {
  "/": "Trust People. And They Become Trustworthy.",
  "/learn": "Raise Capital In A Whole New Way.",
  "/guide": "Wave Guides",
  "/guide/library": "The Wave Guide Library",
  "/give": "Give Together",
  "/give/profile": "Give Profile",
  "/give/guide": "Find Your Give Guide",
  "/give/opportunities": "Join Or Build a Wave Together",
  "/give/opportunities/new": "Post An Opportunity",
  "/give/record": "Your Record",
  "/give/privacy": "Privacy & Safety",
  "/give/sign-in": "Give Together",
  "/give/join": "Give Together",
  "/guide/teachback": "The Teachback",
  "/grow": "Grow",
  "/waves": "Waves In Motion",
  "/projects": "Waves In Motion",
  "/now-lets-begin": "Now, Let’s Begin",
  "/apply": "What’s Your Vision?",
  "/guide/apply": "Become A Wave Guide",
  "/contribute": "Give Your Time & Knowledge",
  "/guide/team": "The Waves Fund Team",
  "/guide/partners": "Partners",
  "/guide/partners/green-reef": "The Green Reef Foundation",
  "/guide/partners/green-reef/proposal": "Students Funding Aquatic Futures",
  "/guide/partners/semble": "Semble.CC",
  "/guide/partners/ocean97": "Ocean97.Com",
  "/privacy": "Privacy & Participation",
  "/team/review": "Team Review",
  "/trax": "Trax",
  "/workspace": "Your Workspace",
};
function ScreenPosition() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const last = pathname.split("/").filter(Boolean).pop()?.replaceAll("-", " ") || "";
    const within = pathname.startsWith("/give/with/") ? "Your Give Guide" : pathname.startsWith("/give/wave/") ? "Shared Wave" : pathname.startsWith("/give/") ? "Give Together" : "";
    const title = TITLES[pathname] || within || (last ? last[0].toUpperCase() + last.slice(1) : TITLES["/"]);
    document.title = `Waves.Fund — ${title}`;
  }, [pathname]);
  return null;
}
function Projects() {
  const { projects, loading, error, refresh } = useCommunity();
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<Project | null>(null);
  const filtered = projects.filter((p) =>
    (p.title + " " + p.category + " " + p.description)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="document-page">
      <Intro
        eyebrow="STUDENT DRIVEN PROJECTS"
        mind="ocean"
        title={
          <>
            Waves
            <br />
            <span>In Motion</span>
          </>
        }
      >
        <p>
          Explore approved Wave projects in community review. Learn about the
          work and add your voice.
        </p>
      </Intro>
      <div className="projects-toolbar">
        <label className="search-field">
          <Search size={20} />
          <input
            type="search"
            aria-label="Search Projects"
            placeholder="Search projects or focus areas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <ButtonLink to="/apply">Submit A Project</ButtonLink>
      </div>
      {loading ? (
        <p className="panel">Loading projects…</p>
      ) : error ? (
        <div className="panel error-message" role="alert">
          {error}
          <button onClick={refresh}>Try Again</button>
        </div>
      ) : !filtered.length ? (
        <section className="panel empty-state">
          <Graphic className="empty-wave" page="home" box="327 48 280 154" />
          <h2>
            {query ? "No Matching Projects" : "Raise Waves."}
          </h2>
          <p>
            {query
              ? "Try a different project or focus area."
              : "Project submissions are open. The first reviewed projects will appear here, with their budgets, milestones, and learner support."}
          </p>
          {query ? (
            <button className="text-button" onClick={() => setQuery("")}>
              Clear Search
            </button>
          ) : (
            <ButtonLink to="/apply">Bring Your Vision</ButtonLink>
          )}
        </section>
      ) : (
        <div className="project-grid">
          {filtered.map((p) => (
            // Every Wave is a mass in the field: the grid gathers around it as you reach it.
            <article className="panel wave-card" key={p.id}>
              <MindAnchor name="vision" className="wave-card-mass" />
              <p className="eyebrow">{p.category}</p>
              <h2>{p.title}</h2>
              <p className="wave-card-story">{p.description}</p>
              <div className="wave-card-signals" aria-label={`${p.signals} learner support signals`}>
                <span className="signal-dots" aria-hidden="true">
                  {Array.from({ length: 11 }, (_, i) => <i key={i} className={i < p.signals ? "lit" : ""} />)}
                </span>
                <span>{p.signals} Learner Signals</span>
              </div>
              <div className="wave-card-foot">
                <span><strong>${p.budget.toLocaleString()}</strong> Requested</span>
                <button className="glow-button" onClick={(e) => { setSelected(p); mindWave(e.currentTarget, 1); }}>
                  Explore This Wave <ArrowRight size={17} />
                </button>
              </div>
              {/* The Wave's stock: as full as its learner signals are toward the next milestone of 11. */}
              <Stock level={Math.min(0.92, 0.06 + (Math.min(p.signals, 11) / 11) * 0.86)} />
            </article>
          ))}
          <article className="panel wave-card wave-card-next">
            <MindAnchor name="seed" className="wave-card-mass" />
            <p className="eyebrow">WAVES.FUND</p>
            <h2>What’s Your <span>Vision?</span></h2>
            <p className="wave-card-story">Raise Capital In A Whole New Way. Raise Waves.</p>
            <div className="wave-card-foot">
              <ButtonLink to="/apply">Bring Your Vision</ButtonLink>
            </div>
            <Stock level={0.04} />
          </article>
        </div>
      )}
      <p className="fine-print">
        Published projects are in community review. Funding is not guaranteed.
        Student support signals inform the team’s work; they are not grant
        awards.
      </p>
      {selected && (
        <ProjectDetail
          project={projects.find((p) => p.id === selected.id) || selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
function ProjectDetail({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const { refresh } = useCommunity();
  const [learner, setLearner] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [supported, setSupported] = useState(project.supported || false);
  return (
    <Sheet title={project.title} onClose={onClose}>
      <p className="eyebrow">{project.category}</p>
      <p>{project.description}</p>
      <div className="project-detail-budget">
        <span>Requested Budget</span>
        <strong>${project.budget.toLocaleString()}</strong>
      </div>
      <h3>First Milestone</h3>
      <p>{project.milestone}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const r = await api("vote", {
              id: project.id,
              learner: true,
              withdraw: supported,
            });
            setSupported(r.supported);
            refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {!supported && (
          <label className="checkbox">
            <input
              required
              type="checkbox"
              checked={learner}
              onChange={(e) => setLearner(e.target.checked)}
            />
            <span>I Am A Student Or Lifelong Learner.</span>
          </label>
        )}
        <ActionButton type="submit" disabled={busy}>
          {busy
            ? "Saving…"
            : supported
              ? "Withdraw Support"
              : "Support This Project"}
        </ActionButton>
      </form>
      <p className="fine-print">
        One active signal per project per browser. Advisory support, not an
        identity-verified ballot or a funding commitment.
      </p>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <ButtonLink to="/give" secondary>
        Give Time Or Funding
      </ButtonLink>
    </Sheet>
  );
}
function Grow() {
  const { projects, guides, loading, error, refresh } = useCommunity();
  const { motion } = useStateStore();
  return (
    <div className="grow-page document-page">
      <Intro
        eyebrow="GROW"
        title={
          <>
            When Humanity
            <br />
            Builds Together,
            <br />
            <span>We Change The World.</span>
          </>
        }
      >
        <p>Measure what moves.</p>
      </Intro>
      <section className="grow-content" data-mind="rise">
        <div className="growth-stats">
          <Vessel label="Projects In Community Review" value={loading || error ? null : projects.length} hue="cy" still={!motion} />
          <Vessel label="Accepted Wave Guides" value={loading || error ? null : guides} hue="bl" still={!motion} />
          <Vessel label="Learner Support Signals" value={loading || error ? null : projects.reduce((a, p) => a + p.signals, 0)} hue="vi" still={!motion} />
        </div>
        {error && (
          <p className="error-message" role="alert">
            Live totals are unavailable.{" "}
            <button onClick={refresh}>Try Again</button>
          </p>
        )}
        <p className="fine-print">
          Live platform activity. Donation totals are reported by the receiving
          foundation and are not inferred from link visits.
        </p>
        <ReceiptTracker />
        <section className="panel next-round">
          <p className="eyebrow">THE NEXT CHAPTER</p>
          <h2>Students Funding The Future</h2>
          <p>
            The first Green Reef pilot is a proposal for discussion. No grant
            round or award budget has been announced.
          </p>
          <div className="button-row">
            <ButtonLink to="/guide/partners/green-reef/proposal">
              Read The Pilot Proposal
            </ButtonLink>
            <ButtonLink to="/waves" secondary>
              Explore Waves
            </ButtonLink>
          </div>
        </section>
      </section>
    </div>
  );
}
function NotFound() {
  return (
    <div className="narrow-page">
      <Intro eyebrow="WAVES.FUND" title="This Page Has Moved." mind="noise" />
      <ButtonLink to="/">What’s Your Vision?</ButtonLink>
    </div>
  );
}
function AppContent() {
  const { pathname } = useLocation();
  return (
    <>
      <a className="skip-link" href="#content">
        Skip To Content
      </a>
      <Background />
      <WaveMind />
      <TraxCollector />
      <div
        className={"app-shell " + (pathname === "/" ? "route-home" : pathname === "/grow" ? "route-grow" : pathname === "/waves" || pathname === "/projects" ? "route-waves route-reading" : "route-reading")}
      >
        <Header />
        <MemberBoundary><main id="content" key={pathname}>
          <Suspense fallback={<div className="narrow-page" role="status">Opening your Wave…</div>}><Routes>
            <Route path="/" element={<Home />} />
            <Route path="/now-lets-begin" element={<Suspense fallback={<div className="narrow-page" role="status">Opening the Wave Praxis…</div>}><Begin /></Suspense>} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/guide" element={<GuidePitch />} />
            <Route path="/guide/library" element={<GuideLibrary />} />
            <Route path="/guide/library/:slug" element={<GuideLesson />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/workspace/:id" element={<Workspace />} />
            <Route path="/sign-in/*" element={<MemberSignIn />} />
            <Route path="/sign-up/*" element={<MemberSignIn signup />} />
            <Route path="/guide/apply" element={<Application kind="guide" />} />
            <Route path="/guide/team" element={<Team />} />
            <Route path="/guide/partners" element={<Partners />} />
            <Route path="/guide/partners/green-reef" element={<GreenReef />} />
            <Route
              path="/guide/partners/green-reef/proposal"
              element={<Proposal />}
            />
            <Route path="/guide/partners/semble" element={<SemblePartner />} />
            <Route path="/guide/partners/ocean97" element={<OceanPartner />} />
            <Route path="/give" element={<Give />} />
            <Route path="/give/*" element={<GiveApp />} />
            <Route path="/guide/teachback" element={<Teachback />} />
            <Route path="/grow" element={<Grow />} />
            <Route path="/apply" element={<Application />} />
            <Route
              path="/contribute"
              element={<Application kind="support" />}
            />
            <Route path="/projects" element={<Projects />} />
            <Route path="/waves" element={<Projects />} />
            <Route path="/waves/:slug" element={<PublicWave />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/team/review" element={<TeamReview />} />
            <Route path="/trax" element={<Trax />} />
            <Route
              path="/partners"
              element={<Navigate to="/guide/partners" replace />}
            />
            <Route
              path="/proposal"
              element={
                <Navigate to="/guide/partners/green-reef/proposal" replace />
              }
            />
            <Route
              path="/network"
              element={<Navigate to="/projects" replace />}
            />
            {MindLab && <Route path="/mind-lab" element={<MindLab />} />}
            <Route path="*" element={<NotFound />} />
          </Routes></Suspense>
        </main></MemberBoundary>
        <Footer />
        <BottomNav />
        <Status />
        <ScreenPosition />
        <FlowNavigation />
        <Current />
      </div>
    </>
  );
}
export default function App() {
  return (
    <CommunityProvider>
      <AppContent />
    </CommunityProvider>
  );
}

