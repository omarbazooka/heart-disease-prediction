import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import logo from "../../Image/logo.png";
import profile from "../../Image/profile.png";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogged, setIsLogged] = useState(false);

  const isProfilePage = location.pathname === "/profile";

  useEffect(() => {
    const user = localStorage.getItem("user");
    setIsLogged(!!user);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    setIsLogged(false);
    navigate("/heart");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light px-4 py-2">

      {/* Logo */}
      <Link
        to="/the_general"
        className="d-flex align-items-center gap-2 text-decoration-none"
      >
        <img src={logo} className="logo" alt="logo" />
        <span className="brand">Heart Diseases</span>
      </Link>

      {/* Toggle Button */}
      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarContent"
        aria-controls="navbarContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>

      {/* Navbar Content */}
      <div
        className="collapse navbar-collapse"
        id="navbarContent"
      >
        {/* Links */}
        <ul className="navbar-nav mx-auto text-center gap-lg-4">
          <li className="nav-item">
            <Link className="nav-link" to="/the_general">
              HOME
            </Link>
          </li>

          <li className="nav-item">
            <Link className="nav-link" to="/docs">
              DOCS
            </Link>
          </li>

          <li className="nav-item">
            <Link className="nav-link" to="/heart">
              HEART
            </Link>
          </li>

          <li className="nav-item">
            <Link className="nav-link" to="/about">
              ABOUT
            </Link>
          </li>
        </ul>

        {/* Right Buttons */}
        <div className="d-flex flex-column flex-lg-row justify-content-center align-items-center gap-2 mt-3 mt-lg-0">

          {!isLogged ? (
            <>
              <button
                onClick={() => navigate("/register")}
                className="custom-btn rounded-pill px-4 py-2"
              >
                Register
              </button>

              <button
                onClick={() => navigate("/login")}
                className="custom-btn rounded-pill px-4 py-2"
              >
                Login
              </button>
            </>
          ) : isProfilePage ? (
            <button
              onClick={handleLogout}
              className="custom-btn-outline rounded-pill px-4 py-2"
            >
              Logout
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/profile")}
                className="custom-btn rounded-pill px-3 py-2 d-flex align-items-center gap-2"
              >
                My Dashboard
                <img
                  src={profile}
                  className="profile"
                  alt="profile"
                />
              </button>

              <button
                onClick={handleLogout}
                className="custom-btn-outline rounded-pill px-4 py-2"
              >
                Log out
              </button>
            </>
          )}

        </div>
      </div>
    </nav>
  );
}