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
  const [chartUrl, setChartUrl] = useState(null);
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
        setChartUrl((u) => {
          if (u) URL.revokeObjectURL(u);
          return null;
        });
        return;
      }
      const id = st.data.data.latestEcgTestId;
      const det = await axios.get(`${API}/ecg/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetail(det.data.data);
      if (det.data.data.inference_status === "ok" && det.data.data.top_5?.length) {
        const chart = await axios.get(`${API}/ecg/chart/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        });
        setChartUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(chart.data);
        });
      } else {
        setChartUrl((u) => {
          if (u) URL.revokeObjectURL(u);
          return null;
        });
      }
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

        {chartUrl && (
          <div>
            <p className="report-title" style={{ marginTop: "1.5rem" }}>
              Top 5 ECG findings
            </p>
            <div className="ecg-chart-wrap">
              <img src={chartUrl} alt="Top 5 ECG diagnosis chart" />
            </div>
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
