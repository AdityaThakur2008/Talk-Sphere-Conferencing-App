import React, { useState } from "react";
import "../App.css";
import { Link, useNavigate } from "react-router-dom";

export default function LandingPage() {
  const router = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false); 

  return (
    <div className="landingPageContainer">
      <nav>
        <div className="NameHeading">
          <h2>Talk Sphere</h2>
        </div>

        <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          &#9776;
        </div>

        <div className={`NavLinks ${menuOpen ? "active" : ""}`}>
          <p onClick={() => router("/aljk23")}>Join as Guest</p>
          <p onClick={() => router("/auth")}>Register</p>
          <div className="btn" onClick={() => router("/auth")} role="button">
            <p>Login</p>
          </div>
        </div>
      </nav>

      <div className="landingMainContainer">
        <div>
          <h1>
            <span style={{ color: "#FF9839" }}>Connect</span> with your loved
            Ones
          </h1>
          <p>Cover a distance by Talk Sphere</p>

          <div role="button" onClick={() => router("/home")} className="center-btn">
            <Link >Get Started</Link>
          </div>
        </div>
        <div>
          <img src="/images/mobile.png" alt="App Preview" />
        </div>
      </div>
    </div>
  );
}
