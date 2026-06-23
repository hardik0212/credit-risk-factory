import React from "react";
import { Database } from "lucide-react";

export function EmptyState() {
  return (
    <div className="empty-state">
      <Database size={42} />
      <h2>Waiting for a dataset</h2>
      <p>Agent 1 will profile columns, infer semantic types, identify the target, and prepare variable recommendations.</p>
    </div>
  );
}
