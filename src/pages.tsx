import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Leaf,
  Users,
  BookOpen,
  Waves,
  Check,
  Download,
  ExternalLink,
} from "lucide-react";
import { ButtonLink, CONTACT, External, Intro, Semble, DONATE } from "./ui";
import { download } from "./community";
import { Stock } from "./mind/WaveMind";
import { Growing, Guided, Pair, Travel } from "./symbols";
const reefURL = "https://www.greenreef.org/";
// The Give practice on Learn: two in step, set to the left edge like the other practice waves.
const GivePair = ({ className }: { className?: string }) => <Pair className={className} at={[30, 130]} />;
const briefURL =
  "https://static1.squarespace.com/static/637abcfb5965f80107ee9977/t/63adebde3b35985a05d9d455/1672342495057/Green+Reef+One+Page+Overview+.pdf";
export const partners = [
  {
    id: "green-reef",
    name: "The Green Reef Foundation",
    logo: "green-reef-logo.webp",
    description:
      "Aquatic food systems. Community opportunity. A future worth building together.",
    url: reefURL,
  },
  {
    id: "semble",
    name: "Semble.CC",
    logo: "semble-logo.webp",
    description: "The App To Build In Public!",
    url: "https://semble.cc/the-semble-way",
  },
  {
    id: "ocean97",
    name: "Ocean97.Com",
    logo: "ocean97-logo.webp",
    description:
      "Louisiana seafood, entrepreneurial experience, and a commitment to fishing families.",
    url: "https://www.ocean97.com/",
  },
];
export function PartnerCards() {
  return (
    <div className="partner-grid">
      {partners.map((p) => (
        <Link
          className={"partner-tile panel partner-" + p.id}
          to={"/guide/partners/" + p.id}
          key={p.id}
        >
          <div className="partner-logo-wrap">
            <img src={"/media/" + p.logo} alt={p.name} />
          </div>
          <h3>{p.name}</h3>
          <p>{p.description}</p>
          <span>
            Explore The Partnership <ArrowRight size={17} />
          </span>
        </Link>
      ))}
    </div>
  );
}
export function Learn() {
  return (
    <div className="document-page">
      <Intro
        eyebrow="THE WAVES FUND"
        mind="layers"
        title={
          <>
            Raise Capital
            <br />
            In A Whole
            <br />
            New Way.
            <br />
            <span>Raise Waves.</span>
          </>
        }
      >
        <p>Welcome To The Frontier Of Funding</p>
        <p className="hashtags">#BuildDifferent #BuildAWave</p>
      </Intro>
      {/* The pitch: what Waves.Fund does, in two paragraphs, and the match drawn as three nodes on one guide. */}
      <section className="learn-pitch" aria-labelledby="learn-pitch-title">
        <div>
          <p className="eyebrow">WHAT WAVES.FUND DOES</p>
          <h2 id="learn-pitch-title">We match builders with Wave Guides.</h2>
        </div>
        <div className="learn-pitch-text">
          <p>
            Waves.Fund pairs a project founder with a Wave Guide: a vibe coder who works with you to build your
            own custom Wave. You bring the vision. Your Guide builds it with you.
          </p>
          <p>
            A Wave is a portable digital object. It holds your story, your people and your next move. You can
            move it, pass it along, and grow it as the work grows.
          </p>
        </div>
        <ol className="learn-match" aria-label="How a Wave is made">
          <li><span className="learn-match-node" aria-hidden="true" /><strong>You</strong><span>Project founder</span></li>
          <li><span className="learn-match-node" aria-hidden="true" /><strong>Wave Guide</strong><span>Vibe coder</span></li>
          <li><span className="learn-match-node is-wave" aria-hidden="true" /><strong>Your Wave</strong><span>Move it, pass it along, grow it</span></li>
        </ol>
      </section>
      <section className="mantra-panel panel" data-mind="bond">
        <p className="eyebrow">OUR CORE MANTRA, MISSION & PRACTICE</p>
        <h2>
          Trust People.
          <br />
          <span>And They Become Trustworthy.</span>
        </h2>
        <p>
          Built For All Lifelong Learners And Leaders Building Waves For
          Humanity
        </p>
      </section>
      <section className="section two-columns">
        <div>
          <p className="eyebrow">THE STUDENT DRIVEN MODEL</p>
          <h2>
            Funding For Lifelong
            <br />
            Learners And Leaders
          </h2>
        </div>
        <div className="prose">
          <p>
            The Waves Fund is a social impact crowdfunding platform that is 100%
            student driven. People bring a vision. Students and lifelong
            learners help decide what deserves support. Partners help turn that
            support into work with visible outcomes.
          </p>
          <p>
            You are a student if you are learning in a school, in a program, or
            independently. Participation begins with self-identification.
            Learning belongs to everyone.
          </p>
          <ButtonLink to="/apply">Submit A Project</ButtonLink>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">HOW THE FUND WORKS</p>
          <h2>
            Futures, Founded, Forged
            <br />
            And Funded Together
          </h2>
        </div>
        {/* The four steps step down the page; energy drips from each one's stock into the next. */}
        <ol className="cascade">
          {[
            {
              Icon: Travel,
              title: "Learn",
              body: "Understand the mission, the need, the budget, and who a project serves.",
            },
            {
              Icon: Guided,
              title: "Guide",
              body: "Builders and Wave Guides shape a practical project with clear milestones.",
            },
            {
              Icon: GivePair,
              title: "Give",
              body: "Learners signal support. Donors, partners, and guides contribute funding, time, and knowledge.",
            },
            {
              Icon: Growing,
              title: "Grow",
              body: "Project teams share evidence, learning, and progress for the community to see.",
            },
          ].map(({ Icon, title, body }, i) => (
            <li className="panel" key={title}>
              <div className="cascade-step">
                <Icon className="practice-symbol" />
                <span className="step-number">0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
              <Stock level={0.14 + i * 0.1} />
            </li>
          ))}
        </ol>
      </section>
      <section className="section panel funding-model">
        <div>
          <p className="eyebrow">FROM SUPPORT TO DELIVERY</p>
          <h2>
            The Future
            <br />
            Funded Together
          </h2>
          <p>
            Community voice informs project review. Funds go through the
            receiving foundation’s approved giving channels. A vote is a voice,
            not a payment or a promise of an award.
          </p>
        </div>
        <ol className="flow-list">
          <li>
            <strong>Submit</strong>
            <span>
              A project, a budget, a community, and a measurable next step.
            </span>
          </li>
          <li>
            <strong>Review</strong>
            <span>
              The team checks readiness, mission alignment, consent, and
              feasibility.
            </span>
          </li>
          <li>
            <strong>Support</strong>
            <span>
              Published projects receive learner signals and partner attention.
            </span>
          </li>
          <li>
            <strong>Deliver</strong>
            <span>
              Agreed funding, milestones, and reporting turn a proposal into
              action.
            </span>
          </li>
        </ol>
      </section>
      <section className="section" id="roadmap" data-mind="timeline">
        <div className="section-heading">
          <p className="eyebrow">VISION & ROADMAP</p>
          <h2>
            When Humanity Builds Together,
            <br />
            We Change The World.
          </h2>
        </div>
        {/* Each stage holds as much as it has built: the further along, the fuller. */}
        <div className="roadmap">
          <article className="panel">
            <span className="status-chip live">NOW</span>
            <h3>Build The Foundation</h3>
            <p>
              Project submissions, Wave Guide applications, team review, public
              project pages, and direct giving to Green Reef.
            </p>
            <Stock level={0.66} />
          </article>
          <article className="panel">
            <span className="status-chip">PROPOSED PILOT</span>
            <h3>Students Funding The Future</h3>
            <p>
              A first cohort with Green Reef: agreed project criteria, learner
              participation, guide support, and milestone-based grants.
            </p>
            <Link to="/guide/partners/green-reef/proposal">
              Read The Proposal <ArrowRight size={16} />
            </Link>
            <Stock level={0.34} />
          </article>
          <article className="panel">
            <span className="status-chip">NEXT</span>
            <h3>Build In Public</h3>
            <p>
              Formal voting rounds, verified participation, partner reporting,
              and consent-based project connections with <Semble />.
            </p>
            <Stock level={0.1} />
          </article>
        </div>
      </section>
      <section className="section questions" aria-labelledby="questions-title">
        <div className="section-heading">
          <p className="eyebrow">QUESTIONS</p>
          <h2 id="questions-title">Clear Answers.</h2>
        </div>
        <div className="question-list">
          {[
            ["Is funding guaranteed?", "No. Published projects are in community review. Funding is not guaranteed. Student support signals inform the team’s work; they are not grant awards."],
            ["Who counts as a student?", "You are a student if you are learning in a school, in a program, or independently. Participation begins with self-identification."],
            ["What happens after I apply?", "Your application is saved privately for the Waves.Fund team to review. Keep your receipt to check its status. A submission is not an award or acceptance."],
            ["Is my information public?", "Your name and email are never published. A project appears publicly only with your permission and after team review."],
            ["What does a Wave Guide cost?", "Scope, fees, timing, and ownership are agreed with your Guide before work begins."],
            ["Where does a donation go?", "Financial donations go to The Green Reef Foundation through its Benevity donation page. The Foundation and its giving provider handle your donation and receipt."],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="section closing">
        <h2>Funding The Future Together</h2>
        <div className="button-row">
          <ButtonLink to="/projects">Explore Projects</ButtonLink>
          <ButtonLink to="/guide" secondary>
            Become A Wave Guide
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
export function Guide() {
  return (
    <div className="document-page">
      <Intro
        eyebrow="GUIDE"
        title={
          <>
            Wave <span>Guides</span>
          </>
        }
      >
        <p>Funding For Lifelong Learners And Leaders</p>
      </Intro>
      <section className="guide-hero panel">
        <div className="guide-symbol">
          <Waves size={68} strokeWidth={1} />
        </div>
        <div>
          <h2>
            When Humanity Builds Together,
            <br />
            We Change The World.
          </h2>
          <p>
            Wave Guides work alongside builders. Bring experience, curiosity,
            and care to help a project move from a vision to something people
            can use.
          </p>
          <ButtonLink to="/guide/apply">Apply To Be A Wave Guide</ButtonLink>
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">WHAT A WAVE GUIDE DOES</p>
        <div className="three-grid">
          <article className="panel">
            <BookOpen />
            <h3>Learn With Builders</h3>
            <p>
              Understand the community, ask useful questions, and help define a
              realistic next milestone.
            </p>
          </article>
          <article className="panel">
            <Users />
            <h3>Bring People Together</h3>
            <p>
              Connect builders with relevant knowledge, collaborators, and
              partner opportunities.
            </p>
          </article>
          <article className="panel">
            <Leaf />
            <h3>Support The Work</h3>
            <p>
              Review progress, help with obstacles, and make room for honest
              learning and iteration.
            </p>
          </article>
        </div>
      </section>
      <section className="section two-columns">
        <div>
          <p className="eyebrow">WHO CAN APPLY</p>
          <h2>
            Lifelong Learners.
            <br />
            Lifelong Leaders.
          </h2>
        </div>
        <div className="prose">
          <p>
            Builders, teachers, researchers, operators, artists, and community
            members can apply. Tell us what you are learning, what you can
            share, and how much time you can offer.
          </p>
          <p>
            The team reviews applications and looks for a useful match. Guide
            participation is voluntary unless a separate written arrangement is
            agreed. Applying does not guarantee a role or a grant.
          </p>
          <ButtonLink to="/guide/apply">Become A Wave Guide</ButtonLink>
        </div>
      </section>
      <section className="section">
        <div className="section-heading row-heading">
          <div>
            <p className="eyebrow">MOVING TOGETHER</p>
            <h2>Our Partners</h2>
          </div>
          <Link className="text-button" to="/guide/partners">
            All Partnerships <ArrowRight size={18} />
          </Link>
        </div>
        <PartnerCards />
      </section>
      <section className="section team-teaser panel">
        <div>
          <p className="eyebrow">THE WAVES FUND TEAM</p>
          <h2>
            August James Domanchuk
            <br />& Jarvis Green
          </h2>
          <p>
            Founder, builders, and mission partners. Funding The Future
            Together.
          </p>
        </div>
        <ButtonLink to="/guide/team">Meet The Team</ButtonLink>
      </section>
    </div>
  );
}
export function Team() {
  return (
    <div className="document-page">
      <Intro
        eyebrow="GUIDE / TEAM"
        mind="orbit"
        title={
          <>
            The Waves
            <br />
            <span>Fund Team</span>
          </>
        }
      >
        <p>
          Built For All Lifelong Learners And Leaders Building Waves For
          Humanity
        </p>
      </Intro>
      <section className="team-grid">
        <article className="person-card panel">
          <div className="person-monogram">AJD</div>
          <p className="eyebrow">FOUNDER</p>
          <h2>August James Domanchuk</h2>
          <p>
            August is the founder of Waves.Fund, Outlier.Systems, and <Semble />
            . He is an Emergent Strategist, a life long learner and teacher, a
            musician, and a regenerative systems researcher.
          </p>
          <blockquote>“Move The Mindset”</blockquote>
          <p>
            His work on Waves.Fund brings that practice into a student driven
            model for building, learning, and funding the future together.
          </p>
          <a className="text-button" href={`mailto:${CONTACT}`}>
            {CONTACT}
            <ArrowRight size={17} />
          </a>
          <External href="https://outlier.systems">Outlier.Systems</External>
        </article>
        <article className="person-card panel">
          <img
            className="person-photo"
            src="/media/jarvis.webp"
            alt="Jarvis Green"
          />
          <p className="eyebrow">CO-FOUNDER & MISSION PARTNER</p>
          <h2>Jarvis Green</h2>
          <p>
            Jarvis is a two-time Super Bowl champion, seafood entrepreneur, and
            the founder of the Green Reef Foundation. As owner and president of
            Oceans 97, he connects his Louisiana roots with food, business, and
            service.
          </p>
          <p>
            His work spans food security, aquatic food systems, workforce
            development, and opportunities for communities. He brings that
            experience and mission to Waves.Fund.
          </p>
          <External href="https://www.ocean97.com/about/">
            More About Jarvis
          </External>
          <External href={reefURL}>The Green Reef Foundation</External>
        </article>
      </section>
      <section className="section closing">
        <p className="eyebrow">PARTNERSHIPS & IMPACT INVESTMENT</p>
        <h2>Funding The Future Together</h2>
        <a className="glow-button" href={`mailto:${CONTACT}`}>
          {CONTACT}
          <ArrowRight size={18} />
        </a>
      </section>
    </div>
  );
}
export function Partners() {
  return (
    <div className="document-page">
      <Intro
        eyebrow="GUIDE / PARTNERS"
        mind="hubs"
        title={
          <>
            Moving
            <br />
            <span>Together</span>
          </>
        }
      >
        <p>When Humanity Builds Together, We Change The World.</p>
      </Intro>
      <PartnerCards />
      <section className="section panel partner-invitation">
        <h2>
          Built Together.
          <br />
          For Humanity.
        </h2>
        <p>
          Bring a mission, a community, or a project. Let’s work out where
          learning, funding, and delivery can meet.
        </p>
        <a
          className="glow-button"
          href={`mailto:${CONTACT}?subject=Waves.Fund%20Partnership`}
        >
          Explore A Partnership
          <ArrowRight size={18} />
        </a>
      </section>
    </div>
  );
}
export function GreenReef() {
  return (
    <div className="document-page">
      <Link className="breadcrumb" to="/guide/partners">
        Partners / Green Reef
      </Link>
      <section className="partner-hero">
        <img
          className="reef-heading-logo"
          src="/media/green-reef-logo.webp"
          alt="The Green Reef Foundation"
        />
        <Intro
          eyebrow="WAVES.FUND × THE GREEN REEF FOUNDATION"
          mind="ocean"
          title={
            <>
              Welcome To The
              <br />
              <span>Frontier Of Funding</span>
            </>
          }
        >
          <p>
            Connecting student driven project support with aquatic food systems,
            community opportunity, and ecological well-being.
          </p>
        </Intro>
        <div className="button-row">
          <ButtonLink to="/guide/partners/green-reef/proposal">
            Explore The Pilot Proposal
          </ButtonLink>
          <External className="text-button" href={reefURL}>
            Visit Green Reef
          </External>
        </div>
      </section>
      <section className="section two-columns">
        <div>
          <p className="eyebrow">THE FOUNDATION’S MISSION</p>
          <h2>
            Food. Water.
            <br />
            Opportunity.
          </h2>
        </div>
        <div className="prose">
          <p>
            Green Reef works with communities in the United States and Africa on
            fisheries and aquaculture. Its approach connects nutrition, clean
            water, livelihoods, and healthy ecosystems.
          </p>
          <p>
            Its education and workforce initiatives create a natural place for
            learners to contribute. Waves.Fund can bring project applications,
            learner participation, and visible progress to that work.
          </p>
          <External href={reefURL}>Read Green Reef’s Mission</External>
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">PROPOSED PARTNERSHIP</p>
        <h2>A Place For Projects To Move</h2>
        <div className="four-grid">
          {[
            [
              "Virtual Reef",
              "A shared project directory where learners discover needs and teams publish their progress.",
            ],
            [
              "Innovation Centers",
              "Practical briefs from food processing, aquaculture, and cooperative infrastructure.",
            ],
            [
              "Workers Platform",
              "Projects where learners gain experience with guidance from practitioners.",
            ],
            [
              "Green Reef Fund",
              "A proposed route from reviewed projects and student voice to approved, accountable funding.",
            ],
          ].map(([a, b]) => (
            <article className="panel" key={a}>
              <h3>{a}</h3>
              <p>{b}</p>
            </article>
          ))}
        </div>
        <p className="fine-print">
          These are proposed connections to initiatives described in Green
          Reef’s overview, subject to the Foundation’s review and agreement.
        </p>
      </section>
      <section className="section panel funding-model">
        <div>
          <p className="eyebrow">HOW IT COULD WORK</p>
          <h2>
            A Community Need.
            <br />A Student Response.
            <br />A Visible Outcome.
          </h2>
        </div>
        <ol className="flow-list">
          <li>
            <strong>Green Reef Shares A Brief</strong>
            <span>
              A real need, a local contact, project constraints, and what
              success would mean.
            </span>
          </li>
          <li>
            <strong>Builders Submit</strong>
            <span>
              A plan, a requested budget, and milestones that respond to the
              brief.
            </span>
          </li>
          <li>
            <strong>Learners Participate</strong>
            <span>
              Questions, public discussion, and student voting under agreed
              round rules.
            </span>
          </li>
          <li>
            <strong>Partners Deliver</strong>
            <span>
              Approved awards stay under the receiving foundation’s control;
              project teams share progress and evidence.
            </span>
          </li>
        </ol>
      </section>
      <section className="section">
        <p className="eyebrow">POSSIBLE FIRST PROJECTS</p>
        <div className="three-grid">
          <article className="panel">
            <h3>Aquatic Food Learning</h3>
            <p>
              A student-led workshop series with a local practitioner, a
              learning plan, and participant feedback.
            </p>
          </article>
          <article className="panel">
            <h3>Community Water Knowledge</h3>
            <p>
              A supervised effort to document local water needs and build
              accessible educational resources.
            </p>
          </article>
          <article className="panel">
            <h3>Food System Traceability</h3>
            <p>
              A small research or software project that helps a partner
              understand one part of its supply chain.
            </p>
          </article>
        </div>
        <p className="fine-print">
          Illustrative project ideas. These are not announced Green Reef
          projects or awarded grants.
        </p>
      </section>
      <section className="section closing">
        <h2>Funding The Future Together</h2>
        <div className="button-row">
          <ButtonLink to="/guide/partners/green-reef/proposal">
            Read The Full Proposal
          </ButtonLink>
          <External href={DONATE} className="glow-button">
            Give To Green Reef
          </External>
        </div>
        <div className="sources">
          <External href={briefURL}>Green Reef One Page Overview</External>
          <External href="https://www.ocean97.com/foundation/">
            Foundation Background
          </External>
        </div>
      </section>
    </div>
  );
}
export function SemblePartner() {
  return (
    <div className="document-page">
      <Link className="breadcrumb" to="/guide/partners">
        Partners / <Semble />
      </Link>
      <section className="partner-hero semble-hero">
        <img
          src="/media/semble-logo.webp"
          className="semble-hero-logo"
          alt="Semble.CC"
        />
        <Intro
          eyebrow="A FOUNDING PARTNER"
          mind="gather"
          title={
            <>
              The App To
              <br />
              <span>Build In Public!</span>
            </>
          }
        >
          <p>
            <Semble /> × Waves.Fund
          </p>
        </Intro>
        <External
          href="https://semble.cc/the-semble-way"
          className="glow-button"
        >
          Learn The Semble Way
        </External>
      </section>
      <section className="section two-columns">
        <div>
          <p className="eyebrow">A SEMBLE SOURCE IMPACT PARTNER</p>
          <h2>
            Startups Founded
            <br />
            By Students
          </h2>
        </div>
        <div className="prose">
          <p>
            <Semble /> gives builders places to meet, share work, learn, and be
            present. Its Stage, community conversations, and project tools make
            building visible.
          </p>
          <p>
            Waves.Fund adds a focused path for social impact projects: explain
            the need, request support, invite learner participation, and show
            what changes.
          </p>
          <p>
            The connection begins with shared links and people. A deeper data
            integration would require consent and an agreed interface between
            the two products.
          </p>
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">THE PROPOSED CONNECTION</p>
        <div className="three-grid">
          <article className="panel">
            <h3>Build In Public</h3>
            <p>
              Link a public <Semble /> project or Stage to a Waves.Fund
              application, so reviewers can see the work and its context.
            </p>
          </article>
          <article className="panel">
            <h3>Learn Together</h3>
            <p>
              Use builder conversations and guide sessions to develop a clearer
              project, realistic scope, and stronger collaboration.
            </p>
          </article>
          <article className="panel">
            <h3>Show Progress</h3>
            <p>
              Connect public project updates to agreed grant milestones, with
              the builder choosing what to share.
            </p>
          </article>
        </div>
      </section>
      <section className="section panel integration-note">
        <h2>
          Trust People.
          <br />
          And They Become Trustworthy.
        </h2>
        <p>
          Private anchors, recordings, and personal information stay outside
          this proposed integration unless the person explicitly chooses to
          share them. Presence, paid seats, and platform balances do not buy
          additional votes in the Waves.Fund model.
        </p>
        <p className="fine-print">
          No automatic account linking, data sync, or financial integration is
          active. This page describes the partnership direction.
        </p>
      </section>
      <section className="section closing">
        <h2>Funding The Future Together</h2>
        <div className="button-row">
          <ButtonLink to="/apply">Submit A Project</ButtonLink>
          <External href="https://semble.cc/the-semble-way">
            <Semble /> · The Semble Way
          </External>
        </div>
      </section>
    </div>
  );
}
export function OceanPartner() {
  return (
    <div className="document-page">
      <Link className="breadcrumb" to="/guide/partners">
        Partners / Ocean97.Com
      </Link>
      <section className="partner-hero">
        <img
          className="ocean-heading-logo"
          src="/media/ocean97-logo.webp"
          alt="Ocean97.Com"
        />
        <Intro
          eyebrow="MISSION PARTNER"
          mind="ocean"
          title={
            <>
              Experience.
              <br />
              <span>Shared Forward.</span>
            </>
          }
        >
          <p>
            Louisiana seafood. Fishing families. A commitment to nourishment and
            opportunity.
          </p>
        </Intro>
        <External className="glow-button" href="https://www.ocean97.com/">
          Visit Ocean97.Com
        </External>
      </section>
      <section className="section two-columns">
        <h2>
          From Enterprise
          <br />
          To Community
        </h2>
        <div className="prose">
          <p>
            Founded by Jarvis Green, Oceans 97 brings Louisiana seafood products
            to market while supporting fishermen and their families. Its work
            brings practical experience in food products, supply chains, and
            entrepreneurship.
          </p>
          <p>
            The proposed Waves.Fund connection is a place to share that
            experience with learners: project briefs, practitioner feedback, and
            introductions relevant to community food systems.
          </p>
          <p>
            Charitable giving on Waves.Fund links to the Green Reef Foundation’s
            external donation channel. It is separate from buying Oceans 97
            products.
          </p>
          <External href="https://www.ocean97.com/about/">
            About Oceans 97 & Jarvis Green
          </External>
        </div>
      </section>
      <PartnerCards />
    </div>
  );
}
export function Proposal() {
  const [grants, setGrants] = useState(5),
    [amount, setAmount] = useState(3000);
  const grantTotal = grants * amount,
    total = grantTotal + 10000;
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  return (
    <div className="document-page proposal-page">
      <Link className="breadcrumb" to="/guide/partners/green-reef">
        Green Reef / Pilot Proposal
      </Link>
      <Intro
        eyebrow="FOR THE GREEN REEF TEAM · DISCUSSION DRAFT"
        mind="ocean"
        title={
          <>
            Students Funding
            <br />
            <span>Aquatic Futures.</span>
          </>
        }
      >
        <p>
          A proposed 90-day pilot between Waves.Fund and The Green Reef
          Foundation.
        </p>
      </Intro>
      <div className="proposal-notice">
        <Check size={19} />
        <p>
          For discussion and agreement. Figures are planning assumptions, not
          funds raised, awarded grants, or an executed agreement.
        </p>
      </div>
      <section className="section first-decisions" aria-labelledby="decisions-title">
        <p className="eyebrow">THE FIRST CONVERSATION</p>
        <h2 id="decisions-title">Five Decisions To Begin.</h2>
        <ol className="decision-list">
          {["The budget", "The receiving entity", "The project criteria", "Data responsibilities", "The decision makers"].map((d, i) => (
            <li key={d}><span>0{i + 1}</span>{d}</li>
          ))}
        </ol>
        <p className="fine-print">These are the first fifteen days of the proposed cadence below. Agreeing them starts the pilot.</p>
      </section>
      <section className="section two-columns">
        <div>
          <p className="eyebrow">THE PROPOSAL</p>
          <h2>
            One Focused Pilot.
            <br />A Clear Next Step.
          </h2>
        </div>
        <div className="prose">
          <p>
            Invite students and lifelong learners to propose small, achievable
            projects aligned with Green Reef’s mission. Give each selected team
            a guide, a published plan, and a measurable deliverable.
          </p>
          <p>
            The pilot would test whether transparent project selection, student
            participation, and guided delivery can help Green Reef attract new
            talent and turn community priorities into action.
          </p>
        </div>
      </section>
      <section className="section pilot-targets">
        <div>
          <strong>90</strong>
          <span>Days From Agreed Start</span>
        </div>
        <div>
          <strong>20</strong>
          <span>Target Applications</span>
        </div>
        <div>
          <strong>100</strong>
          <span>Target Learner Participants</span>
        </div>
        <div>
          <strong>{grants}</strong>
          <span>Proposed Funded Projects</span>
        </div>
      </section>
      <section className="section panel budget-panel">
        <div>
          <p className="eyebrow">ILLUSTRATIVE PILOT BUDGET</p>
          <h2>
            Make The Numbers
            <br />
            Understandable.
          </h2>
          <p>Adjust the scope to prepare a conversation with the Foundation.</p>
          <label>
            Funded Projects <output>{grants}</output>
            <input
              aria-label="Funded Projects"
              type="range"
              min="2"
              max="10"
              value={grants}
              onChange={(e) => setGrants(Number(e.target.value))}
            />
          </label>
          <label>
            Grant Per Project <output>{money(amount)}</output>
            <input
              aria-label="Grant Per Project"
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
        </div>
        <dl className="budget-lines">
          <div>
            <dt>
              {grants} Project Grants × {money(amount)}
            </dt>
            <dd>{money(grantTotal)}</dd>
          </div>
          <div>
            <dt>Guide & Cohort Delivery</dt>
            <dd>$5,000</dd>
          </div>
          <div>
            <dt>Measurement & Reporting</dt>
            <dd>$3,000</dd>
          </div>
          <div>
            <dt>Contingency Reserve</dt>
            <dd>$2,000</dd>
          </div>
          <div className="budget-total">
            <dt>Proposed Funding Target</dt>
            <dd>{money(total)}</dd>
          </div>
          <div className="budget-note">
            <dt className="sr-only">Planning Note</dt>
            <dd>
              No Waves.Fund percentage fee is proposed for this pilot. External
              donation-processing costs must be confirmed and included before
              the budget is agreed.
            </dd>
          </div>
        </dl>
      </section>
      <section className="section">
        <p className="eyebrow">WHO DOES WHAT</p>
        <h2>Clear Roles. Shared Work.</h2>
        <div
          className="table-scroll"
          role="region"
          aria-label="Partnership Responsibilities"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Responsibility</th>
                <th>Waves.Fund</th>
                <th>Green Reef Foundation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Project Intake</th>
                <td>
                  Application tools, project pages, and support for applicants.
                </td>
                <td>
                  Mission priorities, local contacts, and project eligibility.
                </td>
              </tr>
              <tr>
                <th>Student Participation</th>
                <td>
                  Published round rules, accessible voting, and a transparent
                  record.
                </td>
                <td>Review eligibility and conflicts before voting begins.</td>
              </tr>
              <tr>
                <th>Funds & Awards</th>
                <td>Present approved project budgets and progress.</td>
                <td>
                  Accept donations, approve grant agreements, control
                  disbursement, and maintain financial records.
                </td>
              </tr>
              <tr>
                <th>Guidance & Delivery</th>
                <td>Recruit and coordinate Wave Guides.</td>
                <td>
                  Confirm relevant expertise, local needs, and safe delivery
                  conditions.
                </td>
              </tr>
              <tr>
                <th>Reporting</th>
                <td>Publish consented milestones and a pilot summary.</td>
                <td>
                  Validate outcomes and financial reporting before public
                  claims.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className="section" data-mind="timeline">
        <p className="eyebrow">PROPOSED 90-DAY CADENCE</p>
        <ol className="timeline">
          {[
            [
              "Days 1–15",
              "Agree The Pilot",
              "Confirm the budget, receiving entity, project criteria, data responsibilities, and decision makers.",
            ],
            [
              "Days 16–30",
              "Invite Builders",
              "Publish briefs, recruit guides, and open a focused application period.",
            ],
            [
              "Days 31–45",
              "Review & Participate",
              "Check eligibility; run learner discussion and a defined voting round.",
            ],
            [
              "Days 46–75",
              "Fund & Build",
              "Sign project agreements. A proposed 50% / 30% / 20% release follows kickoff, midpoint evidence, and accepted delivery.",
            ],
            [
              "Days 76–90",
              "Show What Changed",
              "Review deliverables, document learning, reconcile funds, and decide whether to repeat the pilot.",
            ],
          ].map(([date, title, body]) => (
            <li key={date}>
              <span>{date}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="section two-columns">
        <div>
          <p className="eyebrow">STUDENT VOICE & ACCOUNTABILITY</p>
          <h2>
            Trust People.
            <br />
            And They Become Trustworthy.
          </h2>
        </div>
        <div className="prose">
          <p>
            Proposed formal-round rule: one verified participant, one ballot,
            with support for up to three eligible projects. Voters self-identify
            as students or lifelong learners. No donation or paid membership
            increases voting power.
          </p>
          <p>
            Student ballots determine community preference among eligible
            projects. Green Reef retains responsibility for legal eligibility,
            available funds, and safe use of charitable resources. Any departure
            from the published result requires a documented reason; ties use a
            published student runoff.
          </p>
          <p>
            The current project support signals are advisory and limited by
            browser. Identity verification and the full formal-round rules must
            be agreed and implemented before binding grant selection begins.
          </p>
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">OUTCOMES & EVIDENCE</p>
        <div className="three-grid">
          <article className="panel">
            <h3>Participation</h3>
            <p>
              Target 20 complete applications, 100 learner participants, and one
              guide for each selected project. Report actual numbers, including
              drop-off.
            </p>
          </article>
          <article className="panel">
            <h3>Delivery</h3>
            <p>
              Target all selected teams completing an agreed deliverable, with
              at least 80% of scheduled milestones on time. Record delays
              openly.
            </p>
          </article>
          <article className="panel">
            <h3>Community Value</h3>
            <p>
              Set a baseline and one useful outcome per project: learning hours,
              participants served, a tested process, or a usable resource.
              Validate evidence with the local partner.
            </p>
          </article>
        </div>
      </section>
      <section className="section agreement panel">
        <p className="eyebrow">BEFORE EITHER TEAM COMMITS</p>
        <h2>What The Written Agreement Needs</h2>
        <ul>
          <li>
            Named entities, authorized signatories, an agreed start date, and
            the approved budget.
          </li>
          <li>
            Fundraising permissions, who receives money, disbursement authority,
            and treatment of unused funds.
          </li>
          <li>
            Selection rules, conflicts of interest, complaints, appeals, and
            circumstances for pausing a project.
          </li>
          <li>
            Ownership of work, agreed public-use permissions, data access,
            retention, and participant consent.
          </li>
          <li>
            Safeguarding, supervision, insurance where needed, and permitted
            activities for each project.
          </li>
          <li>
            Reporting dates, responsibility for verifying outcomes, and a
            practical termination process.
          </li>
        </ul>
        <p>
          This page records a proposal for discussion. It does not establish a
          legal agreement or commit either organization to funding.
        </p>
      </section>
      <section className="section closing">
        <h2>Funding The Future Together</h2>
        <div className="button-row">
          <a
            className="glow-button"
            href={`mailto:${CONTACT}?subject=Green%20Reef%20Pilot%20Proposal`}
          >
            Discuss The Proposal <ArrowRight size={18} />
          </a>
          <button className="text-button" onClick={() => window.print()}>
            Print Proposal <ExternalLink size={17} />
          </button>
          <button
            className="text-button"
            onClick={() =>
              download("green-reef-pilot-budget.json", {
                status: "Discussion draft — not an agreement",
                durationDays: 90,
                grants,
                grantPerProject: amount,
                projectGrants: grantTotal,
                guideDelivery: 5000,
                measurement: 3000,
                contingency: 2000,
                total,
                contact: CONTACT,
              })
            }
          >
            Save Budget <Download size={17} />
          </button>
        </div>
        <div className="sources">
          <External href={reefURL}>Green Reef</External>
          <External href={briefURL}>Foundation Overview</External>
          <External href="https://www.ocean97.com/foundation/">
            Foundation Initiatives
          </External>
        </div>
      </section>
    </div>
  );
}
