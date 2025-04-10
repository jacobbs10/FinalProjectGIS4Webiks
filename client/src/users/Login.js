import React, { useState } from "react";
import styles from "../css/MainStyles.module.css";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  
    const { username, password } = formData;
  
    if (username === "admin" && password === "admin123") {
      console.log("✅ Logged in as admin");
      // TODO: Redirect to /admin or set login state
      window.location.href = "/admin";
    } else {
      alert("❌ Invalid credentials");
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
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          onChange={handleChange}
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
