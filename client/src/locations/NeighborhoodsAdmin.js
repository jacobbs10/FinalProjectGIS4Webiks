import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import axios from "axios";
import FixedHeader from "../components/FixedHeader";
import styles from "../css/MainStyles.module.css";
import { processBulkHoods } from '../utils/BulkHoodsInsert';

const NeighborhoodsAdmin = () => {
  const [searchId, setSearchId] = useState("");
  const [searchCity, setSearchCity] = useState("");    
  const [searchNeighborhood, setSearchNeighborhood] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [allHoods, setAllHoods] = useState([]);
  const [allHoodss, setHoods] = useState([]);
  const [editingHoodId, setEditingHoodId] = useState(null);
  const [editedHood, setEditedHood] = useState({});
  const [newHood, setNewHood] = useState({ city: "", neighborhood: "", id: "", coordinates: [] });
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();
  const PORT = process.env.SERVER_PORT || 5000;
  const token = sessionStorage.getItem("token");

  const [showPopup, setShowPopup] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState([]);
  const [addPopupOpen, setAddPopupOpen] = useState(false);
  const [popupCoords, setPopupCoords] = useState([["", ""], ["", ""], ["", ""], ["", ""]]);
  const [addingNew, setAddingNew] = useState(false);

  /*pagination control*/
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(allHoodss.length / pageSize);
  const paginatedHoods = allHoodss.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    const raw = sessionStorage.getItem("user");
    if (!raw) return navigate("/login");
    const user = JSON.parse(raw);
    if (user.role !== "Admin") {
      alert("Access denied. Admins only.");
      return navigate("/login");
    }
    setAuthorized(true);
  }, [navigate]);

  useEffect(() => {
    const fetchHoods = async () => {
      try {
        const res = await axios.get(`http://localhost:${PORT}/api/hood/neighborhoods`, {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json"
          }
        });
        if (res.data?.neighborhoods) {
          const normalized = res.data.neighborhoods.map((hood) => ({
            _id: hood._id,
            id: hood.properties.id,
            city: hood.properties.city,
            neighborhood: hood.properties.neighborhood,
            coordinates: hood.geometry.coordinates,
          }));
          setAllHoods(normalized);
          setHoods(normalized);
        }
      } catch (err) {
        console.error("❌ Failed to fetch neighborhoods:", err);
      }
    };
    fetchHoods();
  }, []);

  useEffect(() => {
    const filtered = allHoods.filter(h => {
        const matchId = searchId === "" || h.id.toString().includes(searchId);
        const matchCity = searchCity === "" || h.city.toLowerCase().includes(searchCity.toLowerCase());
        const matchNeighborhood = searchNeighborhood === "" || h.neighborhood.toLowerCase().includes(searchNeighborhood.toLowerCase());
        return matchId && matchCity && matchNeighborhood;
    });

    if (sortBy) {
      filtered.sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    setCurrentPage(1);
    setHoods(filtered);
  }, [searchId, searchCity, searchNeighborhood, allHoods, sortBy, sortDirection]);

    const handleSort = (key) => {
      if (sortBy === key) {
        setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortDirection("asc");
      }
    };

  const validateNewHood = () => {
    const { id, city, neighborhood, coordinates } = newHood;
    if (!id || !city || !neighborhood || !coordinates) {
      alert("All fields are required.");
      return false;
    }
    if (!Array.isArray(coordinates[0]) || coordinates[0].length < 4) {
      alert("At least 4 coordinates required.");
      return false;
    }
    return true;
  };

  const handleAddHood = async () => {
    if (!validateNewHood()) return;
    try {
        const flatCoords = newHood.coordinates[0] || newHood.coordinates;
        const payload = {
            id: newHood.id || undefined, // שלח undefined אם לא הוזן
            city: newHood.city,
            neighborhood: newHood.neighborhood,
            coordinates: flatCoords, // מה ש-req.body.coordinates מצופה להיות
          };
      
          console.log("🚀 Payload:", payload);
        const res = await axios.post(`http://localhost:${PORT}/api/hood/neighborhood`, JSON.stringify(payload), {
        headers: {
          Authorization: `${token}`,
          "Content-Type": "application/json"
        }
      });
      const saved = res.data?.data;
        const normalized = {
        _id: saved._id,
        id: saved.properties.id,
        city: saved.properties.city,
        neighborhood: saved.properties.neighborhood,
        coordinates: saved.geometry.coordinates,
        };

        const updated = [...allHoods, normalized];
        setAllHoods(updated);
        setHoods(updated);
        setNewHood({ city: "", neighborhood: "", id: "", coordinates: [] });
    } catch (err) {
        console.error("❌ Error in handleAddHood:", err.response || err);
        alert("Error adding neighborhood: " + (err.response?.data?.message || err.message));
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    // Store the input element to reset it later
    const fileInput = event.target;
    let result;
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const content = e.target.result;
            result = await processBulkHoods(content);
            
            
            if (result.success) {
              alert(`Successfully registered ${result.data.success.count} neighborhoods`);
              if (result.data.failures.count > 0) {
                alert(`Failed to register ${result.data.failures.count} neighborhoods`);
                console.log('Failed registrations:', result.data.failures);
              }
            } else {
              if (result.errors) {
                alert('Validation errors found. Check console for details.');
                console.log('Validation errors:', result.errors);
              } else {
                alert(`Error: ${result.error}`);
              }
            }
          } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file');
          }
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading file');
      } finally {
        // Reset the file input after processing
        fileInput.value = '';
    }
    }
  };


  const handleEditClick = (hood) => {
    setEditingHoodId(hood.id);
    setEditedHood({ ...hood });
  };
  
  const handleSave = async () => {
    try {
      await axios.put(`http://localhost:${PORT}/api/hood/neighborhood`, editedHood, {
        headers: {
          Authorization: `${token}`,
          "Content-Type": "application/json"
        }
      });
      const updated = allHoods.map((u) => u.id === editingHoodId ? editedHood : u);
      setAllHoods(updated);
      setHoods(updated);
      setEditingHoodId(null);
      setEditedHood({});
    } catch (err) {
      alert("Error updating neighborhood: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`http://localhost:${PORT}/api/hood/neighborhood/${id}`, {
        headers: {
          Authorization: `${token}`,
          "Content-Type": "application/json"
        }
      });
      setAllHoods(allHoods.filter((u) => u.id !== id));
      setHoods(allHoods.filter((u) => u.id !== id));
    } catch (err) {
      alert("Error deleting: " + (err.response?.data?.message || err.message));
    }
  };

  const openCoordEditor = (hood) => {
    const coords = hood.coordinates[0];
    setPopupCoords(coords);
    setEditedHood(hood);
    setEditingHoodId(hood.id);
    setAddingNew(false);
    setAddPopupOpen(true);
  };

  const openNewCoordPopup = () => {
    setPopupCoords([["", ""], ["", ""], ["", ""], ["", ""]]);
    setAddingNew(true);
    setAddPopupOpen(true);
  };

  const saveCoordChanges = () => {
    const cleanedCoords = popupCoords
      .filter(([lng, lat]) => lng !== "" && lat !== "")
      .map(([lng, lat]) => [parseFloat(lng), parseFloat(lat)]); // הפוך למספרים!
  
    if (cleanedCoords.length < 4) {
      alert("At least 4 points are required to form a polygon.");
      return;
    }
  
    const isClosed = JSON.stringify(cleanedCoords[0]) === JSON.stringify(cleanedCoords[cleanedCoords.length - 1]);
    const closedCoords = isClosed ? cleanedCoords : [...cleanedCoords, cleanedCoords[0]];
  
    const polygon = [closedCoords];
    
    if (addingNew) {
      setNewHood({ ...newHood, coordinates: polygon });
    } else {
      setEditedHood({ ...editedHood, coordinates: polygon });
    }
  
    setAddPopupOpen(false);
  };

  if (!authorized) return null;

  return (
    <div>
      <FixedHeader title="Admin Neighborhood Management" />
      <div className={styles.adminPanel}>
        <div className={styles.toolbar}>
        <input
            type="text"
            placeholder="Search ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
        />
        <input
            type="text"
            placeholder="Search City"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
        />
        <input
            type="text"
            placeholder="Search Neighborhood"
            value={searchNeighborhood}
            onChange={(e) => setSearchNeighborhood(e.target.value)}
        />
        <button onClick={() => {
            setSearchId("");
            setSearchCity("");
            setSearchNeighborhood("");
            setHoods(allHoods);
            setCurrentPage(1);
        }}>Clear Filter</button>
        <button onClick={() => {
            setSortBy("");
            setSortDirection("asc");
            setHoods(allHoods);
            setCurrentPage(1);
          }}>Clear Sort</button>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
        </select>

        <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>Back</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next</button>

        </div>

        <table className={styles.userTable}>
          <thead>
            <tr>
               <th onClick={() => handleSort("id")}>
                Id {sortBy === "id" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("city")}>
                City {sortBy === "city" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("neighborhood")}>
                Neighborhood {sortBy === "neighborhood" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th>Coordinates</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input value={newHood.id} onChange={(e) => setNewHood({ ...newHood, id: e.target.value })} /></td>
              <td><input value={newHood.city} onChange={(e) => setNewHood({ ...newHood, city: e.target.value })} /></td>
              <td><input value={newHood.neighborhood} onChange={(e) => setNewHood({ ...newHood, neighborhood: e.target.value })} /></td>
              <td><button onClick={openNewCoordPopup}>Set Coordinates</button></td>
              <td><button onClick={handleAddHood}>Add</button>
              <button className={styles.fileUploadButton}
                onClick={() => document.getElementById("bulkUploadInput").click()}
              >
                Bulk Upload
              </button>
              <input
                id="bulkUploadInput"
                type="file"
                accept=".json, .txt"
                onChange={(event) => handleFileSelect(event)}
                style={{ display: "none" }}
              />
              </td>
            </tr>

            {paginatedHoods.map((hood) => (
              <tr key={hood.id}>
                {editingHoodId === hood.id ? (
                  <>
                    <td><input value={editedHood.id} onChange={(e) => setEditedHood({ ...editedHood, id: e.target.value })} /></td>
                    <td><input value={editedHood.city} onChange={(e) => setEditedHood({ ...editedHood, city: e.target.value })} /></td>
                    <td><input value={editedHood.neighborhood} onChange={(e) => setEditedHood({ ...editedHood, neighborhood: e.target.value })} /></td>
                    <td><button onClick={() => openCoordEditor(editedHood)}>Edit Coords</button></td>
                    <td>
                      <button onClick={handleSave}>Save</button>
                      <button onClick={() => setEditingHoodId(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{hood.id}</td>
                    <td>{hood.city}</td>
                    <td>{hood.neighborhood}</td>
                    <td><button onClick={() => { setSelectedCoords(hood.coordinates[0]); setShowPopup(true); }}>Show</button></td>
                    <td>
                      <button onClick={() => handleEditClick(hood)}>Edit</button>
                      <button onClick={() => handleDelete(hood.id)}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Popup for showing coordinates */}
        {showPopup && (
          <div className={styles.popupOverlay}>
            <div className={styles.popup}>
              <h3>Coordinates</h3>
              {selectedCoords.map((pair, i) => (
                <div key={i} className={styles.coordBox}>[ {pair[0]}, {pair[1]} ]</div>
              ))}
              <button onClick={() => setShowPopup(false)}>Close</button>
            </div>
          </div>
        )}

        {/* Popup for adding/editing coordinates */}
        {addPopupOpen && (
          <div className={styles.popupOverlay}>
            <div className={styles.popup}>
              <h3>Enter Coordinates</h3>
              {popupCoords.map((pair, index) => (
                <div key={index} className={styles.coordRow}>
                  <input
                    type="text"
                    value={pair[0]}
                    onChange={(e) => {
                      const updated = [...popupCoords];
                      updated[index][0] = e.target.value;
                      if (index === 0) updated[popupCoords.length - 1][0] = e.target.value;
                      setPopupCoords(updated);
                    }}
                    placeholder="Longitude"
                    disabled={index === popupCoords.length - 1 && popupCoords.length >= 4}
                  />
                  <input
                    type="text"
                    value={pair[1]}
                    onChange={(e) => {
                      const updated = [...popupCoords];
                      updated[index][1] = e.target.value;
                      if (index === 0) updated[popupCoords.length - 1][1] = e.target.value;
                      setPopupCoords(updated);
                    }}
                    placeholder="Latitude"
                    disabled={index === popupCoords.length - 1 && popupCoords.length >= 4}
                  />
                </div>
              ))}
              <button onClick={() => setPopupCoords([...popupCoords.slice(0, -1), ["", ""], popupCoords[0]])}>+ Add Pair</button>
              <button onClick={saveCoordChanges}>Save Coordinates</button>
              <button onClick={() => setAddPopupOpen(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NeighborhoodsAdmin;
