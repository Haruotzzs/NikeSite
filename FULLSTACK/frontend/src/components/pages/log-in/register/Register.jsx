import "../log-in.css";
import "../../../styles.css";

import { auth } from "../../../../server/firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";


function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password1, setPassword1] = useState("");
  const [username, setUsername] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    username: "",
    password1: "",
  });

  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateEmail = () => {
    try {
      if (!email.trim()) {
        setErrors(p => ({ ...p, email: "Email is required" }));
        return false;
      }
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regex.test(email)) {
        setErrors(p => ({ ...p, email: "Invalid email" }));
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
        setErrors(p => ({ ...p, password: "Min 6 characters" }));
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
        setErrors(p => ({ ...p, username: "Min 3 characters" }));
        return false;
      }
      if (username.length > 12) {
        setErrors(p => ({ ...p, username: "Max 12 characters" }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");

    const ok =
      validateEmail() &
      validateUsername() &
      validatePassword() &
      validatePasswordMatch();

    if (!ok) return;

    setLoading(true);

    try {
      const user = await regUsr(email, password);
      console.log("Registered user:", user.uid);

      setSuccess(true);
      setTimeout(() => navigate("/profile"), 1500);
    } catch (error) {
      setGlobalError(error.message);
    } finally {
      setLoading(false);
    }
  };

  async function regUsr(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // update username 
    await updateProfile(user, {
      displayName: username, 
      });

    await user.reload();

    console.log("Updated displayName:", user.displayName);

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
                      className={`toggle-icon ${showPassword ? "show-password" : ""}`}
                    ></span>
                  </button>
                </div>
                <span className="error-message">{errors.password}</span>
              </div>

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
                    <span
                      className={`toggle-icon ${showPassword1 ? "show-password" : ""}`}
                    ></span>
                  </button>
                </div>
                <span className="error-message">{errors.password1}</span>
              </div>

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

              <button
                type="submit"
                className={`login-btn ${loading ? "loading" : ""}`}
              >
                <span className="btn-text">Register</span>
                <span className="btn-loader"></span>
              </button>
            </form>
          ) : (
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
