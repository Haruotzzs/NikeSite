import "../log-in.css";
import "../../../styles.css";

// --- FIREBASE IMPORTS ---
import { auth } from "../../../../server/firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";

/**
 * COMPONENT: Register
 * Handles user account creation including validation and Firebase profile updates.
 */
function Register() {
  const navigate = useNavigate();

  // --- STATE MANAGEMENT ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password1, setPassword1] = useState(""); // Confirmation password
  const [username, setUsername] = useState("");

  // Visibility toggles for password fields
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);

  // Error tracking for specific fields
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    username: "",
    password1: "",
  });

  const [globalError, setGlobalError] = useState(""); // Errors from Firebase/Network
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- VALIDATION FUNCTIONS ---

  const validateEmail = () => {
    try {
      if (!email.trim()) {
        setErrors(p => ({ ...p, email: "Email is required" }));
        return false;
      }
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regex.test(email)) {
        setErrors(p => ({ ...p, email: "Invalid email format" }));
        return false;
      }
      setErrors(p => ({ ...p, email: "" }));
      return true;
    } catch {
      setGlobalError("Email validation failed");
      return false;
    }
  };

  const validatePassword = () => {
    try {
      if (!password) {
        setErrors(p => ({ ...p, password: "Password is required" }));
        return false;
      }
      if (password.length < 6) {
        setErrors(p => ({ ...p, password: "Minimum 6 characters" }));
        return false;
      }
      setErrors(p => ({ ...p, password: "" }));
      return true;
    } catch {
      setGlobalError("Password validation failed");
      return false;
    }
  };

  const validateUsername = () => {
    try {
      if (!username.trim()) {
        setErrors(p => ({ ...p, username: "Username is required" }));
        return false;
      }
      if (username.length < 3) {
        setErrors(p => ({ ...p, username: "Minimum 3 characters" }));
        return false;
      }
      if (username.length > 12) {
        setErrors(p => ({ ...p, username: "Maximum 12 characters" }));
        return false;
      }
      setErrors(p => ({ ...p, username: "" }));
      return true;
    } catch {
      setGlobalError("Username validation failed");
      return false;
    }
  };

  const validatePasswordMatch = () => {
    try {
      if (password !== password1) {
        setErrors(p => ({ ...p, password1: "Passwords do not match" }));
        return false;
      }
      setErrors(p => ({ ...p, password1: "" }));
      return true;
    } catch {
      setGlobalError("Password match validation failed");
      return false;
    }
  };

  /**
   * HANDLER: handleSubmit
   * Aggregates all validations and attempts the Firebase registration.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");

    // Bitwise & ensures all functions run so all error messages appear simultaneously
    const ok =
      validateEmail() &
      validateUsername() &
      validatePassword() &
      validatePasswordMatch();

    if (!ok) return;

    setLoading(true);

    try {
      const user = await regUsr(email, password);
      console.log("Registered user UID:", user.uid);

      setSuccess(true);
      // Wait briefly before redirecting to allow user to see success state
      setTimeout(() => navigate("/profile"), 1500);
    } catch (error) {
      setGlobalError(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * HELPER: regUsr
   * Interacts with Firebase Auth API.
   * 1. Creates the user credentials.
   * 2. Updates the displayName property (Firebase doesn't do this during creation).
   * 3. Reloads user state to confirm changes.
   */
  async function regUsr(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Map the custom "username" field to the Firebase "displayName"
      await updateProfile(user, {
        displayName: username, 
      });

      // Force a reload to ensure the new displayName is reflected in the local user object
      await user.reload();

      return user;
    } catch (error) {
      throw new Error(error.message || "Registration failed");
    }
  }

  return (
    <Container>
      <div className="body1">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <h2>Sign up</h2>
              <p>Enter your credentials to continue</p>
            </div>

            {!success ? (
              <form className="login-form" onSubmit={handleSubmit} noValidate>
                {/* Email Field */}
                <div className={`form-group ${errors.email ? "error" : ""}`}>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={validateEmail}
                      required
                    />
                    <label htmlFor="email">Email</label>
                  </div>
                  <span className="error-message">{errors.email}</span>
                </div>

                {/* Username Field */}
                <div className={`form-group ${errors.username ? "error" : ""}`}>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      id="username"
                      maxLength="12"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onBlur={validateUsername}
                      required
                    />
                    <label htmlFor="username">Username</label>
                  </div>
                  <span className="error-message">{errors.username}</span>
                </div>

                {/* Password Field */}
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
                      <span className={`toggle-icon ${showPassword ? "show-password" : ""}`}></span>
                    </button>
                  </div>
                  <span className="error-message">{errors.password}</span>
                </div>

                {/* Confirm Password Field */}
                <div className={`form-group ${errors.password1 ? "error" : ""}`}>
                  <div className="input-wrapper">
                    <input
                      type={showPassword1 ? "text" : "password"}
                      id="password1"
                      value={password1}
                      onChange={(e) => setPassword1(e.target.value)}
                      onBlur={validatePasswordMatch}
                      required
                    />
                    <label htmlFor="password1">Confirm Password</label>
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword1(!showPassword1)}
                    >
                      <span className={`toggle-icon ${showPassword1 ? "show-password" : ""}`}></span>
                    </button>
                  </div>
                  <span className="error-message">{errors.password1}</span>
                </div>

                {/* Additional Options & Anti-bot placeholder */}
                <div className="form-options">
                  <div className="remember-wrapper">
                    <input type="checkbox" id="remember" name="remember" />
                    <label htmlFor="remember" className="checkbox-label">
                      <span className="checkmark"></span> Are you a robot?
                    </label>
                  </div>
                  <Link to="/Login" className="forgot-password">
                    Already registered?
                  </Link>
                </div>

                {/* Registration Error (Global) */}
                {globalError && <div className="global-error">{globalError}</div>}

                {/* Submit Button */}
                <button
                  type="submit"
                  className={`login-btn ${loading ? "loading" : ""}`}
                  disabled={loading}
                >
                  <span className="btn-text">Register</span>
                  <span className="btn-loader"></span>
                </button>
              </form>
            ) : (
              /* Success UI after registration */
              <div className="success-message show">
                <div className="success-icon">✓</div>
                <h3>Welcome!</h3>
                <p>Redirecting to your dashboard...</p>
              </div>
            )}

            <div className="signup-link">
              <p>
                Already have account? <Link to="/Login">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

export default Register;