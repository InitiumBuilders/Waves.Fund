import { useEffect, useRef, useState, useId } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Pause,
  Play,
  ArrowRight,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { useStateStore } from "./state";
import { MindAnchor, mindWave } from "./mind/WaveMind";
import type { FieldMode } from "./mind/modes";
export const CONTACT = "August@Outlier.Systems";
export const DONATE =
  "https://mygoodness.benevity.org/community/cause/840-208508676/donate";
export function Graphic({
  page,
  box,
  className = "",
}: {
  page: string;
  box: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox={box}
      aria-hidden="true"
      focusable="false"
    >
      <image href={`/media/${page}-reference.webp`} width="941" height="1672" />
    </svg>
  );
}
export function WaveMark({ className = "" }: { className?: string }) {
  return (
    <Graphic
      className={"wave-mark " + className}
      page="home"
      box="327 48 280 154"
    />
  );
}
export function Semble({ className = "" }: { className?: string }) {
  return (
    <span className={"semble-brand " + className}>
      <img src="/media/semble-logo.webp" alt="" />
      Semble.CC
    </span>
  );
}
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Waves.Fund home">
      <WaveMark />
      <span>
        Waves<span className="fund-word">.Fund</span>
      </span>
    </Link>
  );
}
export function Background() {
  const ref = useRef<HTMLVideoElement>(null);
  const { motion } = useStateStore();
  const { pathname } = useLocation();
  const [wide, setWide] = useState(
    () => matchMedia("(min-width:800px)").matches,
  );
  useEffect(() => {
    const m = matchMedia("(min-width:800px)");
    const update = () => setWide(m.matches);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  const grow = pathname.toLowerCase().startsWith("/grow");
  const base = grow
    ? wide
      ? "grow-desktop"
      : "grow-mobile"
    : wide
      ? "desktop-neural"
      : "neural-base";
  const poster = base === "neural-base" ? "neural-still" : base;
  const lightVideo = { "neural-base": "neural-mobile-light", "desktop-neural": "neural-wide-light", "grow-mobile": "grow-mobile-light", "grow-desktop": "grow-wide-light" }[base];
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const update = () => {
      if (motion && !document.hidden) v.play().catch(() => {});
      else v.pause();
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [motion, base]);
  // The dot field is the whole site's ground. Grow keeps its supplied whale film.
  if (!grow) return null;
  return (
    <div
      className={`neural-background ${grow ? "whale-background" : ""}`}
      aria-hidden="true"
    >
      <video
        key={base}
        ref={ref}
        src={`/media/${lightVideo}.mp4`}
        poster={`/media/${poster}.webp`}
        muted
        playsInline
        loop
        preload="metadata"
      />
      <div className="neural-shade" />
    </div>
  );
}
const tabs = [
  { path: "/learn", label: "Learn", image: "nav-learn.png" },
  { path: "/guide", label: "Guide", image: "nav-guide.png" },
  { path: "/give", label: "Give", image: "nav-give.png" },
];
function GrowTab() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const release = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opened = useRef(false);
  const [holding, setHolding] = useState(false);
  const [opening, setOpening] = useState(false);
  const waves = pathname === "/waves" || pathname === "/projects";
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (release.current) clearTimeout(release.current);
  }, []);
  return (
    <NavLink
      to={waves ? "/waves" : "/grow"}
      aria-label={waves ? "Waves: approved projects" : "Grow. Press and hold to open Waves"}
      title={waves ? "Approved Waves" : "Hold to open Waves"}
      className={"nav-item nav-grow " + (waves || pathname === "/grow" ? "active " : "") + (holding ? "holding " : "") + (opening ? "waves-opening" : "")}
      onPointerDown={(event) => {
        if (event.button !== 0 || waves) return;
        const tab = event.currentTarget;
        opened.current = false;
        setHolding(true);
        timer.current = setTimeout(() => {
          opened.current = true;
          setHolding(false);
          setOpening(true);
          // Holding Grow opens the approved Waves with one pulse through the whole network.
          mindWave(tab, 1.6);
          navigate("/waves");
          release.current = setTimeout(() => setOpening(false), 1100);
        }, 650);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        if (opened.current) {
          event.preventDefault();
          opened.current = false;
        }
      }}
    >
      <img className="nav-logo" src="/media/nav-waves.png" alt="" />
      <span className="nav-label">{waves ? "Waves" : "Grow"}</span>
    </NavLink>
  );
}
export function TabLinks() {
  return (
    <>
      {tabs.map(({ path, label, image }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) => "nav-item nav-" + label.toLowerCase() + (isActive ? " active" : "")}
        >
          <img className="nav-logo" src={'/media/' + image} alt="" />
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
      <GrowTab />
    </>
  );
}
export function Header() {
  const [open, setOpen] = useState(false);
  const { motion, setMotion } = useStateStore();
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <header className={"app-header " + (pathname === "/" ? "home-header" : "")}>
        <Brand />
        <nav className="desktop-nav" aria-label="Main Navigation">
          <TabLinks />
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label={motion ? "Pause Animation" : "Play Animation"}
            onClick={() => setMotion(!motion)}
          >
            {motion ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            className="icon-button menu-button"
            aria-label="Open Menu"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            <Menu size={23} />
          </button>
        </div>
      </header>
      {open && (
        <Sheet
          title="Waves.Fund"
          onClose={() => setOpen(false)}
          className="menu-sheet"
        >
          <p className="menu-route" aria-label="Learn, Guide, Give, Grow">
            <Link to="/learn" onClick={() => setOpen(false)}>Learn</Link>
            <i aria-hidden="true" />
            <Link to="/guide" onClick={() => setOpen(false)}>Guide</Link>
            <i aria-hidden="true" />
            <Link to="/give" onClick={() => setOpen(false)}>Give</Link>
            <i aria-hidden="true" />
            <Link to="/grow" onClick={() => setOpen(false)}>Grow</Link>
          </p>
          <nav className="menu-links" aria-label="More">
            <Link to="/" onClick={() => setOpen(false)}>
              What’s Your Vision? <ArrowRight />
            </Link>
            <Link to="/learn" onClick={() => setOpen(false)}>
              Our Vision <ArrowRight />
            </Link>
            <Link to="/now-lets-begin" onClick={() => setOpen(false)}>
              Now, Let’s Begin <ArrowRight />
            </Link>
            <Link to="/waves" onClick={() => setOpen(false)}>
              Waves <ArrowRight />
            </Link>
            <Link to="/guide" onClick={() => setOpen(false)}>
              Wave Guides <ArrowRight />
            </Link>
            <Link to="/guide/library" onClick={() => setOpen(false)}>
              Guide Library <ArrowRight />
            </Link>
            <Link to="/workspace" onClick={() => setOpen(false)}>
              Your Workspace <ArrowRight />
            </Link>
            <Link to="/guide/partners" onClick={() => setOpen(false)}>
              Partners <ArrowRight />
            </Link>
            <Link to="/guide/team" onClick={() => setOpen(false)}>
              The Waves Fund Team <ArrowRight />
            </Link>
            <Link to="/apply" onClick={() => setOpen(false)}>
              Submit A Project <ArrowRight />
            </Link>
            <a href={`mailto:${CONTACT}`}>
              Partnerships & Impact Investment <ArrowUpRight />
            </a>
          </nav>
          <p className="menu-mantra">
            Trust People.
            <br />
            And They Become Trustworthy.
          </p>
          <div className="menu-footer">
            <Link to="/privacy" onClick={() => setOpen(false)}>
              Privacy & Participation
            </Link>
            <Link to="/team/review" onClick={() => setOpen(false)}>
              Team Access
            </Link>
            <Link to="/trax" onClick={() => setOpen(false)}>
              Trax
            </Link>
          </div>
        </Sheet>
      )}
    </>
  );
}
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      <TabLinks />
    </nav>
  );
}
export function Sheet({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const old = document.body.style.overflow,
      previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={"sheet " + className}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-inner">
        <button
          className="sheet-close icon-button"
          aria-label="Close"
          onClick={onClose}
        >
          <X />
        </button>
        <h2 id={id}>{title}</h2>
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
export function ActionButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      className={"glow-button " + className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      <ArrowRight size={19} />
    </button>
  );
}
export function ButtonLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link to={to} className={secondary ? "text-button" : "glow-button"}>
      {children}
      <ArrowRight size={18} />
    </Link>
  );
}
export function External({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      className={"external " + className}
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
      <ArrowUpRight size={16} />
    </a>
  );
}
export function Intro({
  eyebrow,
  title,
  children,
  actions,
  mind,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  mind?: FieldMode;
}) {
  const text = (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <div className="intro-description">{children}</div>}
      {actions && <div className="button-row intro-actions">{actions}</div>}
    </>
  );
  if (!mind) return <header className="page-intro">{text}</header>;
  return (
    <header className="page-intro has-mind">
      <div className="intro-text">{text}</div>
      <MindAnchor name={mind} />
    </header>
  );
}
export function Footer() {
  return (
    <footer className="app-footer">
      <p>
        Trust People.
        <br />
        And They Become Trustworthy.
      </p>
      <div>
        <Link to="/now-lets-begin">The Wave Praxis</Link>
        <Link to="/guide/partners">Partners</Link>
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        <Link to="/privacy">Privacy</Link>
      </div>
      <p className="colophon">Waves.Fund · Founded by August James Domanchuk · 2026</p>
    </footer>
  );
}
export function Status() {
  const { message, storageAvailable } = useStateStore();
  return (
    <>
      <div
        className={"status-message " + (message ? "shown" : "")}
        role="status"
      >
        {message && (
          <>
            <Check size={16} />
            {message}
          </>
        )}
      </div>
      {!storageAvailable && (
        <p className="storage-note">
          Device storage is unavailable. Download your receipt to keep it.
        </p>
      )}
    </>
  );
}
