import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LabPortal.css";
import { FaUpload, FaFileCsv, FaTimes } from "react-icons/fa";

const LabPortal = () => {
  const [lab, setLab] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const labData = localStorage.getItem("lab");
    if (!labData) {
      navigate("/login");
      return;
    }
    setLab(JSON.parse(labData));
  }, [navigate]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 5) {
      alert("You can only upload up to 5 CSV files at a time.");
      return;
    }
    setFiles((prev) => [...prev, ...selectedFiles].slice(0, 5));
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Parse the first data row of a CSV file in the browser to inspect lab_id/lab_code.
  const readCsvFirstRow = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || "");
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length < 2) {
            return reject(new Error("CSV contains no data rows"));
          }
          const headers = lines[0].split(",").map((h) => h.trim());
          const values = lines[1].split(",").map((v) => v.trim());
          const row = {};
          headers.forEach((h, i) => { row[h] = values[i]; });
          resolve(row);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert("Please select at least one CSV file.");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      // ================= CLIENT-SIDE LAB MATCH CHECK =================
      const validFiles = [];
      const clientFailures = [];

      for (const file of files) {
        try {
          const row = await readCsvFirstRow(file);
          const csvLabId = String(row.lab_id || "").trim();
          const csvLabCode = String(row.lab_code || "").trim();

          if (csvLabId !== lab.id || csvLabCode !== lab.lab_code) {
            clientFailures.push({
              file: file.name,
              error: `This CSV belongs to a different lab. You can only upload CSVs for "${lab.name}" (${lab.lab_code}).`,
            });
            continue;
          }
          validFiles.push(file);
        } catch (e) {
          clientFailures.push({
            file: file.name,
            error: e.message || "Failed to read CSV",
          });
        }
      }

      if (validFiles.length === 0) {
        setResult({
          success: false,
          message: "No matching CSV files were uploaded.",
          failures: clientFailures,
          failuresCount: clientFailures.length,
        });
        setLoading(false);
        return;
      }

      const formData = new FormData();
      validFiles.forEach((file) => {
        formData.append("files", file);
      });

      // Using the required x-lab-key header as per API docs + x-lab-id to enforce lab match on backend
      const res = await axios.post("http://localhost:5000/api/lab-portal/upload-csvs", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-lab-key": "admin-key-change-me",
          "x-lab-id": lab.id,
        },
      });

      const combined = {
        ...res.data,
        failures: [...(res.data.failures || []), ...clientFailures],
        failuresCount: (res.data.failuresCount || 0) + clientFailures.length,
      };
      setResult(combined);
      setFiles([]);
    } catch (err) {
      console.error(err);
      setResult(err.response?.data || { success: false, message: "Upload failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("lab");
    navigate("/login");
  };

  if (!lab) return null;

  return (
    <div className="lab-portal-container">
      <div className="lab-portal-header">
        <h2>Welcome, {lab.name}</h2>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>

      <div className="lab-portal-card">
        <h3 className="portal-title">Lab CSV Upload</h3>
        <p className="portal-subtitle">Upload 1 to 5 patient CSV files at once.</p>

        <div className="upload-area">
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".csv"
            onChange={handleFileChange}
            className="file-input-hidden"
          />
          <label htmlFor="file-upload" className="upload-label">
            <FaUpload className="upload-icon" />
            <span>Click to select CSV files</span>
          </label>
        </div>

        {files.length > 0 && (
          <div className="selected-files">
            <h4>Selected Files:</h4>
            <ul>
              {files.map((file, index) => (
                <li key={index}>
                  <FaFileCsv className="csv-icon" />
                  <span className="file-name">{file.name}</span>
                  <button className="btn-remove" onClick={() => removeFile(index)}>
                    <FaTimes />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button 
          className="btn-gradient btn-upload" 
          onClick={handleUpload} 
          disabled={loading || files.length === 0}
        >
          {loading ? "Uploading..." : "Upload CSVs"}
        </button>

        {result && (
          <div className={`result-box ${result.success ? "success" : "error"}`}>
            <h4>{result.message}</h4>
            
            {result.createdCount > 0 && (
              <p className="success-text">Successfully uploaded: {result.createdCount} files</p>
            )}
            
            {result.failures && result.failures.length > 0 && (
              <div className="failures-list">
                <p className="error-text">Failed uploads:</p>
                <ul>
                  {result.failures.map((fail, i) => (
                    <li key={i}>
                      <strong>{fail.file}:</strong> {fail.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LabPortal;