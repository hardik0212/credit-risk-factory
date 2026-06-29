import React, { useMemo } from "react";
import { BrainCircuit, Check, FileSearch, Radio, ShieldCheck, Sparkles } from "lucide-react";

const LOADING_STEPS = [
  {
    key: "uploading",
    label: "Uploading file",
    detail: "CSV received by the Agent 1 intake service.",
    icon: FileSearch,
    progress: 18,
  },
  {
    key: "profiling",
    label: "Understanding columns",
    detail: "Reading headers, missingness, types, top values, and row sample.",
    icon: BrainCircuit,
    progress: 42,
  },
  {
    key: "calling_ai",
    label: "Calling AI helper",
    detail: "Sending compact profile and 100 sample rows only.",
    icon: Radio,
    progress: 68,
  },
  {
    key: "response_received",
    label: "API response received",
    detail: "Recommendation payload returned to the backend.",
    icon: Check,
    progress: 84,
  },
  {
    key: "processing",
    label: "Preparing review pack",
    detail: "Merging AI/backend signals into a human-editable package.",
    icon: ShieldCheck,
    progress: 96,
  },
];

export function AgentLoadingPanel({ phase }) {
  const activeIndex = Math.max(
    LOADING_STEPS.findIndex((step) => step.key === phase),
    0,
  );
  const progress = LOADING_STEPS[activeIndex]?.progress || 18;

  const activeStep = useMemo(() => LOADING_STEPS[activeIndex], [activeIndex]);

  return (
    <div className="result-panel loading-panel">
      <div className="loading-orbit" aria-hidden="true">
        <Sparkles size={34} />
      </div>

      <div className="loading-header">
        <span>Agent 1 is working</span>
        <h2>{activeStep.label}</h2>
        <p>{activeStep.detail}</p>
      </div>

      <div className="progress-shell" aria-label={`Agent progress ${progress}%`}>
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="progress-meta">
        <span>{progress}%</span>
        <small>Live backend workflow</small>
      </div>

      <div className="loading-steps">
        {LOADING_STEPS.map((step, index) => {
          const Icon = step.icon;
          const status = index < activeIndex ? "done" : index === activeIndex ? "active" : "waiting";

          return (
            <div className={`loading-step ${status}`} key={step.key}>
              <div>
                {status === "done" ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <span>{step.label}</span>
              <small>{step.detail}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}
