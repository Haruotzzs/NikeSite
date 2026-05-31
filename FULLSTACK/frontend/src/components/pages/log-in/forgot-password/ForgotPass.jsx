import "../log-in.css";
import "../../../styles.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";

/**
 * COMPONENT: Forgot
 * Note: Despite the name, this component currently handles the Sign-In flow.
 */
function Forgot() {
  // --- STATE MANAGEMENT ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Validation and UI feedback states
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- VALIDATION LOGIC ---
  
  // Checks if the email is non-empty and follows a standard pattern
  const validateEmail = () => {
    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Invalid email address" }));
      return false;
    }
    setErrors((prev) => ({ ...prev, email: "" }));
    return true;
  };

  // Checks if the password meets the minimum length requirement
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

  // --- EVENT HANDLERS ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Step 1: Run validations
    const emailValid = validateEmail();
    const passwordValid = validatePassword();
    
    // Step 2: Stop if there are errors
    if (!emailValid || !passwordValid) return;

    // Step 3: Trigger loading state and simulate backend request
    setLoading(true);
    try {
      // Simulate a 1.5-second API delay
      await new Promise((resolve) => setTimeout(resolve, 1500)); 
      
      // On success, show the welcome screen
      setSuccess(true);
    } catch (err) {
      // Handle login failures (e.g., wrong credentials)
      setErrors((prev) => ({ ...prev, password: "Login failed. Please try again." }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <div className="body1">
        <div className="login-container">
          <div className="login-card">
            
            {/* Header Section */}
            <div className="login-header">
              <h2>Sign In</h2>
              <p>Enter your credentials to continue</p>
            </div>

            {/* Conditional Rendering: Show form OR Success Message */}
            {!success ? (
              <form className="login-form" onSubmit={handleSubmit} noValidate>
                
                {/* Email Input Field */}
                <div className={`form-group ${errors.email ? "error" : ""}`}>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={validateEmail} // Validate when user clicks away
                      required
                      autoComplete="email"
                    />
                    <label htmlFor="email">Email</label>
                  </div>
                  <span className="error-message">{errors.email}</span>
                </div>

                {/* Password Input Field with Toggle Visibility */}
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

                {/* Form Options: Remember Me & Password Recovery Link */}
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

                {/* Submit Button with Loading Indicator */}
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
              /* Success UI after successful login simulation */
              <div className="success-message show">
                <div className="success-icon">✓</div>
                <h3>Welcome back!</h3>
                <p>Redirecting to your dashboard...</p>
              </div>
            )}

            {/* Footer: Redirect to Registration */}
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