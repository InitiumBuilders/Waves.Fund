/* The team is told when something arrives. Mail goes through Resend when RESEND_API_KEY is set; with no key this
   does nothing, so the site works the same either way. A mail names the kind of thing and where to look, never
   the person: names and emails stay in the inbox. It never throws and never waits more than a few seconds, so a
   slow mail service cannot hold up the person who just applied. */

const TO = () => process.env.NOTIFY_TO || "August@Outlier.Systems";
const FROM = () => process.env.NOTIFY_FROM || "Waves.Fund <onboarding@resend.dev>";

export async function notify(subject, lines, { fetch: send = globalThis.fetch, timeout = 4000 } = {}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), timeout);
  try {
    const r = await send("https://api.resend.com/emails", {
      method: "POST",
      signal: control.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM(), to: [TO()], subject: `Waves.Fund · ${subject}`, text: [...lines, "", "Waves.Fund"].join("\n") }),
    });
    if (!r.ok) console.error("notify: the mail service answered", r.status);
    return r.ok === true;
  } catch (error) {
    console.error("notify failed:", error.name || "Error");
    return false;
  } finally {
    clearTimeout(timer);
  }
}
