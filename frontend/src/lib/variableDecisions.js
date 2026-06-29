export const DECISION_OPTIONS = [
  { value: "selected", label: "Selected" },
  { value: "review", label: "Needs review" },
  { value: "excluded", label: "Excluded" },
];

export function buildDecisionLookup(variableSelection = {}) {
  const lookup = {};
  const groups = [
    ["selected_candidates", "selected", "Selected"],
    ["review_candidates", "review", "Needs review"],
    ["excluded_candidates", "excluded", "Excluded"],
  ];

  groups.forEach(([key, status, label]) => {
    (variableSelection[key] || []).forEach((item) => {
      lookup[item.name] = {
        status,
        label,
        reason: item.reason,
      };
    });
  });

  return lookup;
}

export function getDecisionLabel(status) {
  return DECISION_OPTIONS.find((option) => option.value === status)?.label || "Needs review";
}

export function getFallbackDecision() {
  return {
    status: "review",
    label: "Needs review",
    reason: "Not classified by Agent 1. Please review before handoff.",
  };
}
