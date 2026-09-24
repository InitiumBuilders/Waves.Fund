import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Problem, REASONS, Switch, useCall } from "./core";
import { Sheet } from "../ui";

export function Report({ refId, connection, opportunity, name, onClose, onBlocked }: {
  refId?: string; connection?: string; opportunity?: string; name: string; onClose: () => void; onBlocked?: () => void;
}) {
  const call = useCall();
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [block, setBlock] = useState(Boolean(refId));
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason) { setError("Choose a reason."); return; }
    try {
      await call("report", { ref: refId, connection, opportunity, reason, detail, block: Boolean(refId) && block });
      setDone(true);
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <Sheet title={`Report ${name}`} onClose={() => { onClose(); if (done && block && refId) onBlocked?.(); }}>
      {done ? (
        <>
          <p>Thank you. The Waves.Fund team will review it.{block && refId ? ` You will not see ${name} again.` : ""}</p>
          <p className="fine-print">If someone is in danger, call your local emergency number first.</p>
        </>
      ) : (
        <form className="gt-report" onSubmit={send}>
          <fieldset className="gt-choices">
            <legend>What is wrong?</legend>
            {REASONS.map(([k, text]) => (
              <label key={k} className="checkbox"><input type="radio" name="reason" value={k} checked={reason === k} onChange={() => setReason(k)} /><span>{text}</span></label>
            ))}
          </fieldset>
          <label>Anything the team should know? (optional)<textarea rows={3} maxLength={1000} value={detail} onChange={(e) => setDetail(e.target.value)} /></label>
          {refId && <Switch label={`Also block ${name}`} checked={block} onChange={setBlock} />}
          <Problem>{error}</Problem>
          <button className="glow-button" type="submit">Send Report<ArrowRight size={18} /></button>
          <p className="fine-print">Reports go to the Waves.Fund team only. If someone is in danger, call your local emergency number first.</p>
        </form>
      )}
    </Sheet>
  );
}

export function Confirm({ title, action, children, onClose, run }: { title: string; action: string; children: ReactNode; onClose: () => void; run: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Sheet title={title} onClose={onClose}>
      {children}
      <Problem>{error}</Problem>
      <div className="gt-actions">
        <button className="glow-button" disabled={busy} onClick={async () => { setBusy(true); try { await run(); } catch (e) { setError((e as Error).message); setBusy(false); } }}>{busy ? "One moment…" : action}<ArrowRight size={18} /></button>
        <button className="text-button" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}
