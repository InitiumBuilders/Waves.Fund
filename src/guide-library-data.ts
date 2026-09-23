import handbook from "../docs/guide-library/handbook.md?raw";
import listen from "../docs/guide-library/listen.md?raw";
import shape from "../docs/guide-library/shape.md?raw";
import build from "../docs/guide-library/build.md?raw";
import coordinate from "../docs/guide-library/coordinate.md?raw";
import carry from "../docs/guide-library/carry-and-report.md?raw";
import adapt from "../docs/guide-library/adapt-and-hand-over.md?raw";
import discovery from "../docs/guide-library/discovery.md?raw";
import engagement from "../docs/guide-library/engagement.md?raw";
import nextMove from "../docs/guide-library/next-move.md?raw";
import contribution from "../docs/guide-library/contribution.md?raw";
import handoff from "../docs/guide-library/handoff.md?raw";
import outcome from "../docs/guide-library/outcome.md?raw";
import maintenance from "../docs/guide-library/maintenance.md?raw";

export const guidePractices = [
  { name: "Design & Build", text: "Create custom interfaces, useful tools, and maintainable software around the work the builder needs to do.", example: "A Maker Wave with an accessible parts list, an offer form, and build files the team can maintain." },
  { name: "Story & Community", text: "Listen, shape the story together, and bring people into meaningful participation with care and consent.", example: "A Story Wave that lets participants approve their chapter before a creator carries it forward." },
  { name: "Growth & Distribution", text: "Understand the audience, prepare the right invitation, and coordinate people carrying a Wave into their communities.", example: "A Hype Wave with approved launch material, willing hosts, and a clear path from interest to participation." },
  { name: "Funding & Partnerships", text: "Clarify the resource need, prepare budgets and applications, and bring in suitable partners and specialists.", example: "A Funding Wave with a named recipient, a clear budget, and updates that distinguish pledges from confirmed receipts." },
  { name: "Operations & Care", text: "Keep responsibilities, decisions, shared context, and follow-through clear as the work changes.", example: "A Brave Wave with an accountable reviewer, current shared context, and private handling of sensitive reports." },
];

export const guideWorksheets = [
  { slug: "discovery", title: "Discovery Brief", description: "The person, purpose, existing work, permissions, and first next move.", markdown: discovery },
  { slug: "engagement", title: "Guide Engagement", description: "Scope, agreed fee, review, ownership, and ongoing support.", markdown: engagement },
  { slug: "next-move", title: "The Next Move", description: "One owner, one useful invitation, and an observable completion condition.", markdown: nextMove },
  { slug: "contribution", title: "Contribution Agreement", description: "Turn an offer into an agreed task, with consent and clear follow-through.", markdown: contribution },
  { slug: "handoff", title: "Pass The Wave", description: "A carrying invitation with a purpose, period, approved materials, and return path.", markdown: handoff },
  { slug: "outcome", title: "Outcome Update", description: "You helped. Here's what changed. Here's what comes next.", markdown: outcome },
  { slug: "maintenance", title: "Maintenance & Handover", description: "Source, ownership, access, open work, and care for what comes next.", markdown: maintenance },
];

export const guideLessons = [
  { slug: "listen", title: "Listen", subtitle: "Begin with the person.", description: "Understand the mission and return a brief the builder recognizes as their own.", minutes: 8, image: "growth", caseName: "Growth Wave", markdown: listen, worksheets: ["discovery"] },
  { slug: "shape", title: "Shape", subtitle: "Give the next move a clear form.", description: "Agree on a paid scope, a useful first build, and what completion means.", minutes: 9, image: "funding", caseName: "Funding Wave", markdown: shape, worksheets: ["engagement", "next-move"] },
  { slug: "build", title: "Build", subtitle: "Make something people can use.", description: "Build a custom, accessible Wave with a participation path that works.", minutes: 10, image: "maker", caseName: "Maker Wave", markdown: build, worksheets: ["maintenance"] },
  { slug: "coordinate", title: "Coordinate", subtitle: "Turn an offer into shared work.", description: "Acknowledge help, agree responsibilities, and care for commitments.", minutes: 9, image: "work", caseName: "Work Wave", markdown: coordinate, worksheets: ["contribution"] },
  { slug: "carry-and-report", title: "Carry & Report", subtitle: "Pass the Wave. Bring the outcome back.", description: "Prepare a clear handoff, document the action, and return the result.", minutes: 10, image: "story", caseName: "Story Wave", markdown: carry, worksheets: ["handoff", "outcome"] },
  { slug: "adapt-and-hand-over", title: "Adapt & Hand Over", subtitle: "Let the Wave change with the work.", description: "Close the current move, choose the next one, and leave a usable handover.", minutes: 9, image: "innovation", caseName: "Innovation Wave", markdown: adapt, worksheets: ["maintenance", "outcome"] },
];

export type GuideLessonData = (typeof guideLessons)[number];
export const guideHandbook = [handbook, ...guideLessons.map(lesson => lesson.markdown), "# Working Templates", ...guideWorksheets.map(worksheet => worksheet.markdown)].join("\n\n---\n\n");

export function downloadGuideMarkdown(markdown: string, filename: string) {
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
