import React from "react";

export function GovernanceItem({ icon, title, body }) {
  return (
    <div className="governance-item">
      <div>{icon}</div>
      <span>{title}</span>
      <p>{body}</p>
    </div>
  );
}
