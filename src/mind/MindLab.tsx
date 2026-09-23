import { useState } from "react";
import { FIELD_MODES, type FieldMode } from "./modes";
import { MindAnchor } from "./WaveMind";

/** Development only: every mode of the field, one per screen, to tune them in place. */
export default function MindLab() {
  const [only, setOnly] = useState<FieldMode | "">("");
  return (
    <div style={{ padding: "90px 20px 200px", maxWidth: 1100, margin: "0 auto" }}>
      <select value={only} onChange={e => setOnly(e.target.value as FieldMode)} style={{ marginBottom: 20 }}>
        <option value="">All modes</option>
        {FIELD_MODES.map(f => <option key={f}>{f}</option>)}
      </select>
      {(only ? [only] : FIELD_MODES).map(name => (
        <section key={name} style={{ height: "92vh", display: "grid", gridTemplateRows: "auto 1fr" }}>
          <p className="eyebrow">{name}</p>
          <MindAnchor name={name} />
        </section>
      ))}
    </div>
  );
}
