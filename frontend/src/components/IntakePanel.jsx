import { AlertTriangle, FileSpreadsheet, Layers3, Loader2, LockKeyhole, Network, Sparkles, UploadCloud } from "lucide-react";
import { formatBytes } from "../lib/formatters";
import { GovernanceItem } from "./shared";

export function IntakePanel({ file, isUploading, error, onFileChange, onUpload }) {
  return (
    <div className="upload-panel">
      <div className="panel-title">
        <FileSpreadsheet size={22} />
        <div>
          <h2>Dataset Intake</h2>
          <p>Secure ingestion with compact profiling for Agent 1.</p>
        </div>
      </div>

      <label className="dropzone">
        <input type="file" accept=".csv,text/csv" onChange={(event) => onFileChange(event.target.files?.[0] || null)} />
        <UploadCloud size={34} />
        <span>{file ? file.name : "Choose a CSV file"}</span>
        <small>{file ? `${formatBytes(file.size)} ready to profile` : "Full file upload, compact Agent 1 context"}</small>
      </label>

      <button className="primary-button" disabled={!file || isUploading} onClick={onUpload}>
        {isUploading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
        {isUploading ? "Profiling dataset" : "Run Agent 1"}
      </button>

      <div className="control-stack">
        <GovernanceItem icon={<LockKeyhole size={18} />} title="Full file retained" body="Only schema, summaries, and samples are prepared for agent reasoning." />
        <GovernanceItem icon={<Network size={18} />} title="Agent 2 paused" body="Modeling is blocked until the variable package is approved." />
        <GovernanceItem icon={<Layers3 size={18} />} title="Reusable handoff" body="The reviewed package becomes the contract for downstream agents." />
      </div>

      {error && (
        <div className="error-box">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}
    </div>
  );
}
