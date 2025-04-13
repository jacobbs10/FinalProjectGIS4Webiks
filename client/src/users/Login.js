import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "../css/MainStyles.module.css";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { username, password } = formData;

    try {
      const res = await axios.post("http://localhost:5000/api/users/login", {
        username,
        password,
      });

      const loggedInUser = res.data.user;
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      alert("✅ " + res.data.message);

      // 🔐 Redirect based on user type
      if (loggedInUser.user_type === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed.";
      alert("❌ " + msg);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <h2>Log In</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="username"
          placeholder="Username"
          required
          value={formData.username}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          value={formData.password}
          onChange={handleChange}
        />
        <button type="submit">Login</button>
      </form>

      <div style={{ marginTop: "16px", textAlign: "center" }}>
        <span>Not registered? </span>
        <a href="/register" style={{ color: "#1976d2", textDecoration: "none" }}>
          Create an account
        </a>
      </div>
    </div>
  );
};

export default Login;
