import '../css/App.css';
import { React, useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap  } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import styles from '../css/NewStyles.module.css';
import api from '../utils/axios'; 
import { Outlet, Link, useNavigate } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import { Navbar, Nav, Button, Dropdown, Form, Accordion, FormControl, Container, Row, Col, Modal } from 'react-bootstrap';
import Login from './LoginModal';
import Register from './RegisterModal';
import axios from "axios";  

const LoginExpiredPrompt = ({ onClose }) => {
  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Session Expired</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Your session has expired. Please log in again.</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

function App() {

  const [loggedIn, setLoggedIn] = useState(sessionStorage.getItem("loginStatus") === "true");
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginValue, setLoginValue] = useState({username: "", password: ""});
  const [token, setToken] = useState(sessionStorage.getItem("token") || null);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [location, setLocation] = useState({
    latitude: 32.0853,
    longitude: 34.7818,
    source: 'default'
  });  
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null); 
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [locationsByCategory, setLocationsByCategory] = useState({});
  const [visibleCategories, setVisibleCategories] = useState([]);
  const [showLegend, setShowLegend] = useState(false);
  const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

  const mapRef = useRef(null);

  
  // You can call this on component mount if you want location immediately
  useEffect(() => {
    
      setLoading(true);
      setError(null);



      // ✅ 1. Get last known location IMMEDIATELY (cached)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log(`New GPS position: ${position.coords.latitude}, ${position.coords.longitude} cached`);
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: 'cached'
        });
        setLoading(false);
      },
      (err) => {
        console.warn("Cached location failed:", err.message);
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: false,   // Cached doesn't need high accuracy
        timeout: 5000,               // Give up quickly
        maximumAge: Infinity         // Accept any cached location
      }
    );

    // ✅ 2. Then set up continuous tracking
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        console.log(`New GPS position: ${position.coords.latitude}, ${position.coords.longitude} gps`);
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: 'gps'
        });
        setLoading(false);
      },
      (err) => {
        console.warn("GPS watch error:", err.message);
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    // Clean up watch on unmount
    return () => navigator.geolocation.clearWatch(watchId);
  } else {
    setError('Geolocation is not supported by your browser');
    setLoading(false);
  }    

  }, []);  

  useEffect(() => {
      const raw = sessionStorage.getItem("user");
      if (!raw) {
        console.warn("No user data found in sessionStorage.");
        return;        
      }
      try {
        const parsedUser = JSON.parse(raw);
        setUser(parsedUser); // Store the user data in state
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }      
    }, []);

  // Check token validity on component mount and periodically
  useEffect(() => {
    const checkTokenValidity = () => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        // Only handle token expiration if there was a previous session
        if (sessionStorage.getItem("loginStatus") === "true") {
          handleTokenExpiration();
          setShowLoginPrompt(true);
        }
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        
        if (isExpired) {
          handleTokenExpiration();
          setShowLoginPrompt(true);
        } else {
          setIsTokenValid(true);
          setShowLoginPrompt(false);
        }
      } catch (error) {
        console.error("Token validation error:", error);
        setIsTokenValid(false);
        // Only show prompt if there was a previous session
        if (sessionStorage.getItem("loginStatus") === "true") {
          setShowLoginPrompt(true);
        }
      }
    };

    // Check immediately
    checkTokenValidity();

  // Check periodically (e.g., every minute)
    const interval = setInterval(checkTokenValidity, 300000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      const fetchEmergencyLocs = async () => {
        try {
          const token = sessionStorage.getItem("token");
          if (!token) {
            console.warn("No token found in sessionStorage.");
            return;
          }
          const res = await axios.get(`${BASE_URL}/api/emrgLocs/all`, {
            headers: {
              Authorization: `${token}`,
              "Content-Type": "application/json"
            }
          });
          const features = res.data.locations;
    
          // Group locations by category and sub_category
          const grouped = {};
          features.forEach((feature) => {
            const category = feature.properties.category || "Uncategorized";
            const subCategory = feature.properties.sub_category || "Uncategorized";

            if (!grouped[category]) {
              grouped[category] = {};
            }
            if (!grouped[category][subCategory]) {
              grouped[category][subCategory] = [];
            }
            grouped[category][subCategory].push(feature);
          });
    
          setLocationsByCategory(grouped);
          setVisibleCategories(Object.keys(grouped)); // Default: show all
          //setVisibleCategories([]);
        } catch (err) {
          console.error("Failed to fetch locations:", err);
        }
      };
    
      fetchEmergencyLocs();
    }, []);

    const handleCategoryToggle = (category, subCategory, checked) => {
      const key = `${category}:${subCategory}`;
      const updated = checked
        ? [...visibleCategories, key]
        : visibleCategories.filter((c) => c !== key);
    
      setVisibleCategories(updated);
      localStorage.setItem("visibleCategories", JSON.stringify(updated));
    };

    const LoginModal = ({ show, onHide }) => {
      const handleLoginSuccess = (user) => {
        // Update App.js state when login is successful
        sessionStorage.setItem("loginStatus", "true");
        sessionStorage.setItem("user", JSON.stringify(user));
        setLoggedIn(true);
        setUser(user);
        onHide(); // Close the modal
      };
    
      return (
        <Modal show={show} onHide={onHide} centered>
          <Modal.Header closeButton>
            <Modal.Title>Login</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Login onClose={onHide} onLoginSuccess={handleLoginSuccess} />
          </Modal.Body>
        </Modal>
      );
    };
    
    const RegisterModal = ({ show, onHide }) => {    
      return (
        <Modal show={show} onHide={onHide} centered>
          <Modal.Header closeButton>
            <Modal.Title>Register</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Register onClose={onHide} />
          </Modal.Body>
        </Modal>
      );
    };

    const getHeader = () => {
        return (
          <Navbar bg="secondary" variant="dark" expand="lg" className="w-100">
            <Navbar.Brand className="text-white">Welcome</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="ml-auto align-items-center">
                {loggedIn ? (
                  <>
                    <Dropdown>
                      <Dropdown.Toggle variant="link" className="text-white text-decoration-none mr-3">
                        Responders
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item href="#action1">Responder 1</Dropdown.Item>
                        <Dropdown.Item href="#action2">Responder 2</Dropdown.Item>
                        <Dropdown.Item href="#action3">Responder 3</Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                    <Button
                      variant="link"
                      onClick={handleLogout}
                      className="text-white text-decoration-none mr-3"
                    >
                      Logout
                    </Button>
                    {user?.role === "Admin" && (
                      <Link to="/admin" className="text-white text-decoration-none">
                        Admin
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      variant="link"
                      className="text-white text-decoration-none mr-3"
                      onClick={() => setShowLoginModal(true)}
                    >
                      Login
                    </Button>
                    <Button
                      variant="link"
                      className="text-white text-decoration-none ml-3"
                      onClick={() => setShowRegisterModal(true)}
                    >
                      Register
                    </Button>
                  </>
                )}
              </Nav>
            </Navbar.Collapse>
          </Navbar>
        );
    };

  const handleTokenExpiration = () => {
    sessionStorage.removeItem("token"); 
    sessionStorage.removeItem("loginStatus");
    sessionStorage.removeItem("userName");
    
    setIsTokenValid(false);
    setLoggedIn(false);  
    setShowLoginPrompt(true);
    
  };

  // Add this new function to handle closing the prompt
  const handleCloseLoginPrompt = () => {
    setShowLoginPrompt(false);
    // Focus on the username input field
    const usernameInput = document.querySelector('input[name="username"]');
    if (usernameInput) {
      usernameInput.focus();
    }
  };

  // Add axios interceptor for API calls
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          sessionStorage.removeItem("token");
          setIsTokenValid(false);
          setLoggedIn(false);
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, []);


  const handleLogout = () => {
    console.log("Logging out...");
    // Clear session storage
    sessionStorage.removeItem("token"); 
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("loginStatus");

    // Reset state
    setLoggedIn(false);  
    setIsTokenValid(false);

    window.location.reload();
  };

  const customIcon = new Icon({
    iconUrl: require("../icons/destination.png"),
    iconSize: [36,36]
  })

  const fetchAddress = async (lat, lon) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
    );
    const data = await response.json();
    if (!data || !data.display_name) {
      console.error("Failed to fetch address:", data);
      return null;
    } else {
      console.log("Fetched address:", data.display_name);
    }
    return data.display_name;
  };

  const filteredLocations = Object.entries(locationsByCategory).reduce((acc, [category, subCategories]) => {
    Object.entries(subCategories).forEach(([subCategory, locations]) => {
      const key = `${category}:${subCategory}`;
      if (visibleCategories.includes(key)) {
        acc.push(...locations);
      }
    });
    return acc;
  }, []);

  return (
    <Container fluid className="p-0">
      {showLoginPrompt && <LoginExpiredPrompt onClose={handleCloseLoginPrompt} />}
      <LoginModal show={showLoginModal} onHide={() => setShowLoginModal(false)} />
      <RegisterModal show={showRegisterModal} onHide={() => setShowRegisterModal(false)} />
      <Row className="m-0" style={{ height: "100vh" }}>
        {/* Left Box */}
        <Col

          xs={4} // 4/12 of the screen width on extra small screens
          sm={3} // 3/12 (25%) of the screen width on small and larger screens
          className="p-3"
          style={{
            backgroundColor: "#6c757d", // Same color as the header
            color: "white", // White text
            height: "100vh", // Full height of the viewport
            overflowY: "auto", // Make content scrollable if it overflows
          }}
        >
          <h5>Active Incidents</h5>
          <p>תהיה טבלה של אירועים</p>
          {/* Add more content here */}
        </Col>
  
        {/* Main Content */}
        <Col xs={8} sm={9} className="p-0">
          {/* Header */}
          {getHeader()}
  
          {/* Map Section */}
          <Row className="m-0" style={{ height: "calc(100vh - 56px)" }}>
            {/* Subtract the height of the header (56px is the default height of a Bootstrap Navbar) */}
            <Col className="p-0">
              <MapContainer
                center={[location.latitude, location.longitude]}
                zoom={13}
                style={{ height: "100%" }}
                ref={mapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> | <a href="https://www.flaticon.com/free-icons/destination" title="destination icons">Destination icons created by Flat Icons - Flaticon</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Floating Legend Button */}
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    zIndex: 1000,
                    backgroundColor: "white",
                    borderRadius: "5px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                    padding: "5px",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowLegend(!showLegend)}
                >
                  <div style={{ width: "25px", height: "3px", backgroundColor: "black", margin: "3px 0" }}></div>
                  <div style={{ width: "25px", height: "3px", backgroundColor: "black", margin: "3px 0" }}></div>
                  <div style={{ width: "25px", height: "3px", backgroundColor: "black", margin: "3px 0" }}></div>
                  <div style={{ width: "25px", height: "3px", backgroundColor: "black", margin: "3px 0" }}></div>
                </div>

                {/* Legend Panel */}
                {showLegend && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50px",
                      right: "10px",
                      zIndex: 1000,
                      backgroundColor: "white",
                      borderRadius: "5px",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                      padding: "10px",
                      maxHeight: "300px",
                      overflowY: "auto",
                    }}
                  >
                    <h5>Legend</h5>
                    <Accordion>
                      {Object.entries(locationsByCategory).map(([category, subCategories]) => (
                        <Accordion.Item eventKey={category} key={category}>
                          <Accordion.Header>{category}</Accordion.Header>
                          <Accordion.Body>
                            {Object.entries(subCategories).map(([subCategory, locations]) => (
                              <Form.Check
                                key={subCategory}
                                type="checkbox"
                                label={`${subCategory} (${locations.length})`}
                                checked={visibleCategories.includes(`${category}:${subCategory}`)}
                                onChange={(e) => handleCategoryToggle(category, subCategory, e.target.checked)}
                              />
                            ))}
                          </Accordion.Body>
                        </Accordion.Item>
                      ))}
                    </Accordion>
                  </div>
                )}
                {filteredLocations.map((feature, idx) => (
                  <Marker
                    key={idx}
                    position={[
                      feature.geometry.coordinates[1],
                      feature.geometry.coordinates[0],
                    ]}
                    icon={customIcon}
                  >
                    <Popup>
                      <div>
                        <p><strong>{feature.properties.loc_name}</strong></p>
                        {feature.properties.photo && (
                          <img
                            className={styles.popupImg}
                            src={`${process.env.PUBLIC_URL}/images/${feature.properties.photo}`}
                            alt={feature.properties.loc_name}
                          />
                        )}
                        <p>{feature.properties.description}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {/* Sniper Scope Button */}
                <button
                  className={styles.recenterButton}
                  onClick={async () => {
                    const address = await fetchAddress(location.latitude, location.longitude);
                    if (address) {
                      alert(`Current location: ${address}`);
                    } else {
                      alert("Address not found.");
                    }
                    // Recenter the map to the user's current location
                    const map = mapRef.current;
                    if (map && location.latitude && location.longitude) {
                      map.setView([location.latitude, location.longitude], 13); // Center the map on the user's current location
                    } else {
                      alert("Address cannot be set on the map.");
                    }
                  }}
                >
                  <div className={styles.sniperScope}></div>
                </button>
              </MapContainer>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
}

export default App;