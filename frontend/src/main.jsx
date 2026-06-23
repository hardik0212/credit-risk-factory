import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Database,
  FileSpreadsheet,
  Fingerprint,
  Layers3,
  Loader2,
  LockKeyhole,
  Network,
  Send,
  ShieldCheck,
  SlidersHorizontal,
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
      <nav className="topbar">
        <div className="brand-mark">
          <Building2 size={20} />
          <span>Credit Risk Factory</span>
        </div>
        <div className="topbar-actions">
          <span>Dataset onboarding</span>
          <span>Human governed</span>
          <span>API gated</span>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <ShieldCheck size={18} />
            Executive model factory
          </div>
          <h1>Credit data readiness, governed before the first API call.</h1>
          <p>
            A business-facing control room for profiling a new lending dataset, reviewing AI
            recommendations, and approving the schema package before downstream agents take over.
          </p>
          <div className="hero-stats">
            <StatStrip label="Review stage" value={confirmedSchema ? "Approved" : profile ? "In review" : "Awaiting data"} />
            <StatStrip label="Data movement" value="Local file" />
            <StatStrip label="Next gate" value="Schema approval" />
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-header">
            <span>Factory workflow</span>
            <strong>{confirmedSchema ? "Schema package ready" : "Pre-submission review"}</strong>
          </div>
          <PipelineStep icon={<UploadCloud />} label="Intake" active />
          <PipelineStep icon={<Database />} label="Profile" active={Boolean(profile)} />
          <PipelineStep icon={<SlidersHorizontal />} label="Review" active={Boolean(profile)} />
          <PipelineStep icon={<Send />} label="Submit" active={Boolean(confirmedSchema)} />
        </div>
      </section>

      <section className="workspace">
        <div className="upload-panel">
          <div className="panel-title">
            <FileSpreadsheet size={22} />
            <div>
              <h2>Dataset Intake</h2>
              <p>Secure ingestion with compact profiling for the agent layer.</p>
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

          <div className="control-stack">
            <GovernanceItem icon={<LockKeyhole size={18} />} title="Full file retained" body="Only schema, summaries, and samples are prepared for the agent." />
            <GovernanceItem icon={<Network size={18} />} title="API call paused" body="Submission is blocked until business review is confirmed." />
            <GovernanceItem icon={<Layers3 size={18} />} title="Reusable package" body="The reviewed profile becomes the handoff contract for later agents." />
          </div>

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
                <Metric label="Governance flags" value={(changedTypeCount + excludedColumnCount + leakageCount).toLocaleString()} />
              </div>

              <div className="recommendation-card">
                <div className="recommendation-icon">
                  <BadgeCheck size={24} />
                </div>
                <div>
                  <h2>{target ? `Recommended target: ${target}` : "Target needs review"}</h2>
                  <p>
                    AI has prepared the schema recommendation. The business reviewer can confirm the
                    target, override types, exclude fields, and approve the package for the next agent.
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
                <InsightList
                  title="Reviewer Changes"
                  icon={<SlidersHorizontal size={18} />}
                  items={[`${changedTypeCount} type overrides`, `${excludedColumnCount} excluded fields`]}
                  empty="No reviewer changes"
                />
                <InsightList
                  title="Submission Status"
                  icon={<Send size={18} />}
                  items={[confirmedSchema ? "Approved for next agent" : "Awaiting schema approval"]}
                  empty="Awaiting schema approval"
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

function StatStrip({ label, value }) {
  return (
    <div className="stat-strip">
      <span>{label}</span>
      <strong>{value}</strong>
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

function GovernanceItem({ icon, title, body }) {
  return (
    <div className="governance-item">
      <div>{icon}</div>
      <span>{title}</span>
      <p>{body}</p>
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
