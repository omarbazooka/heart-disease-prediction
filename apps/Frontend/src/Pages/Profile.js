import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCamera, FaEdit, FaSave, FaTimes, FaEye, FaEyeSlash } from "react-icons/fa";

import "./Profile.css";
import defaultProfile from "../Image/prof.png";

const Profile = () => {
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [labTests, setLabTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profilePic, setProfilePic] = useState(localStorage.getItem("profilePic") || "");

  // ================= EDIT STATES =================
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [editErrors, setEditErrors] = useState({});

  // ================= GET USER & LAB TESTS =================
  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (!savedUser) {
      navigate("/login");
      return;
    }
    setUser(savedUser);
    setEditForm({
      username: savedUser.username || "",
      email: savedUser.email || "",
      password: "",
    });
    fetchLabTests(savedUser.national_id);
  }, [navigate]);

  const fetchLabTests = async (national_id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/labtests/patient/${national_id}`);
      setLabTests(res.data.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // ================= HANDLE IMAGE UPLOAD =================
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        localStorage.setItem("profilePic", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ================= EDIT HANDLERS =================
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setEditErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateEdit = () => {
    const errors = {};
    if (!editForm.username.trim()) {
      errors.username = "Username is required";
    } else if (editForm.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    if (!editForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      errors.email = "Invalid email format";
    }
    if (editForm.password && editForm.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    return errors;
  };

  const handleSave = async () => {
    const errors = validateEdit();
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      const payload = {
        username: editForm.username,
        email: editForm.email,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password;
      }

      const res = await axios.put(
        `http://localhost:5000/api/users/${user.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedUser = { ...user, ...res.data.data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditForm({
        username: updatedUser.username,
        email: updatedUser.email,
        password: "",
      });
      setIsEditing(false);
      setEditErrors({});
      alert("Profile updated successfully!");
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      username: user.username || "",
      email: user.email || "",
      password: "",
    });
    setEditErrors({});
    setIsEditing(false);
  };

  if (loading || !user) {
    return (
      <div className="profile-dashboard d-flex justify-content-center align-items-center">
        <h2>Loading...</h2>
      </div>
    );
  }

  // ================= EXTRACT LATEST LAB TEST INFO =================
  const latestTest = labTests[0]?.features || {};
  const age = latestTest.age || "N/A";
  const gender = latestTest.sex === 1 ? "Male" : latestTest.sex === 0 ? "Female" : "N/A";

  return (
    <div className="profile-dashboard">
      
      {/* HEADER */}
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
      </div>

      <div className="profile-content">
        
        {/* ================= LEFT SIDEBAR ================= */}
        <div className="profile-sidebar">
          <div className="profile-img-container">
            <img 
              src={profilePic || defaultProfile} 
              alt="Profile" 
              className="profile-img" 
            />
            <label className="upload-btn">
              <FaCamera />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                hidden 
              />
            </label>
          </div>
          
          <h2 className="profile-name">{user.username}</h2>
          <span className="status-badge">Active</span>

          <div className="profile-stats">
            <div className="stat-row">
              <span>Gender</span> 
              <strong>{gender}</strong>
            </div>
            <div className="stat-row">
              <span>Age</span> 
              <strong>{age}</strong>
            </div>
            <div className="stat-row">
              <span>National ID</span> 
              <strong>{user.national_id}</strong>
            </div>
          </div>
        </div>

        {/* ================= RIGHT MAIN AREA ================= */}
        <div className="profile-main">
          
          {/* PERSONAL DETAILS CARD */}
          <div className="dashboard-card">
            <div className="card-tabs">
              <span className="active-tab">General</span>
              {!isEditing ? (
                <button className="edit-action-btn" onClick={() => setIsEditing(true)}>
                  <FaEdit /> Edit
                </button>
              ) : (
                <div className="edit-actions">
                  <button 
                    className="save-action-btn" 
                    onClick={handleSave} 
                    disabled={saving}
                  >
                    <FaSave /> {saving ? "Saving..." : "Save"}
                  </button>
                  <button className="cancel-action-btn" onClick={handleCancel}>
                    <FaTimes /> Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="card-body">
              <h3 className="section-title">PERSONAL DETAILS</h3>
              
              <div className="details-grid">
                
                {/* USERNAME */}
                <div className="detail-item">
                  <label>Username</label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        name="username"
                        value={editForm.username}
                        onChange={handleEditChange}
                        className={`edit-input ${editErrors.username ? "input-error" : ""}`}
                      />
                      {editErrors.username && (
                        <span className="error-text">{editErrors.username}</span>
                      )}
                    </>
                  ) : (
                    <p>{user.username}</p>
                  )}
                </div>

                {/* EMAIL */}
                <div className="detail-item">
                  <label>Email</label>
                  {isEditing ? (
                    <>
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleEditChange}
                        className={`edit-input ${editErrors.email ? "input-error" : ""}`}
                      />
                      {editErrors.email && (
                        <span className="error-text">{editErrors.email}</span>
                      )}
                    </>
                  ) : (
                    <p>{user.email}</p>
                  )}
                </div>

                {/* PASSWORD */}
                <div className="detail-item">
                  <label>Password</label>
                  {isEditing ? (
                    <>
                      <div className="password-input-wrapper">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Leave empty to keep current"
                          value={editForm.password}
                          onChange={handleEditChange}
                          className={`edit-input ${editErrors.password ? "input-error" : ""}`}
                        />
                        <button
                          type="button"
                          className="toggle-password-btn"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      {editErrors.password && (
                        <span className="error-text">{editErrors.password}</span>
                      )}
                    </>
                  ) : (
                    <p>********</p>
                  )}
                </div>

                {/* ACCOUNT CREATED */}
                <div className="detail-item">
                  <label>Account Created</label>
                  <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* LAB TESTS TABLE CARD */}
          <div className="dashboard-card">
            <div className="card-body">
              <h3 className="section-title">My Lab Tests</h3>
              
              <div className="table-responsive">
                <table className="lab-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Lab Name</th>
                      <th>Age</th>
                      <th>Cholesterol</th>
                      <th>BP</th>
                      <th>Max HR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labTests.length > 0 ? (
                      labTests.map(test => (
                        <tr key={test.id}>
                          <td>{new Date(test.createdAt).toLocaleDateString()}</td>
                          <td>{test.lab?.name || "Unknown Lab"}</td>
                          <td>{test.features?.age}</td>
                          <td>{test.features?.cholesterol}</td>
                          <td>{test.features?.resting_bp_s}</td>
                          <td>{test.features?.max_heart_rate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                          No lab tests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;