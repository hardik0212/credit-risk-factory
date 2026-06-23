export function buildAgentOnePackage({ profile, reviewedColumns, selectedTarget, recommendation }) {
  const selectedVariables = reviewedColumns
    .filter((column) => column.name !== selectedTarget)
    .filter((column) => !["exclude", "identifier", "target"].includes(column.reviewed_type))
    .map((column) => column.name);

  const excludedVariables = reviewedColumns
    .filter((column) => ["exclude", "identifier"].includes(column.reviewed_type))
    .map((column) => column.name);

  return {
    agent_name: "Data Readiness & Variable Selection Agent",
    handoff_to: "Model Development Agent",
    dataset_id: profile.dataset_id,
    file_name: profile.file_name,
    target_variable: selectedTarget,
    selected_variables: selectedVariables,
    excluded_variables: excludedVariables,
    possible_leakage_columns: recommendation?.possible_leakage_columns || [],
    reviewed_columns: reviewedColumns.map((column) => ({
      name: column.name,
      suggested_type: column.semantic_type,
      reviewed_type: column.reviewed_type,
      missing_pct: column.missing_pct,
    })),
  };
}
