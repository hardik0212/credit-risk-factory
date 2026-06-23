import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Hero } from "./components/Hero";
import { IntakePanel } from "./components/IntakePanel";
import { ResultPanel } from "./components/ResultPanel";
import { Topbar } from "./components/Topbar";
import { buildAgentOnePackage } from "./lib/agentPackage";
import { API_BASE_URL } from "./lib/constants";
import "./styles.css";

function App() {
  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [typeOverrides, setTypeOverrides] = useState({});
  const [selectedTarget, setSelectedTarget] = useState("");
  const [confirmedPackage, setConfirmedPackage] = useState(null);

  const recommendation = profile?.agent_recommendation;

  const reviewedColumns = useMemo(() => {
    if (!profile?.columns) return [];
    return profile.columns.map((column) => ({
      ...column,
      reviewed_type: typeOverrides[column.name] || column.semantic_type,
    }));
  }, [profile, typeOverrides]);

  const changedTypeCount = useMemo(() => {
    return reviewedColumns.filter((column) => column.reviewed_type !== column.semantic_type).length;
  }, [reviewedColumns]);

  const excludedColumnCount = useMemo(() => {
    return reviewedColumns.filter((column) => column.reviewed_type === "exclude").length;
  }, [reviewedColumns]);

  const leakageCount = recommendation?.possible_leakage_columns?.length || 0;

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    setError("");
    setProfile(null);
    setTypeOverrides({});
    setSelectedTarget("");
    setConfirmedPackage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/datasets/profile`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "Upload failed");
      }
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

  function handleTargetChange(nextTarget) {
    setSelectedTarget(nextTarget);
    setConfirmedPackage(null);
  }

  function handleConfirmPackage() {
    setConfirmedPackage(
      buildAgentOnePackage({
        profile,
        reviewedColumns,
        selectedTarget,
        recommendation,
      }),
    );
  }

  return (
    <main className="app-shell">
      <Topbar />
      <Hero profile={profile} confirmedPackage={confirmedPackage} />

      <section className="workspace">
        <IntakePanel
          file={file}
          isUploading={isUploading}
          error={error}
          onFileChange={setFile}
          onUpload={handleUpload}
        />
        <ResultPanel
          profile={profile}
          recommendation={recommendation}
          reviewedColumns={reviewedColumns}
          selectedTarget={selectedTarget}
          confirmedPackage={confirmedPackage}
          changedTypeCount={changedTypeCount}
          excludedColumnCount={excludedColumnCount}
          leakageCount={leakageCount}
          onTargetChange={handleTargetChange}
          onTypeChange={handleTypeChange}
          onConfirmPackage={handleConfirmPackage}
        />
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
