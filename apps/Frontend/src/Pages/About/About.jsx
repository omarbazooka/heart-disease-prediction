import React from "react";
import "./About.css";

export default function About() {
  const team = [
    { name: "Youssef Amr Saeed", role: "Backend Developer" },
    { name: "Youssef Mohamed Bassiony", role: "Backend Developer" },
    { name: "Abdelrahman Essam Sheredah", role: "Backend Developer" },
    { name: "Omar Ahmed Mohamed", role: "AI Engineer" },
    { name: "Marwan Yaser Elserafy", role: "AI Engineer" },
    { name: "Ranim Mohamed Elsayed", role: "Frontend Developer" },
    { name: "Samar Hamza Mbry", role: "Frontend Developer" }
  ];

  return (
    <div className="about-page-container">
      <div className="about-hero">
        <h1 className="about-title">About Nabdak</h1>
        <p className="about-subtitle">Graduation Project 2026</p>
      </div>

      <div className="about-card max-width-card">
        <h2 className="section-title">Our Graduation Project</h2>
        <p className="project-description">
          We are IT students from <strong>EELU Alexandria University</strong>, class of 2026. 
          Nabdak is our Graduation Project, aiming to leverage advanced artificial intelligence 
          and machine learning models to help predict cardiovascular disease risks. 
          By integrating seamless lab uploads, dynamic patient dashboards, and instant AI-generated 
          medical PDF reports, Nabdak provides a hybrid support tool for early heart care detection.
        </p>

        <h3 className="section-title" style={{ marginTop: "40px" }}>The Team</h3>
        <div className="team-grid">
          {team.map((member, idx) => (
            <div key={idx} className="team-member-card">
              <div className="member-avatar">
                {member.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <h4 className="member-name">{member.name}</h4>
              <p className="member-role">{member.role}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
