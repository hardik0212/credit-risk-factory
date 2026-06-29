import React from "react";
import { AlertTriangle, BadgeCheck, Fingerprint, Send, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { InsightList } from "../../../components/ui/InsightList";
import { Metric } from "../../../components/ui/Metric";
import { TYPE_OPTIONS } from "../../../lib/constants";
import { DECISION_OPTIONS, getDecisionLabel } from "../../../lib/variableDecisions";

export function ResultPanel({
  profile,
  recommendation,
  reviewedColumns,
  selectedTarget,
  confirmedPackage,
  changedTypeCount,
  changedDecisionCount,
  excludedColumnCount,
  selectedVariableCount,
  reviewVariableCount,
  excludedVariableCount,
  leakageCount,
  onTargetChange,
  onTypeChange,
  onDecisionChange,
  onConfirmPackage,
}) {
  if (!profile) {
    return (
      <div className="result-panel">
        <EmptyState />
      </div>
    );
  }

  const aiStatus = recommendation?.ai_status;
  const aiHelpUsed = Boolean(recommendation?.ai_help_used);
  const providerLabel = aiStatus?.provider && aiStatus.provider !== "none" ? aiStatus.provider.toUpperCase() : "Backend";
  const recommendationSource = aiHelpUsed ? "AI help used" : "Backend rules used";
  const recommendationDetail = aiHelpUsed
    ? `${providerLabel} reviewed the compact column profile and 100-row sample.`
    : "No AI API call was used; the backend generated this with deterministic rules.";

  return (
    <div className="result-panel">
      <div className="metrics-grid">
        <Metric label="Rows" value={profile.row_count.toLocaleString()} />
        <Metric label="Columns" value={profile.column_count.toLocaleString()} />
        <Metric label="Target" value={selectedTarget || "Review"} emphasis />
        <Metric label="Agent 1 flags" value={(changedTypeCount + changedDecisionCount + excludedColumnCount + leakageCount + reviewVariableCount).toLocaleString()} />
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
          <div className={`ai-status ${aiHelpUsed ? "success" : "muted"}`}>
            <span>{recommendationSource}</span>
            <small>{recommendationDetail} {aiStatus?.reason || ""}</small>
          </div>
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
        <InsightList title="Reviewer Changes" icon={<SlidersHorizontal size={18} />} items={[`${changedTypeCount} type overrides`, `${changedDecisionCount} decision overrides`, `${excludedColumnCount} excluded type overrides`]} empty="No reviewer changes" />
        <InsightList title="AI Help" icon={<Send size={18} />} items={[recommendationSource, `Provider: ${providerLabel}`, `API status: ${aiStatus?.status || "unknown"}`]} empty="AI status unavailable" />
      </div>

      <div className="handoff-card">
        <div>
          <span>Agent 1 output</span>
          <h2>Initial variable-selection package</h2>
          <p>
            {selectedVariableCount} variables are selected, {reviewVariableCount} need review,
            and {excludedVariableCount} are excluded before modeling.
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
                <th>Agent decision</th>
                <th>Reviewed decision</th>
                <th>Reason</th>
                <th>Suggested type</th>
                <th>Reviewed type</th>
                <th>Missing</th>
                <th>Top values</th>
              </tr>
            </thead>
            <tbody>
              {reviewedColumns.map((column) => {
                const reviewedDecisionLabel = getDecisionLabel(column.reviewed_decision);

                return (
                  <tr key={column.name}>
                    <td data-label="Column">{column.name}</td>
                    <td data-label="Agent decision">
                      <span className={`decision-badge ${column.suggested_decision}`}>{column.suggested_decision_label}</span>
                    </td>
                    <td data-label="Reviewed decision">
                      <select
                        className={column.reviewed_decision !== column.suggested_decision ? "decision-select changed" : "decision-select"}
                        value={column.reviewed_decision}
                        onChange={(event) => onDecisionChange(column.name, event.target.value)}
                        aria-label={`Reviewed decision for ${column.name}`}
                      >
                        {DECISION_OPTIONS.map((decision) => (
                          <option value={decision.value} key={decision.value}>{decision.label}</option>
                        ))}
                      </select>
                      {column.reviewed_decision !== column.suggested_decision && (
                        <small className={`decision-override-note ${column.reviewed_decision}`}>Changed to {reviewedDecisionLabel}</small>
                      )}
                    </td>
                    <td data-label="Reason" className="decision-reason">{column.decision_reason}</td>
                    <td data-label="Suggested type">{column.semantic_type}</td>
                    <td data-label="Reviewed type">
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
                    <td data-label="Missing">{column.missing_pct}%</td>
                    <td data-label="Top values">{Object.keys(column.top_values || {}).slice(0, 3).join(", ") || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {confirmedPackage && (
          <div className="submission-ready">
            <BadgeCheck size={18} />
            Agent 1 package ready for Agent 2 with {confirmedPackage.selected_variables.length} selected variable{confirmedPackage.selected_variables.length === 1 ? "" : "s"} and {confirmedPackage.review_variables.length} review item{confirmedPackage.review_variables.length === 1 ? "" : "s"}.
          </div>
        )}
      </div>
    </div>
  );
}
