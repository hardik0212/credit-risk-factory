import React from "react";
import { Database, Send, ShieldCheck, SlidersHorizontal, UploadCloud } from "lucide-react";

export function Hero({ profile, confirmedPackage }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow">
          <ShieldCheck size={18} />
          Agent 1: Data Readiness & Variable Selection
        </div>
        <h1>One governed agent prepares the modeling handoff.</h1>
        <p>
          Agent 1 reads the uploaded file, understands columns, detects the target, surfaces DQR
          signals, recommends variables, and waits for human approval before Agent 2 starts modeling.
        </p>
        <div className="hero-stats">
          <StatStrip label="Agent 1 status" value={confirmedPackage ? "Approved" : profile ? "In review" : "Awaiting data"} />
          <StatStrip label="Output" value="Variable package" />
          <StatStrip label="Next agent" value="Model development" />
        </div>
      </div>
      <div className="hero-panel">
        <div className="hero-panel-header">
          <span>Agent 1 workflow</span>
          <strong>{confirmedPackage ? "Ready for Agent 2" : "Pre-handoff review"}</strong>
        </div>
        <PipelineStep icon={<UploadCloud />} label="Ingest" active />
        <PipelineStep icon={<Database />} label="Profile + DQR" active={Boolean(profile)} />
        <PipelineStep icon={<SlidersHorizontal />} label="Variable selection" active={Boolean(profile)} />
        <PipelineStep icon={<Send />} label="Agent 2 handoff" active={Boolean(confirmedPackage)} />
      </div>
    </section>
  );
}

function PipelineStep({ icon, label, active }) {
  return (
    <div className={`pipeline-step ${active ? "active" : ""}`}>
      {React.cloneElement(icon, { size: 20 })}
      <span>{label}</span>
    </div>
  );
}

function StatStrip({ label, value }) {
  return (
    <div className="stat-strip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
