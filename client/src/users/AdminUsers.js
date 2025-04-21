import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import axios from "axios";
import FixedHeader from "../components/FixedHeader";
import styles from "../css/MainStyles.module.css";

const AdminUsers = () => {
  const [searchEmail, setSearchEmail] = useState("");
  const [pageLimit, setPageLimit] = useState(10);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [allUsers, setAllUsers] = useState([]);
  const [users, setUsers] = useState([]);
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
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const handleEditClick = (user) => {
    setEditingUserId(user._id);
    setEditedUser({ ...user });
  };
  const token = sessionStorage.getItem("token");





  useEffect(() => {
    const raw = sessionStorage.getItem("user");
    if (!raw) {
      navigate("/login");
      return;
    }
  
    const user = JSON.parse(raw);
    if (user.role !== "Admin") {
      alert("Access denied. Admins only.");
      navigate("/login");
      return;
    }
      
    setAuthorized(true); // ✅ only happens for real admins
  }, [navigate]);
  
  

  
  

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users", {
        headers: {
          'Authorization': `${token}`,
          'Content-Type': 'application/json'
        }
      });
      setAllUsers(res.data);
      setUsers(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch users:", err);
      alert("Error loading users from server.");
    }
  };
  
  useEffect(() => {
    fetchUsers();
  }, []);
  

  const validateNewUser = () => {
    const { username, password, user_firstname, user_lastname, user_cellphone, user_email } = newUser;
    if (!username || !password || !user_firstname || !user_lastname || !user_cellphone || !user_email) {
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
      alert("Cellphone must be at least 10 digits.");
      return false;
    }
    return true;
  };

  const handleSearch = () => {
    const keyword = searchEmail.trim().toLowerCase();
  
    if (!keyword) {
      setUsers(allUsers);
      return;
    }
  
    const filtered = allUsers.filter((user) =>
      Object.values(user).some((value) =>
        value?.toString().toLowerCase().includes(keyword)
      )
    );
  
    setUsers(filtered);
  };
  

  const handleReset = () => {
    setSearchEmail("");
    setUsers(allUsers);
  };
  

  const handleAddUser = async () => {
    if (!validateNewUser()) return;
  
    const today = new Date().toISOString().split("T")[0];
    const newUserEntry = {
      ...newUser,
      role: newUser.user_type || "viewer",
      user_status: newUser.user_status ? "Active" : "Inactive",
      user_created: today,
      user_modified: today,
    };
  
    try {
      await axios.post("http://localhost:5000/api/auth/register", newUserEntry);
      await fetchUsers(); // ✅ this brings the fresh, complete list from backend
      setNewUser({
        username: "",
        password: "",
        user_firstname: "",
        user_lastname: "",
        user_cellphone: "",
        user_email: "",
        user_status: true,
      });
    } catch (err) {
      alert("Error adding user: " + (err.response?.data?.message || err.message));
    }
  };
  



  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    const cleanedValue = name === "user_cellphone" ? value.replace(/[^\d]/g, "") : value;
    setEditedUser((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : cleanedValue }));
  };

  const handleSave = async () => {
    const today = new Date().toISOString().split("T")[0];
  
    const updatedUser = {
      username: editedUser.username,
      user_firstname: editedUser.user_firstname,
      user_lastname: editedUser.user_lastname,
      user_cellphone: editedUser.user_cellphone,
      user_email: editedUser.user_email,
      role: editedUser.user_type || editedUser.role || "viewer",
      user_status:
        editedUser.user_status === true || editedUser.user_status === "Active"
          ? true
          : false,
      user_modified: today,
    };
  
    try {
      await axios.put(
        `http://localhost:5000/api/users/${editingUserId}`,
        updatedUser,
        {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      await fetchUsers(); // ✅ refreshes full list
      setEditingUserId(null);
      setEditedUser({});
    } catch (err) {
      alert("Error updating user: " + (err.response?.data?.message || err.message));
    }
  };
  

  const handleCancel = () => {
    setEditingUserId(null);
    setEditedUser({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
  
    try {
      await axios.delete(`http://localhost:5000/api/users/${id}`, {
        headers: {
          Authorization: `${token}`,
        },
      });
  
      await fetchUsers(); // refresh list after delete
    } catch (err) {
      alert("Error deleting user: " + (err.response?.data?.message || err.message));
    }
  };
  

  if (!authorized) return null;

  return (
    <div>
      <FixedHeader title="Admin User Management" />
      <div className={styles.adminPanel}>
        <h2>Manage All Users</h2> <br /> <br />


        <div className={styles.toolbar}>
  <input
    type="text"
    placeholder="Search by any field"
    value={searchEmail}
    onChange={(e) => setSearchEmail(e.target.value)}
  />
  <button
    onClick={handleSearch}
    disabled={searchEmail.trim() === ""}
  >
    Search
  </button>

  <button onClick={handleReset}>Clear</button>

  <select
    value={pageLimit}
    onChange={(e) => setPageLimit(Number(e.target.value))}
  >
    <option value={10}>Page Limit: 10</option>
    <option value={20}>Page Limit: 20</option>
    <option value={50}>Page Limit: 50</option>
  </select>

  <select
  value={sortField || ""}
  onChange={(e) => {
    const field = e.target.value;
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }}
>
  <option value="">Sort By</option>
  <option value="role">User Type</option>
  <option value="user_modified">Modified Date</option>
  <option value="user_status">Status</option>
</select>

</div>



<table className={styles.userTable}>
  <thead>
    <tr>
      <th>Username</th>
      <th>Password</th>
      <th>First Name</th>
      <th>Last Name</th>
      <th>Cellphone</th>
      <th>Email</th>
      <th>User Type</th>
      <th>Status</th>
      <th>Created</th>
      <th>Modified</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
  <tr>
  <td>
    <input
      name="username"
      value={newUser.username}
      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
    />
  </td>
  <td>
    <input
      name="password"
      type="password"
      value={newUser.password}
      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
    />
  </td>
  <td>
    <input
      name="user_firstname"
      value={newUser.user_firstname}
      onChange={(e) => setNewUser({ ...newUser, user_firstname: e.target.value })}
    />
  </td>
  <td>
    <input
      name="user_lastname"
      value={newUser.user_lastname}
      onChange={(e) => setNewUser({ ...newUser, user_lastname: e.target.value })}
    />
  </td>
  <td>
    <input
      name="user_cellphone"
      value={newUser.user_cellphone}
      onChange={(e) =>
        setNewUser({ ...newUser, user_cellphone: e.target.value.replace(/[^\d]/g, "") })
      }
    />
  </td>
  <td>
    <input
      name="user_email"
      value={newUser.user_email}
      onChange={(e) => setNewUser({ ...newUser, user_email: e.target.value })}
    />
  </td>
  <td>
  {/* <select
    name="user_type"
    value={newUser.user_type}
    onChange={(e) => setNewUser({ ...newUser, user_type: e.target.value })}
  >
    <option value="Viewer">Viewer</option>
    <option value="Admin">Admin</option>
    <option value="Confidential">Confidential</option>
  </select> */}
  {newUser.user_type || "Viewer"}
</td>

  <td>
    <input
      type="checkbox"
      name="user_status"
      checked={newUser.user_status}
      onChange={(e) =>
        setNewUser({ ...newUser, user_status: e.target.checked })
      }
    />
  </td>
  <td>–</td>
  <td>–</td>
  <td>
    <button className={styles.addButton} onClick={handleAddUser}>Add</button>
  </td>
</tr>


     
{[...users]
  .sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a[sortField] || "").toString().toLowerCase();
    const bVal = (b[sortField] || "").toString().toLowerCase();
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  })
  .map((user) => (

  <tr key={user._id}>
    {editingUserId === user._id ? (
      <>
        <td><input name="username" value={editedUser.username} onChange={handleEditChange} /></td>
        <td><input name="password" type="password" value={editedUser.password} onChange={handleEditChange} /></td>
        <td><input name="user_firstname" value={editedUser.user_firstname} onChange={handleEditChange} /></td>
        <td><input name="user_lastname" value={editedUser.user_lastname} onChange={handleEditChange} /></td>
        <td><input name="user_cellphone" value={editedUser.user_cellphone} onChange={handleEditChange} /></td>
        <td><input name="user_email" value={editedUser.user_email} onChange={handleEditChange} /></td>
        <td>
  {/* <select name="user_type" value={editedUser.user_type} onChange={handleEditChange}>
    <option value="Viewer">Viewer</option>
    <option value="Admin">Admin</option>
    <option value="Confidential">Confidential</option>
  </select> */}
  {editedUser.user_type || editedUser.role}
</td>

        <td><input type="checkbox" name="user_status" checked={editedUser.user_status} onChange={(e) => setEditedUser({...editedUser, user_status: e.target.checked})} /></td>
        <td>{editedUser.user_created}</td>
        <td>{editedUser.user_modified}</td>
        <td>
          <button onClick={() => handleSave(user._id)} className={styles.saveButton}>Save</button>
          <button onClick={handleCancel} className={styles.cancelButton}>Cancel</button>
        </td>
      </>
    ) : (
      <>
        <td>{user.username}</td>
        <td>••••••</td>
        <td>{user.user_firstname}</td>
        <td>{user.user_lastname}</td>
        <td>{user.user_cellphone}</td>
        <td>{user.user_email}</td>
        <td>{user.role || user.user_type || ''}</td>
        <td>{user.user_status ? "Active" : "Inactive"}</td>
        <td>{user.user_created
  ? user.user_created
  : user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-GB")
    : ''}</td>

<td>{user.user_modified
  ? user.user_modified
  : user.updatedAt
    ? new Date(user.updatedAt).toLocaleDateString("en-GB")
    : ''}</td>

<td>
  {user.role !== "Admin" ? (
    <>
      <button onClick={() => handleEditClick(user)} className={styles.editButton}>
        Edit
      </button>
      <button onClick={() => handleDelete(user._id)} className={styles.deleteButton}>
        Delete
      </button>
    </>
  ) : (
    <span style={{ color: "#888", fontStyle: "italic" }}>🔒 Admin</span>
  )}
</td>

      </>
    )}
  </tr>
))}

     
     
     
     
     
   


  </tbody>
</table>

      </div>
    </div>
  );
};

export default AdminUsers;
