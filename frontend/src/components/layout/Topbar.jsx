import React from "react";
import { Building2 } from "lucide-react";

export function Topbar() {
  return (
    <nav className="topbar">
      <div className="brand-mark">
        <Building2 size={20} />
        <span>Credit Risk Factory</span>
      </div>
      <div className="topbar-actions">
        <span>Agent 1</span>
        <span>Human governed</span>
        <span>Agent 2 handoff</span>
      </div>
    </nav>
  );
}
