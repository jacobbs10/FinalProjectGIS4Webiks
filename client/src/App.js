import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from "./users/Register";
import Login from "./users/Login";
import AdminUsers from "./users/AdminUsers"; // ✅ Add this

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminUsers />} /> {/* ✅ Add this line */}
        <Route path="/" element={<h1>Welcome to GIS4Webiks</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
