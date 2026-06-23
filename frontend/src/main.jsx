import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Database,
  FileSpreadsheet,
  Fingerprint,
  Loader2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TYPE_OPTIONS = ["numeric", "categorical", "date", "identifier", "target", "text", "exclude"];

function App() {
  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [typeOverrides, setTypeOverrides] = useState({});
  const [selectedTarget, setSelectedTarget] = useState("");
  const [confirmedSchema, setConfirmedSchema] = useState(null);

  const recommendation = profile?.agent_recommendation;
  const target = selectedTarget || recommendation?.recommended_target;

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

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    setError("");
    setProfile(null);
    setTypeOverrides({});
    setSelectedTarget("");
    setConfirmedSchema(null);

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
    setConfirmedSchema(null);
  }

  function handleTargetChange(nextTarget) {
    setSelectedTarget(nextTarget);
    setConfirmedSchema(null);
  }

  function handleConfirmSchema() {
    setConfirmedSchema({
      dataset_id: profile.dataset_id,
      target_variable: selectedTarget,
      columns: reviewedColumns.map((column) => ({
        name: column.name,
        suggested_type: column.semantic_type,
        reviewed_type: column.reviewed_type,
        missing_pct: column.missing_pct,
      })),
    });
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <ShieldCheck size={18} />
            Agentic Credit Risk Factory
          </div>
          <h1>Data Understanding Agent</h1>
          <p>
            Upload a full CSV, keep the data on the platform, and send only a compact schema profile
            to the reasoning layer.
          </p>
        </div>
        <div className="hero-panel">
          <PipelineStep icon={<UploadCloud />} label="Upload CSV" active />
          <ArrowRight className="pipeline-arrow" />
          <PipelineStep icon={<Database />} label="Profile columns" active={Boolean(profile)} />
          <ArrowRight className="pipeline-arrow" />
          <PipelineStep icon={<Sparkles />} label="Detect target" active={Boolean(target)} />
        </div>
      </section>

      <section className="workspace">
        <div className="upload-panel">
          <div className="panel-title">
            <FileSpreadsheet size={22} />
            <div>
              <h2>Dataset Intake</h2>
              <p>CSV is stored locally; only profile metadata reaches the agent boundary.</p>
            </div>
          </div>

          <label className="dropzone">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <UploadCloud size={34} />
            <span>{file ? file.name : "Choose a CSV file"}</span>
            <small>{file ? `${formatBytes(file.size)} ready to profile` : "Full file upload, compact agent context"}</small>
          </label>

          <button className="primary-button" disabled={!file || isUploading} onClick={handleUpload}>
            {isUploading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {isUploading ? "Profiling dataset" : "Run Data Understanding"}
          </button>

          {error && (
            <div className="error-box">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}
        </div>

        <div className="result-panel">
          {!profile ? (
            <EmptyState />
          ) : (
            <>
              <div className="metrics-grid">
                <Metric label="Rows" value={profile.row_count.toLocaleString()} />
                <Metric label="Columns" value={profile.column_count.toLocaleString()} />
                <Metric label="Target" value={target || "Review"} emphasis />
                <Metric label="Overrides" value={changedTypeCount.toLocaleString()} />
              </div>

              <div className="recommendation-card">
                <div className="recommendation-icon">
                  <BadgeCheck size={24} />
                </div>
                <div>
                  <h2>{target ? `Recommended target: ${target}` : "Target needs review"}</h2>
                  <p>
                    The platform has produced a compact profile and stopped before the external API
                    call. Human confirmation should happen here before model development begins.
                  </p>
                  <label className="target-review">
                    <span>Target variable</span>
                    <select value={selectedTarget} onChange={(event) => handleTargetChange(event.target.value)}>
                      <option value="">Select target</option>
                      {profile.columns.map((column) => (
                        <option value={column.name} key={column.name}>{column.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="insight-grid">
                <InsightList
                  title="ID Columns"
                  icon={<Fingerprint size={18} />}
                  items={recommendation.id_columns}
                  empty="No obvious ID fields"
                />
                <InsightList
                  title="Possible Leakage"
                  icon={<AlertTriangle size={18} />}
                  items={recommendation.possible_leakage_columns}
                  empty="No leakage hints found"
                />
              </div>

              <div className="table-card">
                <div className="table-header">
                  <div>
                    <h2>Human Schema Review</h2>
                    <p>Adjust suggested types before the profile is submitted to the next agent.</p>
                  </div>
                  <button className="secondary-button" onClick={handleConfirmSchema}>
                    <BadgeCheck size={17} />
                    Confirm schema
                  </button>
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
                              onChange={(event) => handleTypeChange(column.name, event.target.value)}
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
                {confirmedSchema && (
                  <div className="submission-ready">
                    <BadgeCheck size={18} />
                    Reviewed schema ready for final submission with {changedTypeCount} type override{changedTypeCount === 1 ? "" : "s"}.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function PipelineStep({ icon, label, active }) {
  return (
    <div className={`pipeline-step ${active ? "active" : ""}`}>
      {React.cloneElement(icon, { size: 20 })}
      <span>{label}</span>
    </div>
  );
}

function Metric({ label, value, emphasis }) {
  return (
    <div className={`metric ${emphasis ? "emphasis" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InsightList({ title, icon, items, empty }) {
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

function EmptyState() {
  return (
    <div className="empty-state">
      <Database size={42} />
      <h2>Waiting for a dataset</h2>
      <p>The first run will profile columns, infer semantic types, and prepare the target detection payload.</p>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

createRoot(document.getElementById("root")).render(<App />);
