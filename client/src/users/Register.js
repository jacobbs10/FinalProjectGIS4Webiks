import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "../css/MainStyles.module.css";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    user_firstname: "",
    user_lastname: "",
    user_cellphone: "",
    user_email: "",
    password: "",
  });

  const navigate = useNavigate();

  const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

  const handleChange = (e) => {
    const { name, value } = e.target;
    const cleanedValue =
      name === "user_cellphone" ? value.replace(/[^\d]/g, "") : value;

    setFormData((prev) => ({ ...prev, [name]: cleanedValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      username,
      user_firstname,
      user_lastname,
      user_cellphone,
      user_email,
      password,
    } = formData;

    if (
      !username ||
      !user_firstname ||
      !user_lastname ||
      !user_email ||
      !password
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (user_cellphone.trim() !== "") {
      const phoneRegex = /^\d{10,}$/;
      if (!phoneRegex.test(user_cellphone)) {
        alert("Cellphone must be at least 10 digits and contain numbers only.");
        return;
      }
    }

    // ✅ Real backend call using Axios
    try {
      const res = await axios.post("http://localhost:5000/api/auth/register", {
        ...formData,
        user_status: true,     // ✅ added
        role: "Viewer"         // ✅ added
      });
      alert("✅ Registration Successful !");
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed.";
      alert("❌ " + msg);
    }
    
  };

  return (
    <div className={styles.registerContainer}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="username"
          placeholder="Username"
          required
          value={formData.username}
          onChange={handleChange}
        />
        <input
          name="user_firstname"
          placeholder="First Name"
          required
          value={formData.user_firstname}
          onChange={handleChange}
        />
        <input
          name="user_lastname"
          placeholder="Last Name"
          required
          value={formData.user_lastname}
          onChange={handleChange}
        />
        <input
          name="user_cellphone"
          placeholder="Cellphone (optional)"
          value={formData.user_cellphone}
          onChange={handleChange}
        />
        <input
          name="user_email"
          type="email"
          placeholder="Email"
          required
          value={formData.user_email}
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
        <button type="submit">Register</button>
      </form>

      <div className={styles.authLinkBox}>
        <span>Already have an account? </span>
        <a className={styles.authLink} href="/login">
          Login here
        </a>
      </div>
    </div>
  );
};

export default Register;
