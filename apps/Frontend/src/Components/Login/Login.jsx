import React, { useState } from "react";
import "./Login.css";

import heartImg from "../../assets/heartLog.png";
import logo from "../../assets/Logo.png";

import { FaUser, FaLock } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

import axios from "axios";

const Login = () => {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const validate = (name, value) => {
    let error = "";

    if (name === "username") {
      if (!value.trim()) {
        error = "Username is required";
      } else if (value.length < 3) {
        error = "Username must be at least 3 characters";
      }
    }

    if (name === "password") {
      if (!value.trim()) {
        error = "Password is required";
      } else if (value.length < 6) {
        error = "Password must be at least 6 characters";
      }
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: validate(name, value),
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    setErrors((prev) => ({
      ...prev,
      [name]: validate(name, value),
    }));
  };

  const handleLogin = async () => {
    const usernameError = validate(
      "username",
      form.username
    );

    const passwordError = validate(
      "password",
      form.password
    );

    if (usernameError || passwordError) {
      setErrors({
        username: usernameError,
        password: passwordError,
      });

      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          username: form.username,
          password: form.password,
        }
      );

      alert("Login Successfully");

      const token =
        res.data.token ||
        res.data.data?.token;

      if (token) {
        localStorage.setItem(
          "token",
          token
        );
      }

      localStorage.setItem(
        "user",
        JSON.stringify(
          res.data.data ||
          res.data.user ||
          {}
        )
      );

      setErrors({});

      navigate("/the_general");

    } catch (err) {
      console.log(
        "FULL ERROR =>",
        err.response?.data
      );

      const message =
        err.response?.data?.message ||
        "Invalid username or password";

      setErrors({
        password: message,
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">

        <div className="login-left">
          <div className="login-content">

            <h2>Login Page</h2>

            <div className="input-group">
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                onBlur={handleBlur}
              />

              <FaUser className="input-icon" />

              {errors.username && (
                <span className="error">
                  {errors.username}
                </span>
              )}
            </div>

            <div className="input-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
              />

              <FaLock className="input-icon" />

              {errors.password && (
                <span className="error">
                  {errors.password}
                </span>
              )}
            </div>

            <button
              className="btn-gradient"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Log In"}
            </button>

            <div className="register-link">
              Don't have an account?
              {" "}
              <Link to="/register">
                Register Now
              </Link>
            </div>

          </div>
        </div>

        <div
          className="login-right"
          style={{
            backgroundImage:
              `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url(${heartImg})`,
          }}
        >
          <div className="logo-title-wrapper">
            <img
              src={logo}
              className="logo"
              alt="logo"
            />

            <h1>
              Heart Diseases
            </h1>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;