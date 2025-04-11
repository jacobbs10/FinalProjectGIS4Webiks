import React, { useState } from "react";
import FixedHeader from "../components/FixedHeader";
import styles from "../css/MainStyles.module.css";

const AdminUsers = () => {
  const [searchEmail, setSearchEmail] = useState("");
  const [pageLimit, setPageLimit] = useState(10);
  const [sortBy, setSortBy] = useState("");

  const [allUsers, setAllUsers] = useState([
    {
      _id: "1",
      username: "john_doe",
      password: "12345678",
      user_firstname: "John",
      user_lastname: "Doe",
      user_cellphone: "0501234567",
      user_email: "john@example.com",
      user_type: "viewer",
      user_status: "Active",
      user_created: "2024-01-10",
      user_modified: "2024-03-05",
    },
  ]);

  const [users, setUsers] = useState(allUsers);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editedUser, setEditedUser] = useState({});
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    user_firstname: "",
    user_lastname: "",
    user_cellphone: "",
    user_email: "",
    user_status: true,
  });

  const validateNewUser = () => {
    const {
      username,
      password,
      user_firstname,
      user_lastname,
      user_cellphone,
      user_email,
    } = newUser;

    if (
      !username ||
      !password ||
      !user_firstname ||
      !user_lastname ||
      !user_cellphone ||
      !user_email
    ) {
      alert("All fields are required.");
      return false;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters long.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      alert("Please enter a valid email address.");
      return false;
    }

    const phoneRegex = /^\d{10,}$/;
    if (!phoneRegex.test(user_cellphone)) {
      alert("Cellphone must contain only numbers and be at least 10 digits.");
      return false;
    }

    return true;
  };

  const handleSearch = () => {
    const keyword = searchEmail.toLowerCase();
    const filtered = allUsers.filter((user) =>
      Object.values(user).some((value) =>
        value.toString().toLowerCase().includes(keyword)
      )
    );
    setUsers(filtered);
  };

  const handleReset = () => {
    setSearchEmail("");
    setUsers(allUsers);
  };

  const handleAddUser = () => {
    if (!validateNewUser()) return;

    const today = new Date().toISOString().split("T")[0];

    const newUserEntry = {
      _id: Date.now().toString(),
      ...newUser,
      user_type: "viewer",
      user_status: newUser.user_status ? "Active" : "Inactive",
      user_created: today,
      user_modified: today,
    };

    const updated = [...allUsers, newUserEntry];
    setAllUsers(updated);
    setUsers(updated);

    setNewUser({
      username: "",
      password: "",
      user_firstname: "",
      user_lastname: "",
      user_cellphone: "",
      user_email: "",
      user_status: true,
    });
  };

  const handleNewUserChange = (e) => {
    const { name, value, type, checked } = e.target;
    const cleanedValue =
      name === "user_cellphone" ? value.replace(/[^\d]/g, "") : value;

    setNewUser((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : cleanedValue,
    }));
  };

  const handleEditClick = (user) => {
    setEditingUserId(user._id);
    setEditedUser({ ...user });
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    const cleanedValue =
      name === "user_cellphone" ? value.replace(/[^\d]/g, "") : value;

    setEditedUser((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : cleanedValue,
    }));
  };

  const handleSave = () => {
    const today = new Date().toISOString().split("T")[0];
    const updatedUser = {
      ...editedUser,
      user_status: editedUser.user_status ? "Active" : "Inactive",
      user_modified: today,
    };

    const updatedList = allUsers.map((u) =>
      u._id === editingUserId ? updatedUser : u
    );

    setAllUsers(updatedList);
    setUsers(updatedList);
    setEditingUserId(null);
    setEditedUser({});
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setEditedUser({});
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    const updatedList = allUsers.filter((u) => u._id !== id);
    setAllUsers(updatedList);
    setUsers(updatedList);
  };

  return (
    <>
      <FixedHeader title="Admin - Manage Users" />
      <div className={styles.adminUsersContainer} style={{ paddingTop: "80px" }}>
        <h2>Manage Users</h2><br/><br/>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by any field"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
          <button onClick={handleSearch}>Search</button>
          <button onClick={handleReset}>Clear</button>

          <select
            value={pageLimit}
            onChange={(e) => setPageLimit(Number(e.target.value))}
          >
            <option value={10}>Page Limit: 10</option>
            <option value={20}>Page Limit: 20</option>
            <option value={50}>Page Limit: 50</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="">Sort By</option>
            <option value="usertype">User Type</option>
            <option value="date">Created Date</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Password</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Cellphone</th>
                <th>Email</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created</th>
                <th>Modified</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  {editingUserId === user._id ? (
                    <>
                      <td><input name="username" value={editedUser.username} onChange={handleEditChange} /></td>
                      <td><input name="password" type="password" value={editedUser.password || ""} onChange={handleEditChange} /></td>
                      <td><input name="user_firstname" value={editedUser.user_firstname} onChange={handleEditChange} /></td>
                      <td><input name="user_lastname" value={editedUser.user_lastname} onChange={handleEditChange} /></td>
                      <td><input name="user_cellphone" value={editedUser.user_cellphone} onChange={handleEditChange} /></td>
                      <td><input name="user_email" value={editedUser.user_email} onChange={handleEditChange} /></td>
                      <td>{user.user_type}</td>
                      <td>
                        <input
                          type="checkbox"
                          name="user_status"
                          checked={editedUser.user_status === "Active"}
                          onChange={(e) =>
                            setEditedUser((prev) => ({
                              ...prev,
                              user_status: e.target.checked ? "Active" : "Inactive",
                            }))
                          }
                        />
                      </td>
                      <td className={styles.nowrap}>{user.user_created}</td>
                      <td className={styles.nowrap}>
                        {new Date().toISOString().split("T")[0]}
                      </td>
                      <td>
                      <button className={`${styles.actionButton} ${styles.saveButton}`} onClick={handleSave}>Save</button>
                      <button className={`${styles.actionButton} ${styles.cancelButton}`} onClick={handleCancel}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{user.username}</td>
                      <td>••••••••</td>
                      <td>{user.user_firstname}</td>
                      <td>{user.user_lastname}</td>
                      <td>{user.user_cellphone}</td>
                      <td>{user.user_email}</td>
                      <td>{user.user_type}</td>
                      <td>{user.user_status}</td>
                      <td className={styles.nowrap}>{user.user_created}</td>
                      <td className={styles.nowrap}>{user.user_modified}</td>
                      <td>
                      <button className={`${styles.actionButton} ${styles.editButton}`} onClick={() => handleEditClick(user)}>Edit</button>
                      <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDelete(user._id)}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {/* ➕ Add New User Row */}
              <tr>
                <td>
                  <input
                    name="username"
                    value={newUser.username}
                    onChange={handleNewUserChange}
                  />
                </td>
                <td>
                  <input
                    name="password"
                    type="password"
                    value={newUser.password}
                    onChange={handleNewUserChange}
                  />
                </td>
                <td>
                  <input
                    name="user_firstname"
                    value={newUser.user_firstname}
                    onChange={handleNewUserChange}
                  />
                </td>
                <td>
                  <input
                    name="user_lastname"
                    value={newUser.user_lastname}
                    onChange={handleNewUserChange}
                  />
                </td>
                <td>
                  <input
                    name="user_cellphone"
                    value={newUser.user_cellphone}
                    onChange={handleNewUserChange}
                  />
                </td>
                <td>
                  <input
                    name="user_email"
                    type="email"
                    value={newUser.user_email}
                    onChange={handleNewUserChange}
                  />
                </td>
                <td><span>viewer</span></td>
                <td>
                  <input
                    type="checkbox"
                    name="user_status"
                    checked={newUser.user_status}
                    onChange={handleNewUserChange}
                  />
                </td>
                <td className={styles.nowrap}>{new Date().toISOString().split("T")[0]}</td>
                <td className={styles.nowrap}>{new Date().toISOString().split("T")[0]}</td>
                <td><button className={`${styles.actionButton} ${styles.addButton}`} onClick={handleAddUser}>Add</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default AdminUsers;
