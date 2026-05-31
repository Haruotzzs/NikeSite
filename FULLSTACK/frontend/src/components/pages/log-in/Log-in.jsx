import "./log-in.css";
import "../../styles.css";

// Firebase Authentication imports
import { auth } from "../../../server/firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";

/**
 * Login Component
 * Handles user authentication, form validation, and UI feedback.
 */
function Login() {
  const navigate = useNavigate();

  // --- State Hooks ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Toggles password visibility
  const [errors, setErrors] = useState({ email: "", password: "" }); // Stores validation messages
  const [loading, setLoading] = useState(false); // Manages loading state during API calls

  // --- Validation Logic ---

  /**
   * Validates the email format using regex.
   * Updates the error state if validation fails.
   */
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
    setErrors((prev) => ({ ...prev, email: "" })); // Clear error if valid
    return true;
  };

  /**
   * Validates that the password meets minimum length requirements.
   */
  const validatePassword = () => {
    if (!password) {
      setErrors((prev) => ({ ...prev, password: "Password is required" }));
      return false;
    }
    if (password.length < 6) {
      setErrors((prev) => ({ ...prev, password: "Min 6 characters" }));
      return false;
    }
    setErrors((prev) => ({ ...prev, password: "" })); // Clear error if valid
    return true;
  };

  // --- Event Handlers ---

  /**
   * Handles the form submission.
   * Prevents default behavior, validates inputs, and attempts Firebase Sign-in.
   */
  const succesfullLogin = async (e) => {
    e.preventDefault(); // Stop the page from refreshing

    // Ensure inputs are valid before proceeding
    if (!validateEmail() || !validatePassword()) return;

    setLoading(true); // Disable the button and show loading state

    try {
      // Firebase authentication call
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("Logged in user:", userCredential.user);

      // Redirect user to the profile page upon success
      navigate("/profile");
    } catch (error) {
      console.error("Login error:", error.message);

      // Map Firebase errors to a generic user-friendly message
      setErrors((prev) => ({
        ...prev,
        password: "Invalid email or password"
      }));
    } finally {
      setLoading(false); // Re-enable the button regardless of outcome
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

            {/* Login Form */}
            <form className="login-form" noValidate onSubmit={succesfullLogin}>
              
              {/* Email Field Group */}
              <div className={`form-group ${errors.email ? "error" : ""}`}>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} // Update state on typing
                    onBlur={validateEmail} // Validate when user clicks away
                    required
                    autoComplete="email"
                  />
                  <label htmlFor="email">Email</label>
                </div>
                <span className="error-message">{errors.email}</span>
              </div>

              {/* Password Field Group */}
              <div className={`form-group ${errors.password ? "error" : ""}`}>
                <div className="input-wrapper">
                 <input
                    // Dynamic type change for "Show Password" functionality
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={validatePassword}
                    required
                  />
                  <label htmlFor="password">Password</label>
                  
                  {/* Eye Icon Button for toggling password visibility */}
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

              {/* Remember Me and Forgot Password links */}
              <div className="form-options">
                <div className="remember-wrapper">
                  <input type="checkbox" id="remember" name="remember" />
                  <label htmlFor="remember" className="checkbox-label">
                    <span className="checkmark"></span> Remember me
                  </label>
                </div>
                <Link to="/forgot-password" university className="forgot-password">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button with Dynamic Loading Class */}
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