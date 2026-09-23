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
  Users,
  FileText,
  BookOpen,
  Check,
  Copy,
} from "lucide-react";
import {
  ActionButton,
  Background,
  BottomNav,
  ButtonLink,
  CONTACT,
  DONATE,
  External,
  Footer,
  Graphic,
  Header,
  Intro,
  Sheet,
  Status,
} from "./ui";
import { Home } from "./home";
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
function ScreenPosition() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const title =
      pathname === "/"
        ? "Trust People"
        : pathname.split("/").filter(Boolean).pop()?.replaceAll("-", " ") ||
          "Trust People";
    document.title = `Waves.Fund — ${title[0].toUpperCase() + title.slice(1)}`;
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
            {query ? "No Matching Projects" : "Students Funding The Future"}
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
            <button
              className="panel project-card"
              key={p.id}
              onClick={() => setSelected(p)}
            >
              <p className="eyebrow">{p.category}</p>
              <h2>{p.title}</h2>
              <p>
                {p.description.slice(0, 200)}
                {p.description.length > 200 ? "…" : ""}
              </p>
              <div className="project-meta">
                <span>${p.budget.toLocaleString()} Requested</span>
                <span>{p.signals} Learner Signals</span>
              </div>
              <span className="text-button">
                Explore Project <ArrowRight size={17} />
              </span>
            </button>
          ))}
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
function Give() {
  const [kind, setKind] = useState("Funding"),
    [copied, setCopied] = useState(false);
  async function share() {
    try {
      await navigator.clipboard.writeText("https://waves.fund");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="give-page document-page">
      <Intro
        eyebrow="GIVE"
        title={
          <>
            Funding The
            <br />
            <span>Future Together</span>
          </>
        }
      >
        <p>Direct energy with intention.</p>
      </Intro>
      <div className="give-layout">
        <div className="give-orbit">
          <Graphic page="give" box="112 482 720 611" />
          {["Time", "Mentorship", "Funding", "Signal"].map((k) => (
            <button
              key={k}
              className={
                "orbit-choice choice-" +
                k.toLowerCase() +
                (kind === k ? " selected" : "")
              }
              aria-label={k}
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k);
                setCopied(false);
              }}
            />
          ))}
        </div>
        <section className="panel contribution-panel">
          <p className="eyebrow">{kind}</p>
          <h2>Support This Vision</h2>
          {kind === "Funding" ? (
            <>
              <p>
                Give directly to The Green Reef Foundation through its Benevity
                donation page.
              </p>
              <img
                className="giving-logo"
                src="/media/green-reef-logo.webp"
                alt="The Green Reef Foundation"
              />
              <External href={DONATE} className="glow-button">
                Give To Green Reef
              </External>
              <p className="fine-print">
                You will continue to Benevity. The Foundation and its giving
                provider handle your donation and receipt. This supports the
                Foundation’s mission; project-specific awards require a separate
                agreement.
              </p>
            </>
          ) : kind === "Signal" ? (
            <>
              <p>When Humanity Builds Together, We Change The World.</p>
              <button className="glow-button" onClick={share}>
                {copied ? "Link Copied" : "Copy Waves.Fund Link"}
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
              <a className="share-address" href="https://waves.fund">
                waves.fund
              </a>
            </>
          ) : (
            <>
              <p>
                {kind === "Time"
                  ? "Bring your time, attention, and practical support to work that matters."
                  : "Share what you know. Learn alongside builders. Help a project move forward."}
              </p>
              <ButtonLink
                to={
                  kind === "Mentorship"
                    ? "/guide/apply"
                    : "/contribute?type=Time"
                }
              >
                {kind === "Mentorship"
                  ? "Become A Wave Guide"
                  : "Offer Your Time"}
              </ButtonLink>
              <p className="fine-print">
                Tell the team what you can offer and when. They will review your
                submission and contact you about a match.
              </p>
            </>
          )}
        </section>
      </div>
      <section className="section contact-strip">
        <div>
          <p className="eyebrow">PARTNERSHIPS & IMPACT INVESTMENT</p>
          <h2>Funding For Futures.</h2>
        </div>
        <a className="text-button" href={`mailto:${CONTACT}`}>
          {CONTACT}
          <ArrowRight size={17} />
        </a>
      </section>
    </div>
  );
}
function Grow() {
  const { projects, guides, loading, error, refresh } = useCommunity();
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
      <section className="grow-content">
        <div className="growth-stats">
          {[
            {
              name: "Projects In Community Review",
              value: projects.length,
              Icon: FileText,
            },
            { name: "Accepted Wave Guides", value: guides, Icon: BookOpen },
            {
              name: "Learner Support Signals",
              value: projects.reduce((a, p) => a + p.signals, 0),
              Icon: Users,
            },
          ].map(({ name, value, Icon }) => (
            <article className="panel stat-card" key={name}>
              <Icon size={23} />
              <strong>{loading || error ? "—" : value}</strong>
              <span>{name}</span>
            </article>
          ))}
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
      <Intro eyebrow="WAVES.FUND" title="This Page Has Moved." />
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
      <TraxCollector />
      <div
        className={"app-shell " + (pathname === "/" ? "route-home" : pathname === "/grow" ? "route-grow" : pathname === "/waves" || pathname === "/projects" ? "route-waves route-reading" : "route-reading")}
      >
        <Header />
        <main id="content" key={pathname}>
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
            <Route path="*" element={<NotFound />} />
          </Routes></Suspense>
        </main>
        <Footer />
        <BottomNav />
        <Status />
        <ScreenPosition />
        <FlowNavigation />
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

