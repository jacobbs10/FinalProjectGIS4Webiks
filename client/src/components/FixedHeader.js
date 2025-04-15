import React from "react";
import styles from "../css/MainStyles.module.css";

const FixedHeader = ({ title = "GIS4Webiks" }) => {
  const handleLogout = () => {
    console.log("Logging out...");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    window.location.href = "/login"; // Redirect to login page
  };

  return (
    <header className={styles.fixedHeader}>
      <div className={styles.headerContent}>
        <h1>{title}</h1>
        <button onClick={handleLogout}>Log Out</button>
      </div>
    </header>
  );
};

export default FixedHeader;
