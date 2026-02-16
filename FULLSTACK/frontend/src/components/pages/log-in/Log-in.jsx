import "./log-in.css";
import "../../styles.css";

import { auth } from "../../../server/firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Invalid email" }));
      return false;
    }
    setErrors((prev) => ({ ...prev, email: "" }));
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      setErrors((prev) => ({ ...prev, password: "Password is required" }));
      return false;
    }
    if (password.length < 6) {
      setErrors((prev) => ({ ...prev, password: "Min 6 characters" }));
      return false;
    }
    setErrors((prev) => ({ ...prev, password: "" }));
    return true;
  };

  const succesfullLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail() || !validatePassword()) return;

    setLoading(true);

    try {

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("Logged in user:", userCredential.user);

      navigate("/profile");
    } catch (error) {
      console.error("Login error:", error.message);

      setErrors((prev) => ({
        ...prev,
        password: "Invalid email or password"
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <div className="body1">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <h2>Sign In</h2>
              <p>Enter your credentials to continue</p>
            </div>

            <form className="login-form" noValidate onSubmit={succesfullLogin}>
              <div className={`form-group ${errors.email ? "error" : ""}`}>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={validateEmail}
                    required
                    autoComplete="email"
                  />
                  <label htmlFor="email">Email</label>
                </div>
                <span className="error-message">{errors.email}</span>
              </div>

              <div className={`form-group ${errors.password ? "error" : ""}`}>
                <div className="input-wrapper">
                 <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={validatePassword}
                    required
                  />
                  <label htmlFor="password">Password</label>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span
                      className={`toggle-icon ${
                        showPassword ? "show-password" : ""
                      }`}
                    ></span>
                  </button>
                </div>
                <span className="error-message">{errors.password}</span>
              </div>

              <div className="form-options">
                <div className="remember-wrapper">
                  <input type="checkbox" id="remember" name="remember" />
                  <label htmlFor="remember" className="checkbox-label">
                    <span className="checkmark"></span> Remember me
                  </label>
                </div>
                <Link to="/forgot-password" className="forgot-password">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                className={`login-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                <span className="btn-text">
                  {loading ? "Loading..." : "Sign In"}
                </span>
                <span className="btn-loader"></span>
              </button>
            </form>

            <div className="signup-link">
              <p>
                Don't have an account? <Link to="/register">Create one</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

export default Login;
