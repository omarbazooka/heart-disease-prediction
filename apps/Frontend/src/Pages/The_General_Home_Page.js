import React, { useState, useEffect } from "react";
import "../Pages/The_General_Home_Page.css";
import "../fontawesome-free-7.0.0-web/css/all.min.css";

import nabd from "../Image/nabd.png";
import heart_icons from "../Image/heart_icons.png";
import Box from "../Image/Box.png";

import { Link, useNavigate } from "react-router-dom";
import { getLatestLabTest, startPrediction } from "../services/api";

function Home() {
  const navigate = useNavigate();

  const [latestLabTest, setLatestLabTest] = useState(null);
  const [loading, setLoading] = useState(true);

  const getStoredNationalId = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser).national_id;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const fetchLatestLabTest = async () => {
      try {
        const token = localStorage.getItem("token");
        const nationalId = getStoredNationalId();

        if (!token || !nationalId) {
          setLoading(false);
          return;
        }

        const response = await getLatestLabTest(
          nationalId
        );

        if (response.success) {
          setLatestLabTest(response.data);
        }

      } catch (error) {
        console.error(
          "Error fetching latest lab test:",
          error
        );

      } finally {
        setLoading(false);
      }
    };

    fetchLatestLabTest();
  }, []);

  const handleStartPrediction = async () => {
    try {
      const token =
        localStorage.getItem("token");

      const nationalId =
        getStoredNationalId();

      if (!token) {
        alert("Please Login First");

        navigate("/login");

        return;
      }

      if (!nationalId) {
        alert(
          "User national ID is missing. Please log in again."
        );

        navigate("/login");

        return;
      }

      const predictionResponse =
        await startPrediction();

      if (
        predictionResponse?.status === 401
      ) {
        alert(
          "Session expired or invalid token. Please log in again."
        );

        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "user"
        );

        navigate("/login");

        return;
      }

      if (!predictionResponse?.success) {
        if (
          predictionResponse?.message
            ?.toLowerCase()
            .includes("no lab test")
        ) {
          alert(
            "No lab test found. Please visit a trusted medical lab first."
          );

          navigate("/prediction");

        } else {
          alert(
            predictionResponse?.message ||
            "Prediction failed"
          );
        }

        return;
      }

      const prediction =
        predictionResponse.data;

      localStorage.setItem(
        "prediction",
        JSON.stringify(prediction)
      );

      localStorage.setItem(
        "prediction_id",
        prediction.prediction_id
      );

      if (!prediction) {
        navigate("/prediction");
        return;
      }

      const probability =
        prediction.probability ||
        prediction.prediction_percentage ||
        0;

      if (probability < 70) {
        navigate("/have_no_risk");
      } else {
        navigate("/have_risk");
      }

    } catch (error) {
      console.error(error);

      if (
        error.response?.status === 401
      ) {
        alert(
          "Session Expired, Please Login Again"
        );

        navigate("/login");

      } else {
        alert(
          "Something Went Wrong"
        );
      }
    }
  };

  return (
    <div className="home-page">

      {/* Hero Section */}
      <section className="hero text-center">

        <h2 className="hero-title">
          Heart Disease Prediction Tool
        </h2>

        <p className="hero-subtitle">
          Advanced AI-Powered Analysis To Assess
        </p>

        <p className="hero-subtitle">
          Your Heart Health Risk Factors
        </p>

        <div className="hero-buttons">

          <button
            onClick={handleStartPrediction}
            className="btn custom-btn px-4 py-2 rounded-pill me-3"
          >
            Start Prediction →
          </button>

          <Link
            to="/learnmore"
            className="btn learn btn-outline-dark rounded-pill"
          >
            Learn More →
          </Link>

        </div>

      </section>

      {/* Prediction Result */}
      {loading ? (

        <section className="container my-5">

          <div className="row justify-content-center">

            <div className="col-md-8 text-center">

              <div
                className="spinner-border text-primary"
                role="status"
              >
                <span className="visually-hidden">
                  Loading...
                </span>
              </div>

              <p>
                Loading your prediction data...
              </p>

            </div>

          </div>

        </section>

      ) : (

        latestLabTest &&
        latestLabTest.prediction_result && (

          <section className="container my-5">

            <div className="row justify-content-center">

              <div className="col-md-8">

                <div className="card shadow">

                  <div className="card-body text-center">

                    <h3 className="card-title">
                      Your Latest Prediction Result
                    </h3>

                    <div
                      className={`alert ${
                        latestLabTest.prediction_result ===
                        "High Risk"
                          ? "alert-danger"
                          : "alert-success"
                      } mt-3`}
                    >

                      <h4>
                        {latestLabTest.prediction_result}
                      </h4>

                      {latestLabTest.prediction_percentage && (
                        <p>
                          Risk Percentage:
                          {" "}
                          {latestLabTest.prediction_percentage.toFixed(
                            2
                          )}
                          %
                        </p>
                      )}

                    </div>

                    <p className="text-muted">
                      Last updated:
                      {" "}
                      {new Date(
                        latestLabTest.createdAt
                      ).toLocaleDateString()}
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </section>
        )
      )}

      {/* Features */}
      <section className="container my-5">

        <div className="row align-items-center justify-content-center text-center g-4">

          <div className="col-md-3">

            <div className="feature-card">

              <div className="icon">
                <img
                  src={nabd}
                  className="image_iconn"
                  alt="icon"
                />
              </div>

              <h5 className="Title_card">
                Accurate Analysis
              </h5>

              <p className="cap_Card">
                Advanced Machine Learning Models
                Trained On Extensive Medical Data
              </p>

            </div>

          </div>

          <div className="col-md-3">

            <div className="feature-card">

              <div className="icon">
                <img
                  src={heart_icons}
                  className="image_iconn"
                  alt="icon"
                />
              </div>

              <h5 className="Title_card">
                Health Insights
              </h5>

              <p className="cap_Card">
                Detailed Risk Factor Analysis
              </p>

              <p className="cap_Card">
                And Personalized Health Recommendations
              </p>

            </div>

          </div>

          <div className="col-md-3">

            <div className="feature-card">

              <div className="icon">
                <img
                  src={Box}
                  className="image_iconn"
                  alt="icon"
                />
              </div>

              <h5 className="Title_card">
                Early Detection
              </h5>

              <p className="cap_Card">
                Identify Potential Heart Health Concerns
                Before They Become Serious
              </p>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Home;
import React from "react";

import React, { useState } from "react";
import "../Pages/The_General_Home_Page.css";
import "../fontawesome-free-7.0.0-web/css/all.min.css";
import nabd from "../Image/nabd.png";
import heart_icons from "../Image/heart_icons.png";
import Box from "../Image/Box.png";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ecgLoading, setEcgLoading] = useState(false);

  const handleStartPrediction = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please Login First");
        setLoading(false);
        return;
      }

      // Check lab status
      const statusRes = await axios.get("http://localhost:5000/api/labtests/me/status", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!statusRes.data.data.hasLabTests) {
        // No Data -> go to prediction page (labs will appear here)
        navigate("/prediction");
        return;
      }

      // Has Data -> start prediction
      const predRes = await axios.post("http://localhost:5000/api/predictions/start", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const predictionData = predRes.data.data;
      localStorage.setItem("prediction", JSON.stringify(predictionData));
      localStorage.setItem("prediction_id", predictionData.prediction_id);

      if (predictionData.probability < 70) {
        navigate("/have_no_risk");
      } else {
        navigate("/have_risk");
      }
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Prediction Failed");
      navigate("/prediction"); // fallback
    } finally {
      setLoading(false);
    }
  };

  const handleStartEcg = async () => {
    try {
      setEcgLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please Login First");
        return;
      }
      const statusRes = await axios.get("http://localhost:5000/api/ecg/me/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!statusRes.data.data.hasEcgTests) {
        navigate("/ecg");
        return;
      }
      const predRes = await axios.post(
        "http://localhost:5000/api/ecg/start",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const ecgData = predRes.data.data;
      localStorage.setItem("ecg_prediction", JSON.stringify(ecgData));
      localStorage.setItem("ecg_test_id", ecgData.ecg_test_id);
      navigate("/ecg");
    } catch (err) {
      console.log(err);
      if (err.response?.data?.code === "NO_ECG" || err.response?.status === 404) {
        navigate("/ecg");
      } else {
        alert(err.response?.data?.message || "ECG analysis failed");
        navigate("/ecg");
      }
    } finally {
      setEcgLoading(false);
    }
  };

  return (
    <div className="home-page">
      {" "}
      
      {/* Hero Section */}{" "}
      <section className="hero text-center">
        {" "}
        <h2 className="hero-title">Heart Disease Prediction Tool</h2>{" "}
        <p className="hero-subtitle">Advanced AI-Powered Analysis To Assess </p>{" "}
        <p className="hero-subtitle">Your Heart Health Risk Factors</p>{" "}
        <div className="hero-buttons">
          <div className="hero-buttons-top">
            <button
              onClick={handleStartPrediction}
              disabled={loading || ecgLoading}
              className="btn custom-btn px-4 py-2 rounded-pill"
            >
              {loading ? "Loading..." : "Start Prediction →"}
            </button>
            <button
              type="button"
              onClick={handleStartEcg}
              disabled={loading || ecgLoading}
              className="btn btn-ecg-home px-4 py-2 rounded-pill"
            >
              {ecgLoading ? "Loading..." : "Start ECG →"}
            </button>
          </div>
          <div className="hero-buttons-bottom">
            <Link to="/learnmore" className="btn learn btn-outline-dark rounded-pill">
              Learn More →
            </Link>
          </div>
        </div>{" "}
      </section>{" "}
      {/* Features Section */}
      <section className="container my-5">
        <div className="row align-items-stretch justify-content-center text-center g-4">
          {/* Card 1 */}
          <div className="col-md-4">
            <div className="feature-card">
              <div className="icon">
                <img src={nabd} className="image_iconn" alt="accurate analysis icon" />

              </div>
              <h5 className="Title_card">Accurate Analysis</h5>
              <p className="cap_Card">
                Advanced Machine Learning Models Trained On Extensive Medical
                Data
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="col-md-4">
            <div className="feature-card">
              <div className="icon">
                <img src={heart_icons} className="image_iconn" alt="health insights icon" />

              </div>
              <h5 className="Title_card">Health Insights</h5>
              <p className="cap_Card">
                Detailed Risk Factor Analysis And Personalized Health Recommendations
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="col-md-4">
            <div className="feature-card">
              <div className="icon">
                <img src={Box} className="image_iconn" alt="early detection icon" />

              </div>
              <h5 className="Title_card">Early Detection</h5>
              <p className="cap_Card">
                Identify Potential Heart Health Concerns Before They Become
                Serious
              </p>
            </div>
          </div>
        </div>
      </section>
      
    </div>
  );
}
export default Home;
