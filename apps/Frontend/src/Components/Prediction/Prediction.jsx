import React, { useState, useEffect } from "react";
import axios from "axios";

import "./Prediction.css";

import { Link, useNavigate } from "react-router-dom";
import { BsGeoAltFill } from "react-icons/bs";
import { getLatestLabTest, startPrediction } from "../../services/api";

const Prediction = () => {
  // ================= STATE =================
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState([]);
  const [hasLabTests, setHasLabTests] = useState(false);
  const [latestLabTest, setLatestLabTest] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const navigate = useNavigate();

  const getStoredNationalId = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser).national_id;
    } catch {
      return null;
    }
  };

  // ================= GET LABS + STATUS + LOCATION =================
  useEffect(() => {
    fetchLabs();
    fetchLatestLabTest();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },

      (error) => {
        console.log(error);
      }
    );
  }, []);

  // ================= FETCH LABS =================
  const fetchLabs = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/labs"
      );

      console.log("LABS => ", res.data);

      setLabs(res.data.data);

    } catch (err) {
      console.log(err);
    }
  };

  // ================= CHECK LATEST LAB TEST =================
  const fetchLatestLabTest = async () => {
    try {
      const token = localStorage.getItem("token");
      const nationalId = getStoredNationalId();

      if (!token || !nationalId) return null;

      const res = await getLatestLabTest(nationalId);

      if (res?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");

        return null;
      }

      if (res?.success && res.data) {
        setHasLabTests(true);

        setLatestLabTest(res.data);

        setResult({
          probability: res.data.prediction_percentage,

          decision_label:
            res.data.prediction_result ||
            (res.data.prediction_percentage >= 70
              ? "High Risk"
              : "Low Risk"),
        });

        return res.data;
      }

      setHasLabTests(false);

      return null;

    } catch (err) {
      console.log(err);

      return null;
    }
  };

  // ================= START PREDICTION =================
  const handleStartPrediction = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please Login First");

        navigate("/login");

        return;
      }

      const response = await startPrediction();

      if (response?.status === 401) {
        alert(
          "Session expired or invalid token. Please log in again."
        );

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");

        return;
      }

      if (!response?.success) {
        if (
          response?.message
            ?.toLowerCase()
            .includes("no lab test")
        ) {
          alert(
            "No lab test found. Please visit a trusted medical lab first."
          );
        } else {
          alert(
            response?.message ||
            "Prediction failed"
          );
        }

        return;
      }

      const predictionData = response.data;

      localStorage.setItem(
        "prediction",
        JSON.stringify(predictionData)
      );

      localStorage.setItem(
        "prediction_id",
        predictionData.prediction_id
      );

      setResult(predictionData);

      const normalizedPrediction =
        (
          predictionData.decision ||
          predictionData.decision_label ||
          ""
        ).toLowerCase();

      if (
        normalizedPrediction.includes("low") ||
        (
          predictionData.probability != null &&
          predictionData.probability < 70
        )
      ) {
        navigate("/have_no_risk");

      } else if (
        normalizedPrediction.includes("high") ||
        (
          predictionData.probability != null &&
          predictionData.probability >= 70
        )
      ) {
        navigate("/have_risk");

      } else {
        alert(
          "Prediction information is not available."
        );
      }

    } catch (err) {
      console.log(err);

      alert(
        err?.response?.data?.message ||
        err?.message ||
        "Prediction Failed"
      );

    } finally {
      setLoading(false);
    }
  };

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="prediction-page">
        <div className="prediction-card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  // ================= UI =================
  return (
    <div className="prediction-page">
      <div className="prediction-card">

        <h1>
          Heart Disease Prediction Tool
        </h1>

        <p className="subtitle">
          Advanced AI Powered Analysis To Assess
          <br />
          <span>
            Your Heart Health Risk Factors
          </span>
        </p>

        <div className="prediction-buttons">

          <button
            onClick={handleStartPrediction}
            className="btn start"
          >
            Start Prediction →
          </button>

          <Link
            to="/learnmore"
            className="btn learn"
          >
            Learn More →
          </Link>

        </div>

        <p className="report-title">
          The Percentage That You Have Heart Diseases Or Not
          <br />

          <span className="highlight">
            If the percentage is higher than 70%
            it means you have Heart Diseases
          </span>
        </p>

        <div className="report-box">

          <h4>
            {result?.probability != null
              ? `${result.probability}%`
              : "No Prediction Yet"}
          </h4>

          <span>
            {result
              ? result.decision_label
              : hasLabTests
              ? "Ready To Start Prediction"
              : "Please Visit A Trusted Lab First"}
          </span>

        </div>

        <p className="info-text">
          {hasLabTests
            ? "Your Lab Results Are Ready For Prediction"
            : "You Should Go To Trusted Medical Labs So They Can Upload Your Results"}
        </p>

        <div className="labs-section">

          <div className="labs-top">

            <div>
              <h3 className="labs-title">
                Trusted Medical Labs
              </h3>

              <p className="labs-sub">
                There Is Thousands Of Trusted Medical Labs
              </p>
            </div>

          </div>

          <div className="labs-wrapper">

            {labs.map((lab) => (

              <a
                key={lab.id}
                href={
                  userLocation
                    ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${encodeURIComponent(lab.address)}`
                    : `https://www.google.com/maps/search/${encodeURIComponent(lab.address)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="lab-card"
              >

                <div className="lab-content">

                  <div className="lab-title-row">

                    <h4>{lab.name}</h4>

                    <span className="rating-badge">
                      Lab
                    </span>

                  </div>

                  <div className="lab-info">
                    <p>
                      <BsGeoAltFill />
                      {lab.address}
                    </p>
                  </div>

                </div>

              </a>

            ))}

          </div>

        </div>

      </div>
    </div>
  );
};

export default Prediction;