import React from "react";
import { AlertTriangle, BadgeCheck, Fingerprint, Send, SlidersHorizontal } from "lucide-react";
import { TYPE_OPTIONS } from "../lib/constants";
import { EmptyState, InsightList, Metric } from "./shared";

export function ResultPanel({
  profile,
  recommendation,
  reviewedColumns,
  selectedTarget,
  confirmedPackage,
  changedTypeCount,
  excludedColumnCount,
  leakageCount,
  onTargetChange,
  onTypeChange,
  onConfirmPackage,
}) {
  if (!profile) {
    return (
      <div className="result-panel">
        <EmptyState />
      </div>
    );
  }

  const variableSelection = recommendation?.variable_selection || {};
  const selectedCandidateCount = variableSelection.selected_candidates?.length || 0;
  const reviewCandidateCount = variableSelection.review_candidates?.length || 0;

  return (
    <div className="result-panel">
      <div className="metrics-grid">
        <Metric label="Rows" value={profile.row_count.toLocaleString()} />
        <Metric label="Columns" value={profile.column_count.toLocaleString()} />
        <Metric label="Target" value={selectedTarget || "Review"} emphasis />
        <Metric label="Agent 1 flags" value={(changedTypeCount + excludedColumnCount + leakageCount + reviewCandidateCount).toLocaleString()} />
      </div>

      <div className="recommendation-card">
        <div className="recommendation-icon">
          <BadgeCheck size={24} />
        </div>
        <div>
          <h2>{selectedTarget ? `Recommended target: ${selectedTarget}` : "Target needs review"}</h2>
          <p>
            Agent 1 has prepared the schema and initial variable-selection recommendation. Review the
            target, override types, exclude fields, and approve the package for Agent 2.
          </p>
          <label className="target-review">
            <span>Target variable</span>
            <select value={selectedTarget} onChange={(event) => onTargetChange(event.target.value)}>
              <option value="">Select target</option>
              {profile.columns.map((column) => (
                <option value={column.name} key={column.name}>{column.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="insight-grid">
        <InsightList title="ID Columns" icon={<Fingerprint size={18} />} items={recommendation.id_columns} empty="No obvious ID fields" />
        <InsightList title="Possible Leakage" icon={<AlertTriangle size={18} />} items={recommendation.possible_leakage_columns} empty="No leakage hints found" />
        <InsightList title="Reviewer Changes" icon={<SlidersHorizontal size={18} />} items={[`${changedTypeCount} type overrides`, `${excludedColumnCount} excluded fields`]} empty="No reviewer changes" />
        <InsightList title="Agent 2 Handoff" icon={<Send size={18} />} items={[confirmedPackage ? "Variable package approved" : "Awaiting Agent 1 approval"]} empty="Awaiting Agent 1 approval" />
      </div>

      <div className="handoff-card">
        <div>
          <span>Agent 1 output</span>
          <h2>Initial variable-selection package</h2>
          <p>
            {selectedCandidateCount} variables are initially selected, {reviewCandidateCount} need review,
            and {variableSelection.excluded_candidates?.length || 0} are excluded before modeling.
          </p>
        </div>
        <button className="secondary-button" onClick={onConfirmPackage}>
          <BadgeCheck size={17} />
          Approve for Agent 2
        </button>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>Human Schema & Variable Review</h2>
            <p>Adjust suggested types or exclude fields before Agent 2 receives the package.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>Suggested type</th>
                <th>Reviewed type</th>
                <th>Missing</th>
                <th>Top values</th>
              </tr>
            </thead>
            <tbody>
              {reviewedColumns.map((column) => (
                <tr key={column.name}>
                  <td>{column.name}</td>
                  <td>{column.semantic_type}</td>
                  <td>
                    <select
                      className={column.reviewed_type !== column.semantic_type ? "type-select changed" : "type-select"}
                      value={column.reviewed_type}
                      onChange={(event) => onTypeChange(column.name, event.target.value)}
                    >
                      {TYPE_OPTIONS.map((type) => (
                        <option value={type} key={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  <td>{column.missing_pct}%</td>
                  <td>{Object.keys(column.top_values || {}).slice(0, 3).join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {confirmedPackage && (
          <div className="submission-ready">
            <BadgeCheck size={18} />
            Agent 1 package ready for Agent 2 with {confirmedPackage.selected_variables.length} selected variable{confirmedPackage.selected_variables.length === 1 ? "" : "s"}.
          </div>
        )}
      </div>
    </div>
  );
}
