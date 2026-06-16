import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// import { FaCheckCircle } from "react-icons/fa";
import "../Prediction/Prediction.css";
import "./EcgPrediction.css";
import API_BASE_URL from "../../config";

const API = `${API_BASE_URL}/api`;

export default function EcgPrediction() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const st = await axios.get(`${API}/ecg/me/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(st.data.data);
      if (!st.data.data.hasEcgTests) {
        setDetail(null);
        return;
      }
      const id = st.data.data.latestEcgTestId;
      const det = await axios.get(`${API}/ecg/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetail(det.data.data);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load ECG data.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRunAnalysis = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!status?.hasEcgTests) {
      alert("No ECG Data");
      return;
    }
    try {
      setRunning(true);
      const res = await axios.post(
        `${API}/ecg/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.setItem("ecg_prediction", JSON.stringify(res.data.data));
      localStorage.setItem("ecg_test_id", res.data.data.ecg_test_id);
      await load();
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === "NO_ECG" || e.response?.status === 404) {
        alert("No ECG Data");
      } else {
        alert(e.response?.data?.message || "ECG analysis failed.");
      }
    } finally {
      setRunning(false);
    }
  };

  const handleDownloadReport = async () => {
    const token = localStorage.getItem("token");
    const id = detail?.ecg_test_id;
    if (!token || !id) return;
    if (detail?.inference_status !== "ok") {
      alert("Run ECG analysis first to generate a report.");
      return;
    }
    try {
      const res = await axios.get(`${API}/ecg/${id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `ECG_Report_${id}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Could not download ECG report.");
    }
  };

  if (loading) {
    return (
      <div className="prediction-page">
        <div className="prediction-card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  const primaryPct =
    detail?.primary_probability != null ? `${Number(detail.primary_probability).toFixed(2)}%` : "—";

  const diagnosisLine = !status?.hasEcgTests
    ? "No ECG Data"
    : detail?.primary_diagnosis || "Run analysis to see primary finding";

  const showHeartEmoji =
    typeof diagnosisLine === "string" &&
    /\b(normal|norm)\b/i.test(diagnosisLine);

  return (
    <div className="prediction-page">
      <div className="prediction-card">
        <h1>ECG analytics</h1>

        <p className="report-title">
          Primary automated finding
          <br />
          <span className="highlight">
            Probabilities reflect model output, not a clinical diagnosis. Always follow up with your physician.
          </span>
        </p>

        <div className="ecg-result-card">
          <p className="ecg-result-label">Your primary ECG finding confidence :</p>
          <h2 className="ecg-result-value">{primaryPct}</h2>
          <p className="ecg-result-status ecg-result-status-row">
            {/* <FaCheckCircle aria-hidden /> */}
            <span>
              {diagnosisLine}
              {showHeartEmoji ? " ❤️" : ""}
            </span>
          </p>
        </div>

        {error && <p className="info-text" style={{ color: "#b91c1c" }}>{error}</p>}

        <p className="info-text">
          {!status?.hasEcgTests
            ? "Ask your medical lab to upload your ECG (.dat + .hea) to your national ID."
            : "Use Start ECG to run or refresh AI analysis on your latest recording."}
        </p>

        {status?.hasEcgTests && (
          <div className="ecg-actions" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="btn start"
              onClick={handleRunAnalysis}
              disabled={running}
            >
              {running ? "Analyzing..." : "Start ECG Analysis →"}
            </button>
          </div>
        )}

        {detail?.top_5?.length > 0 && (
          <div>
            <p className="report-title" style={{ marginTop: "1.5rem" }}>
              Top 5 ECG findings
            </p>
            <InteractiveEcgChart data={detail.top_5} />
            <div className="ecg-actions">
              <button type="button" className="btn start" onClick={handleDownloadReport}>
                Download ECG report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== INTERACTIVE ECG CHART COMPONENT ====================
function InteractiveEcgChart({ data }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger slide-in animation shortly after mount
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) {
    return <p className="no-data">No ECG findings available.</p>;
  }

  const items = data.slice(0, 5); // Limit to top 5 findings
  const maxVal = 100; // Ticks up to 100%

  // Ticks: 0%, 20%, 40%, 60%, 80%, 100%
  const ticks = [0, 20, 40, 60, 80, 100];

  // Layout constants
  const width = 680;
  const height = 280;
  const margin = { left: 210, right: 50, top: 20, bottom: 40 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const rowHeight = chartHeight / items.length;
  const barHeight = 20;

  const scpDescriptions = {
    "NORM": "Normal electrocardiogram showing healthy heart activity and regular rhythm.",
    "SR": "Normal cardiac rhythm where electrical signals originate from the sinus node.",
    "AFIB": "Atrial fibrillation: An irregular and often rapid heart rate that can lead to blood clots, stroke, or heart failure.",
    "SBRAD": "Sinus bradycardia: Slow heart rate (typically below 60 bpm) originating from the sinus node.",
    "STACH": "Sinus tachycardia: Fast heart rate (typically above 100 bpm) originating from the sinus node.",
    "LVH": "Left ventricular hypertrophy: Enlargement and thickening of the heart's main pumping chamber walls.",
    "1AVB": "First-degree atrioventricular block: Electrical signals pass from the atria to the ventricles slower than normal.",
    "CLBBB": "Complete left bundle branch block: Blockage of electrical impulses along the left side of the heart.",
    "CRBBB": "Complete right bundle branch block: Blockage of electrical impulses along the right side of the heart.",
    "PVC": "Premature ventricular contraction: Extra heartbeats that begin in the heart's lower pumping chambers.",
    "PAC": "Premature atrial contraction: Extra heartbeats originating in the heart's upper chambers (atria).",
    "AMI": "Anterior myocardial infarction: Heart attack affecting the front wall of the heart.",
    "IMI": "Inferior myocardial infarction: Heart attack affecting the bottom wall of the heart.",
    "LMI": "Lateral myocardial infarction: Heart attack affecting the side wall of the heart.",
    "ISCAN": "Ischemia: Reduced blood flow and oxygen to the heart muscle.",
    "STTC": "ST-T wave abnormalities suggesting ventricular strain, ischemia, or electrolyte imbalance."
  };

  const handleMouseMove = (e, item) => {
    const card = e.currentTarget.closest(".ecg-chart-card");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltipPos({ x, y });
    setHoveredBar(item);
  };

  // Extract concise clean label for Y-axis (strip code suffix if any)
  const cleanLabel = (label, code) => {
    if (!label) return code || "?";
    const regex = new RegExp(`\\s*\\(${code}\\)\\s*$`, "i");
    return label.replace(regex, "").trim();
  };

  return (
    <div className="ecg-chart-card">
      <div className="ecg-svg-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="ecg-svg">
          <defs>
            {/* Linear gradients for bars */}
            <linearGradient id="ecgBarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
            <linearGradient id="ecgBarGradientHover" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            
            {/* Subtle drop shadow filter for bars */}
            <filter id="ecgBarShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="1" dy="1" stdDeviation="1.5" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Border surrounding the entire plot */}
          <rect
            x={margin.left}
            y={margin.top}
            width={chartWidth}
            height={chartHeight}
            fill="none"
            stroke="#475569"
            strokeWidth="1.2"
          />

          {/* Grid lines (vertical ticks) */}
          {ticks.map((tick, idx) => {
            const x = margin.left + (tick / maxVal) * chartWidth;
            return (
              <g key={idx}>
                {idx > 0 && idx < ticks.length - 1 && (
                  <line
                    x1={x}
                    y1={margin.top}
                    x2={x}
                    y2={margin.top + chartHeight}
                    stroke="#cbd5e1"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                  />
                )}
                <line
                  x1={x}
                  y1={margin.top + chartHeight}
                  x2={x}
                  y2={margin.top + chartHeight + 5}
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <text
                  x={x}
                  y={margin.top + chartHeight + 18}
                  textAnchor="middle"
                  className="ecg-tick-text"
                  fontSize="10.5"
                  fontWeight="500"
                  fill="#64748b"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Render Bars and Labels */}
          {items.map((item, idx) => {
            const rowY = margin.top + idx * rowHeight;
            const barY = rowY + (rowHeight - barHeight) / 2;
            const prob = Number(item.probability) || 0;
            const targetWidth = (prob / maxVal) * chartWidth;
            const currentWidth = animate ? targetWidth : 0;
            
            const isHovered = hoveredBar && hoveredBar.code === item.code;
            const displayLabel = cleanLabel(item.label, item.code);

            return (
              <g key={idx} className="ecg-row-group">
                {/* Row Hover Background */}
                <rect
                  x={margin.left - 200}
                  y={rowY + 1}
                  width={width - 10}
                  height={rowHeight - 2}
                  fill={isHovered ? "rgba(240, 249, 255, 0.6)" : "transparent"}
                  rx="4"
                  style={{ transition: "fill 0.2s ease" }}
                />

                {/* Y-axis Label */}
                <text
                  x={margin.left - 12}
                  y={rowY + rowHeight / 2 + 4}
                  textAnchor="end"
                  className="ecg-y-label"
                  fontSize="11.5"
                  fontWeight={isHovered ? "700" : "600"}
                  fill={isHovered ? "#0f172a" : "#475569"}
                  style={{ transition: "all 0.2s ease" }}
                >
                  {displayLabel.length > 28 ? displayLabel.substring(0, 26) + "..." : displayLabel}
                </text>

                {/* Bar */}
                <rect
                  x={margin.left}
                  y={barY}
                  width={currentWidth}
                  height={barHeight}
                  fill={isHovered ? "url(#ecgBarGradientHover)" : "url(#ecgBarGradient)"}
                  filter="url(#ecgBarShadow)"
                  rx="2"
                  className="ecg-bar"
                  style={{
                    transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1), fill 0.2s ease",
                    cursor: "pointer"
                  }}
                  onMouseMove={(e) => handleMouseMove(e, item)}
                  onMouseLeave={() => setHoveredBar(null)}
                />

                {/* Value overlay inside or next to the bar */}
                {isHovered && prob > 8 && (
                  <text
                    x={margin.left + currentWidth - 6}
                    y={barY + barHeight / 2 + 3.5}
                    textAnchor="end"
                    fontSize="9.5"
                    fontWeight="700"
                    fill="#ffffff"
                    pointerEvents="none"
                  >
                    {prob.toFixed(1)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Tooltip */}
      {hoveredBar && (
        <div
          className="ecg-tooltip"
          style={{
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y + 15}px`,
          }}
        >
          <div className="tooltip-header">
            <span className="tooltip-feature-name">{cleanLabel(hoveredBar.label, hoveredBar.code)}</span>
            <span className="tooltip-code-badge">{hoveredBar.code}</span>
          </div>
          <div className="tooltip-body">
            <div className="tooltip-row">
              <span className="tooltip-label">Description:</span>
              <span className="tooltip-value desc">{scpDescriptions[hoveredBar.code] || "Automated diagnosis pattern detected from ECG waveforms."}</span>
            </div>
            <div className="tooltip-row highlight-row">
              <span className="tooltip-label">Confidence Probability:</span>
              <span className="tooltip-value score">{(Number(hoveredBar.probability) || 0).toFixed(2)}%</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Clinical Status:</span>
              <span className={`tooltip-value status ${hoveredBar.code === "NORM" || hoveredBar.code === "SR" ? "normal" : "warning"}`}>
                {hoveredBar.code === "NORM" || hoveredBar.code === "SR" ? (
                  <>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: "4px" }}></i>
                    Normal / Reassuring
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "4px" }}></i>
                    Anomalous Findings (Follow up)
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
