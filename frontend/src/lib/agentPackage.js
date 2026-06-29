export function buildAgentOnePackage({ profile, reviewedColumns, selectedTarget, recommendation }) {
  const selectedVariables = reviewedColumns
    .filter((column) => column.name !== selectedTarget)
    .filter((column) => column.reviewed_decision === "selected")
    .filter((column) => column.reviewed_type !== "exclude")
    .map((column) => column.name);

  const reviewVariables = reviewedColumns
    .filter((column) => column.name !== selectedTarget)
    .filter((column) => column.reviewed_decision === "review")
    .map((column) => column.name);

  const excludedVariables = reviewedColumns
    .filter((column) => column.name === selectedTarget || column.reviewed_decision === "excluded" || column.reviewed_type === "exclude")
    .map((column) => column.name);

  return {
    agent_name: "Data Readiness & Variable Selection Agent",
    handoff_to: "Model Development Agent",
    dataset_id: profile.dataset_id,
    file_name: profile.file_name,
    target_variable: selectedTarget,
    selected_variables: selectedVariables,
    review_variables: reviewVariables,
    excluded_variables: excludedVariables,
    possible_leakage_columns: recommendation?.possible_leakage_columns || [],
    reviewed_columns: reviewedColumns.map((column) => ({
      name: column.name,
      suggested_type: column.semantic_type,
      reviewed_type: column.reviewed_type,
      suggested_decision: column.suggested_decision,
      reviewed_decision: column.reviewed_decision,
      decision_reason: column.decision_reason,
      missing_pct: column.missing_pct,
    })),
  };
}
