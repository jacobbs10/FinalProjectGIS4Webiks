import React, { useState } from "react";
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Registering user:", formData);
    // Later: send this data to backend
  };

  return (
    <div className={styles.registerContainer}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="username"
          placeholder="Username"
          required
          onChange={handleChange}
        /><br />
        <input
          name="user_firstname"
          placeholder="First Name"
          required
          onChange={handleChange}
        /><br />
        <input
          name="user_lastname"
          placeholder="Last Name"
          required
          minLength="8"
          onChange={handleChange}
        /><br />
        <input
          name="user_cellphone"
          placeholder="Cellphone (optional)"
          onChange={handleChange}
        /><br />
        <input
          name="user_email"
          type="email"
          placeholder="Email"
          required
          onChange={handleChange}
        /><br />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          onChange={handleChange}
        /><br />
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;
