import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Download,
  RefreshCw,
  LockKeyhole,
} from "lucide-react";
import { api, download, getReceipts, saveReceipt, WAVE_TYPES, waveTypeLabel } from "./community";
import type { Receipt, WaveType } from "./community";
import { ActionButton, ButtonLink, CONTACT, Intro } from "./ui";
import { useStateStore } from "./state";
import { MindAnchor, mindGrow, mindWave } from "./mind/WaveMind";
import { GiveReview } from "./together/team";
export function Application({
  kind = "project",
}: {
  kind?: "project" | "guide" | "support";
}) {
  const { state } = useStateStore();
  const [params] = useSearchParams();
  const [waveType, setWaveType] = useState<WaveType | "">(() =>
    kind === "project" ? WAVE_TYPES.find(type => type.id === params.get("waveType"))?.id || "" : "",
  );
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [title, setTitle] = useState(
      kind === "guide"
        ? "Wave Guide Application"
        : kind === "support"
          ? (params.get("type") || "Time") + " Contribution"
          : "",
    ),
    [description, setDescription] = useState(
      kind === "project" ? state.vision : "",
    ),
    [budget, setBudget] = useState(""),
    [category, setCategory] = useState("Aquatic Food Systems"),
    [milestone, setMilestone] = useState(""),
    [availability, setAvailability] = useState(""),
    [learner, setLearner] = useState(false),
    [consent, setConsent] = useState(false),
    [publicConsent, setPublicConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<Receipt | null>(null);
  const [ids] = useState(() => ({
    id: crypto.randomUUID(),
    receipt: crypto.randomUUID() + crypto.randomUUID(),
  }));
  // The Seed grows as each required part of the application is filled in.
  useEffect(() => {
    const parts = [name.trim(), /^\S+@\S+\.\S+$/.test(email.trim()), title.trim(), description.trim().length >= 20, kind === "project" ? milestone.trim() : availability.trim(), learner, consent];
    mindGrow(0.1 + (0.9 * parts.filter(Boolean).length) / parts.length);
  }, [kind, name, email, title, description, milestone, availability, learner, consent]);
  useEffect(() => () => mindGrow(1), []);
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await api("submit", {
        ...ids,
        kind,
        name,
        email,
        title,
        description,
        budget,
        category,
        milestone,
        availability,
        learner,
        consent,
        publicConsent,
        ...(kind === "project" && waveType ? { waveType } : {}),
        website: new FormData(form).get("website"),
      });
      const r: Receipt = { ...ids, title, kind, ...(kind === "project" && waveType ? { waveType } : {}) };
      saveReceipt(r);
      setReceipt(r);
      mindGrow(1);
      mindWave(form, 1.6);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (receipt)
    return (
      <div className="narrow-page">
        <section className="receipt-panel panel">
          <MindAnchor name="seed" className="receipt-mind" />
          <Check size={40} />
          <p className="eyebrow">APPLICATION RECEIVED</p>
          <h1>
            Thank You,
            <br />
            {name.split(" ")[0]}.
          </h1>
          <p>
            Your{" "}
            {kind === "guide"
              ? "Wave Guide application"
              : kind === "project"
                ? "project"
                : "offer of support"}{" "}
            has been saved for the Waves.Fund team to review.
          </p>
          <p className="fine-print">
            A submission is not an award or acceptance. Keep your receipt to
            check its status.
          </p>
          {waveTypeLabel(receipt.waveType) && <p>Starting model: <strong>{waveTypeLabel(receipt.waveType)}</strong></p>}
          <div className="receipt-id">{receipt.id}</div>
          <button
            className="glow-button"
            onClick={() => download("waves-fund-receipt.json", receipt)}
          >
            Download Receipt <Download size={18} />
          </button>
          <ButtonLink to="/grow" secondary>
            Track My Application
          </ButtonLink>
        </section>
      </div>
    );
  return (
    <div className="narrow-page application-page">
      <Intro
        mind="seed"
        eyebrow={
          kind === "guide"
            ? "WAVE GUIDES"
            : kind === "support"
              ? "GIVE"
              : "PROJECT APPLICATION"
        }
        title={
          kind === "guide" ? (
            <>
              Become A<br />
              <span>Wave Guide.</span>
            </>
          ) : kind === "support" ? (
            <>
              Give Your
              <br />
              <span>Time & Knowledge.</span>
            </>
          ) : (
            <>
              What’s Your
              <br />
              <span>Vision?</span>
            </>
          )
        }
      >
        <p>
          {kind === "project"
            ? "Funding For Lifelong Learners And Leaders"
            : "Built For All Lifelong Learners And Leaders Building Waves For Humanity"}
        </p>
      </Intro>
      <form className="application-form panel" onSubmit={submit}>
        <div className="form-pair">
          <label>
            Your Name
            <input
              required
              autoComplete="name"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>
        {kind === "project" && (
          <>
            <label>
              Starting Wave Model (Optional)
              <select
                value={waveType}
                onChange={(event) => setWaveType(WAVE_TYPES.find(type => type.id === event.target.value)?.id || "")}
                aria-describedby="wave-model-help"
              >
                <option value="">Explore this with my Guide</option>
                {WAVE_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
            </label>
            <p id="wave-model-help" className="fine-print">A starting point for your own Wave. Your Guide will shape it with you, and it can change as your mission grows.</p>
            <label>
              Project Name
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div className="form-pair">
              <label>
                Focus
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>Aquatic Food Systems</option>
                  <option>Education & Learning</option>
                  <option>Community Opportunity</option>
                  <option>Regenerative Systems</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Funding Requested (USD)
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  required
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </label>
            </div>
          </>
        )}
        <label>
          {kind === "project"
            ? "Your Vision & Who It Serves"
            : kind === "guide"
              ? "What Are You Learning, And What Can You Share?"
              : "How Would You Like To Contribute?"}
          <textarea
            required
            minLength={20}
            maxLength={2500}
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <small>{description.length}/2500</small>
        </label>
        {kind === "project" ? (
          <label>
            Your First Milestone
            <textarea
              required
              maxLength={700}
              rows={3}
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              placeholder="What will you deliver, by when, and how will you show it?"
            />
          </label>
        ) : (
          <label>
            Availability & Areas Of Experience
            <input
              required
              maxLength={300}
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="Time you can offer and the work you know"
            />
          </label>
        )}
        <div className="form-trap" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            required
            checked={learner}
            onChange={(e) => setLearner(e.target.checked)}
          />
          <span>I Am A Student Or Lifelong Learner.</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            I agree to share this application and my contact details privately
            with the Waves.Fund team for review. I have read the{" "}
            <Link to="/privacy" target="_blank">
              privacy and participation information
            </Link>
            .
          </span>
        </label>
        {kind === "project" && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={publicConsent}
              onChange={(e) => setPublicConsent(e.target.checked)}
            />
            <span>
              If approved for community review, the team may publish my project
              name, description, category, chosen Wave model, requested budget, and milestone. My
              name and email stay private.
            </span>
          </label>
        )}
        <p className="fine-print">
          {kind === "project"
            ? "Submissions are open for review. No grant awards or funding round have been announced."
            : "Applications are reviewed for fit and availability. A role is confirmed only after the team contacts you."}
        </p>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <ActionButton type="submit" disabled={busy}>
          {busy
            ? "Sending…"
            : kind === "guide"
              ? "Submit Application"
              : kind === "support"
                ? "Offer Support"
                : "Submit Project"}
        </ActionButton>
        <p className="form-contact">
          Questions? <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
      </form>
    </div>
  );
}
export function ReceiptTracker() {
  const [receipts, setReceipts] = useState(getReceipts),
    [statuses, setStatuses] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  async function check(r: Receipt) {
    setBusy(r.id);
    setError("");
    try {
      const result = await api("status", r);
      setStatuses((s) => ({ ...s, [r.id]: result.status }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="section panel receipt-tracker">
      <p className="eyebrow">YOUR APPLICATIONS</p>
      <h2>Follow Your Next Move</h2>
      {!receipts.length ? (
        <p>
          Your application receipts will appear here after you submit a project,
          a Wave Guide application, or an offer of support.
        </p>
      ) : (
        receipts.map((r) => (
          <div className="receipt-row" key={r.id}>
            <div>
              <strong>{r.title}</strong>
              {waveTypeLabel(r.waveType) && <span>{waveTypeLabel(r.waveType)}</span>}
              <span>{statuses[r.id] || "Receipt Saved"}</span>
            </div>
            <button
              className="text-button"
              disabled={busy === r.id}
              onClick={() => check(r)}
            >
              {busy === r.id ? "Checking…" : "Check Status"}
              <RefreshCw size={16} />
            </button>
            <button
              className="icon-button"
              aria-label={"Download Receipt For " + r.title}
              onClick={() => download("waves-fund-receipt.json", r)}
            >
              <Download size={17} />
            </button>
          </div>
        ))
      )}
      <label className="import-receipt">
        Restore A Downloaded Receipt
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            try {
              const f = e.target.files?.[0];
              if (!f || f.size > 10000)
                throw Error("Choose a receipt JSON file.");
              const r = JSON.parse(await f.text());
              if (
                !/^[a-f0-9-]{36}$/.test(r.id || "") ||
                !/^[a-f0-9-]{72}$/.test(r.receipt || "")
              )
                throw Error("This receipt is not valid.");
              saveReceipt({
                ...r,
                title: String(r.title || "Application").slice(0, 120),
                kind: String(r.kind || "project"),
              });
              setReceipts(getReceipts());
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </label>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
type Review = {
  id: string;
  kind: string;
  name: string;
  email: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  milestone: string;
  availability: string;
  status: string;
  publicConsent: boolean;
  created: string;
  waveType?: WaveType;
};
export function TeamReview() {
  const [key, setKey] = useState(""),
    [signed, setSigned] = useState(false),
    [applications, setApplications] = useState<Review[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState("All");
  async function load() {
    const data = await api("admin");
    setApplications(data.applications);
    setSigned(true);
  }
  async function login(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("login", { key });
      setKey("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function review(id: string, status: string) {
    setBusy(true);
    setError("");
    try {
      await api("review", { id, status });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="document-page">
      <Intro
        eyebrow="PRIVATE TEAM ACCESS"
        title={
          <>
            Application
            <br />
            <span>Review</span>
          </>
        }
      />
      {!signed ? (
        <form className="panel admin-login" onSubmit={login}>
          <LockKeyhole size={28} />
          <label>
            Team Key
            <input
              required
              type="password"
              value={key}
              autoComplete="current-password"
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <ActionButton type="submit" disabled={busy}>
            {busy ? "Signing In…" : "Sign In"}
          </ActionButton>
          <p className="fine-print">
            Private applicant information. Use the team key provided to the
            project owner.
          </p>
        </form>
      ) : (
        <>
          <div className="admin-tools">
            <label>
              Show
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option>All</option>
                <option value="project">Projects</option>
                <option value="guide">Wave Guides</option>
                <option value="support">Support</option>
              </select>
            </label>
            <button
              className="text-button"
              onClick={() => load().catch((e) => setError(e.message))}
            >
              Refresh <RefreshCw size={16} />
            </button>
            <button
              className="text-button"
              onClick={() =>
                download("waves-applications-private.json", applications)
              }
            >
              Export Privately <Download size={16} />
            </button>
            <button
              className="text-button"
              onClick={async () => {
                await api("logout", {});
                setSigned(false);
                setApplications([]);
              }}
            >
              Sign Out
            </button>
          </div>
          {!applications.length && (
            <div className="panel empty-state">
              <h2>No Applications Yet</h2>
              <p>New submissions will appear here.</p>
            </div>
          )}
          {applications
            .filter((a) => filter === "All" || a.kind === filter)
            .map((a) => (
              <article className="panel review-card" key={a.id}>
                <div className="row-heading">
                  <p className="eyebrow">{a.kind}</p>
                  <span className="status-chip">{a.status}</span>
                </div>
                <h2>{a.title}</h2>
                <p>{a.description}</p>
                <dl>
                  <div>
                    <dt>Applicant</dt>
                    <dd>
                      {a.name} · <a href={"mailto:" + a.email}>{a.email}</a>
                    </dd>
                  </div>
                  <div>
                    <dt>Received</dt>
                    <dd>{new Date(a.created).toLocaleDateString()}</dd>
                  </div>
                  {a.kind === "project" ? (
                    <>
                      <div>
                        <dt>Budget</dt>
                        <dd>${a.budget.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt>Focus</dt>
                        <dd>{a.category}</dd>
                      </div>
                      <div>
                        <dt>Starting Wave Model</dt>
                        <dd>{waveTypeLabel(a.waveType) || "Explore with the builder"}</dd>
                      </div>
                      <div>
                        <dt>Milestone</dt>
                        <dd>{a.milestone}</dd>
                      </div>
                      <div>
                        <dt>Publication Consent</dt>
                        <dd>
                          {a.publicConsent
                            ? "Yes — project details only"
                            : "No"}
                        </dd>
                      </div>
                    </>
                  ) : (
                    <div>
                      <dt>Availability</dt>
                      <dd>{a.availability}</dd>
                    </div>
                  )}
                </dl>
                <label>
                  Review Status
                  <select
                    value={a.status}
                    disabled={busy}
                    onChange={(e) => review(a.id, e.target.value)}
                  >
                    <option>Received</option>
                    <option>In Review</option>
                    <option>More Information Needed</option>
                    {a.kind === "project" && a.publicConsent && (
                      <option>Approved For Community Review</option>
                    )}
                    {a.kind === "guide" && <option>Guide Accepted</option>}
                    <option>Not Selected</option>
                  </select>
                </label>
                <p className="fine-print">
                  Contact the applicant using the email above. Status changes do
                  not send email automatically. Publishing shares only the
                  consented project fields.
                </p>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        "Permanently remove this application and its public project, if published?",
                      )
                    )
                      return;
                    setBusy(true);
                    setError("");
                    try {
                      await api("delete", { id: a.id });
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Delete Application
                </button>
              </article>
            ))}
        </>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {signed && <GiveReview />}
    </div>
  );
}
export function Privacy() {
  return (
    <div className="narrow-page legal-page">
      <Intro
        eyebrow="WAVES.FUND"
        mind="still"
        title={
          <>
            Privacy &<br />
            <span>Participation</span>
          </>
        }
      />
      <section className="panel prose">
        <h2>What You Share</h2>
        <p>
          Applications include your name, email, project or experience details,
          learner self-identification, and your consent choices. These are
          stored privately for the Waves.Fund team to review. Do not submit
          sensitive personal information or details about other people without
          permission.
        </p>
        <h2>What Becomes Public</h2>
        <p>
          A project is public only after team review and publication consent.
          Its title, description, category, chosen Wave model, requested budget, and milestone may
          be shown. Your applicant name and email are not included in the public
          project feed. Guide applications remain private.
        </p>
        <h2>Your Device & Receipts</h2>
        <p>
          Your draft vision, animation preference, and application receipts may
          be saved on your device. A receipt is a private access code for
          checking application status. Keep it secure. Clearing browser storage
          removes locally saved receipts; a downloaded copy can be restored.
        </p>
        <h2>Community Participation</h2>
        <p>
          Students and lifelong learners self-identify. Current project support
          signals are advisory, with one active signal per project per browser.
          They are not identity-verified ballots and do not determine grant
          awards. Formal voting rounds will require published rules and
          participation verification before launch.
        </p>
        <h2>Site Activity</h2>
        <p>
          We measure anonymous page views and active, visible reading time to improve the experience. We do not collect form values, query strings, referrers, or persistent visitor identifiers for analytics. Do Not Track and Global Privacy Control preferences are respected. Activity records are combined into daily totals after their day is more than 48 hours old, when the team refreshes its dashboard. Anonymous submission counts can remain after an application is removed.
        </p>
        <h2>Giving</h2>
        <p>
          Financial donations continue to the Green Reef Foundation’s Benevity
          page. That external service handles its donation process, records,
          terms, and any receipts. Waves.Fund does not collect card information
          or automatically verify those donations. A contribution through that
          link is not a project-specific grant commitment.
        </p>
        <h2>Give Together</h2>
        <p>
          Give Together is for adults and uses a Waves.Fund account. Your Give
          Profile holds the name you choose, your answers, an optional town and
          an approximate point rounded to about 10 km, and your statement.
          People you match with see only what you choose to share, and never
          your email or exact location. Messages open only after both people
          accept. Time you log and Gratus are visible to you and the Give
          Guide you gave with; your record is visible only to you. Notes you
          add to a logged day stay private. Hours are peer-confirmed, not verified
          by a host organization. Reports go to the Waves.Fund team. You can
          pause matching or delete your Give Profile at any time from Privacy
          & Safety inside Give Together.
        </p>
        <h2>Access & Retention</h2>
        <p>
          Private submissions are accessible to authorized team members and the
          hosting provider as needed to operate the service. Records are kept
          for review and follow-up. Request access, correction, removal, or
          withdrawal of publication consent at{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Withdrawing a project
          from public review also removes it from the public feed.
        </p>
        <h2>Contact</h2>
        <p>
          Partnerships, impact investment, and privacy requests:{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
        <Link className="text-button" to="/learn">
          Our Vision <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
