import "../log-in.css";
import "../../../styles.css";

import { useState } from "react";
import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";

function Forgot() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailValid = validateEmail();
    const passwordValid = validatePassword();
    if (!emailValid || !passwordValid) return;

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // імітація API
      setSuccess(true);
    } catch {
      setErrors((prev) => ({ ...prev, password: "Login failed" }));
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

          {!success ? (
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className={`form-group ${errors.email ? "error" : ""}`}>
                <div className="input-wrapper">
                  <input
                    type="email"
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
                    autoComplete="current-password"
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
                <span className="btn-text">Sign In</span>
                <span className="btn-loader"></span>
              </button>
            </form>
          ) : (
            <div className="success-message show">
              <div className="success-icon">✓</div>
              <h3>Welcome back!</h3>
              <p>Redirecting to your dashboard...</p>
            </div>
          )}

          <div className="signup-link">
            <p>
              Don't have an account? <Link to="/Register">Create one</Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </Container>
  );
}

export default Forgot;