import React from "react";

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
