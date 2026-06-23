import React from "react";
import { Database } from "lucide-react";

export function Metric({ label, value, emphasis }) {
  return (
    <div className={`metric ${emphasis ? "emphasis" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function GovernanceItem({ icon, title, body }) {
  return (
    <div className="governance-item">
      <div>{icon}</div>
      <span>{title}</span>
      <p>{body}</p>
    </div>
  );
}

export function InsightList({ title, icon, items, empty }) {
  return (
    <div className="insight-card">
      <div className="insight-title">
        {icon}
        <h3>{title}</h3>
      </div>
      <div className="chips">
        {(items?.length ? items : [empty]).slice(0, 8).map((item) => (
          <span className="chip" key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="empty-state">
      <Database size={42} />
      <h2>Waiting for a dataset</h2>
      <p>Agent 1 will profile columns, infer semantic types, identify the target, and prepare variable recommendations.</p>
    </div>
  );
}
