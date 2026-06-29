import React, { useMemo, useState } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { buildAgentOnePackage } from "../../lib/agentPackage";
import { API_BASE_URL } from "../../lib/constants";
import { buildDecisionLookup, getFallbackDecision } from "../../lib/variableDecisions";
import { AgentLoadingPanel } from "./components/AgentLoadingPanel";
import { Hero } from "./components/Hero";
import { IntakePanel } from "./components/IntakePanel";
import { ResultPanel } from "./components/ResultPanel";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function AgentOnePage() {
  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState("uploading");
  const [error, setError] = useState("");
  const [typeOverrides, setTypeOverrides] = useState({});
  const [decisionOverrides, setDecisionOverrides] = useState({});
  const [selectedTarget, setSelectedTarget] = useState("");
  const [confirmedPackage, setConfirmedPackage] = useState(null);
  const [handoffError, setHandoffError] = useState("");
  const [isCreatingHandoff, setIsCreatingHandoff] = useState(false);

  const recommendation = profile?.agent_recommendation;
  const decisionLookup = useMemo(() => {
    return buildDecisionLookup(recommendation?.variable_selection);
  }, [recommendation]);

  const reviewedColumns = useMemo(() => {
    if (!profile?.columns) return [];
    return profile.columns.map((column) => {
      const suggestedDecision = decisionLookup[column.name] || getFallbackDecision();

      return {
        ...column,
        suggested_decision: suggestedDecision.status,
        suggested_decision_label: suggestedDecision.label,
        decision_reason: suggestedDecision.reason,
        reviewed_decision: decisionOverrides[column.name] || suggestedDecision.status,
        reviewed_type: typeOverrides[column.name] || column.semantic_type,
      };
    });
  }, [profile, typeOverrides, decisionOverrides, decisionLookup]);

  const changedTypeCount = useMemo(() => {
    return reviewedColumns.filter((column) => column.reviewed_type !== column.semantic_type).length;
  }, [reviewedColumns]);

  const excludedColumnCount = useMemo(() => {
    return reviewedColumns.filter((column) => column.reviewed_type === "exclude").length;
  }, [reviewedColumns]);

  const changedDecisionCount = useMemo(() => {
    return reviewedColumns.filter((column) => column.reviewed_decision !== column.suggested_decision).length;
  }, [reviewedColumns]);

  const selectedVariableCount = useMemo(() => {
    return reviewedColumns.filter((column) => column.name !== selectedTarget && column.reviewed_decision === "selected" && column.reviewed_type !== "exclude").length;
  }, [reviewedColumns, selectedTarget]);

  const reviewVariableCount = useMemo(() => {
    return reviewedColumns.filter((column) => column.name !== selectedTarget && column.reviewed_decision === "review" && column.reviewed_type !== "exclude").length;
  }, [reviewedColumns, selectedTarget]);

  const excludedVariableCount = useMemo(() => {
    return reviewedColumns.filter((column) => column.name === selectedTarget || column.reviewed_decision === "excluded" || column.reviewed_type === "exclude").length;
  }, [reviewedColumns, selectedTarget]);

  const leakageCount = recommendation?.possible_leakage_columns?.length || 0;

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    setLoadingPhase("uploading");
    setError("");
    setProfile(null);
    setTypeOverrides({});
    setDecisionOverrides({});
    setSelectedTarget("");
    setConfirmedPackage(null);
    setHandoffError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      await wait(250);
      setLoadingPhase("profiling");
      await wait(350);
      setLoadingPhase("calling_ai");

      const response = await fetch(`${API_BASE_URL}/api/datasets/profile`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      setLoadingPhase("response_received");
      await wait(500);

      if (!response.ok) {
        throw new Error(payload.detail || "Upload failed");
      }
      setLoadingPhase("processing");
      await wait(550);
      setProfile(payload);
      setSelectedTarget(payload.agent_recommendation?.recommended_target || "");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  function handleTypeChange(columnName, nextType) {
    setTypeOverrides((current) => ({ ...current, [columnName]: nextType }));
    setConfirmedPackage(null);
  }

  function handleDecisionChange(columnName, nextDecision) {
    setDecisionOverrides((current) => ({ ...current, [columnName]: nextDecision }));
    setConfirmedPackage(null);
  }

  function handleBulkDecisionChange(columnNames, nextDecision) {
    setDecisionOverrides((current) => {
      const next = { ...current };
      columnNames.forEach((columnName) => {
        next[columnName] = nextDecision;
      });
      return next;
    });
    setConfirmedPackage(null);
  }

  function handleTargetChange(nextTarget) {
    setSelectedTarget(nextTarget);
    setConfirmedPackage(null);
  }

  async function handleConfirmPackage() {
    setHandoffError("");
    setIsCreatingHandoff(true);
    const agentOnePackage = buildAgentOnePackage({
      profile,
      reviewedColumns,
      selectedTarget,
      recommendation,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/agent-one/handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentOnePackage),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "Could not create Agent 2 handoff folder.");
      }
      setConfirmedPackage({ ...agentOnePackage, handoff: payload });
    } catch (handoffCreationError) {
      setHandoffError(handoffCreationError.message);
    } finally {
      setIsCreatingHandoff(false);
    }
  }

  return (
    <main className="app-shell">
      <Topbar />
      <Hero profile={profile} confirmedPackage={confirmedPackage} />

      <section className={`workspace ${profile && !isUploading ? "workspace-results" : ""}`}>
        {(!profile || isUploading) && (
          <IntakePanel
            file={file}
            isUploading={isUploading}
            error={error}
            onFileChange={setFile}
            onUpload={handleUpload}
          />
        )}
        {isUploading ? (
          <AgentLoadingPanel phase={loadingPhase} />
        ) : (
          <ResultPanel
            profile={profile}
            recommendation={recommendation}
            reviewedColumns={reviewedColumns}
            selectedTarget={selectedTarget}
            confirmedPackage={confirmedPackage}
            changedTypeCount={changedTypeCount}
            changedDecisionCount={changedDecisionCount}
            excludedColumnCount={excludedColumnCount}
            selectedVariableCount={selectedVariableCount}
            reviewVariableCount={reviewVariableCount}
            excludedVariableCount={excludedVariableCount}
            leakageCount={leakageCount}
            handoffError={handoffError}
            isCreatingHandoff={isCreatingHandoff}
            onTargetChange={handleTargetChange}
            onTypeChange={handleTypeChange}
            onDecisionChange={handleDecisionChange}
            onBulkDecisionChange={handleBulkDecisionChange}
            onConfirmPackage={handleConfirmPackage}
          />
        )}
      </section>
    </main>
  );
}
