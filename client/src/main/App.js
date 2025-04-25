import '../css/App.css';
import { React, useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap  } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import styles from '../css/NewStyles.module.css';
import api from '../utils/axios'; 
import { Outlet, Link, useNavigate } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import { Navbar, Nav, Button, Dropdown, Form, FormControl, Container, Row, Col, Modal } from 'react-bootstrap';
const LoginExpiredPrompt = ({ onClose }) => {
  return (
    <div className={styles['login-prompt-overlay']}>
      <div className={styles['login-prompt-content']}>
        <h2>Session Expired</h2>
        <p>Your session has expired. Please log in again.</p>
        <button 
          onClick={onClose}
          className={styles.submitButton}
        >
          OK
        </button>
      </div>
    </div>
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

  const getHeader = () => {
    if (loggedIn) {
      return (
        <Navbar bg="secondary" variant="dark" expand="lg" className="w-100">
          <Navbar.Brand className="text-white">Welcome</Navbar.Brand>
          <Nav className="ml-auto align-items-center">
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
          </Nav>
        </Navbar>
      );
    } else {
      return (
        <Navbar bg="secondary" variant="dark" expand="lg" className="w-100">
          <Navbar.Brand className="text-white">Welcome</Navbar.Brand>
          <Nav className="ml-auto align-items-center">
            <Link to="/login" className="text-white text-decoration-none mr-3">
              Login
            </Link>
            <Link to="/register" className="text-white text-decoration-none ml-3">
              Register
            </Link>
          </Nav>
        </Navbar>
      );
    }
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

  return (
    <Container fluid className="p-0">
      {showLoginPrompt && <LoginExpiredPrompt onClose={handleCloseLoginPrompt} />}
      <Row className="m-0" style={{ height: "100vh" }}>
        {/* Left Box */}
        <Col
          xs={12} // Full width on extra small screens
          md={3} // 30% of the screen width on medium and larger screens
          className="p-3"
          style={{
            backgroundColor: "#6c757d", // Same color as the header
            color: "white", // White text
            height: "100vh", // Full height of the viewport
          }}
        >
          <h5>Active Incidents</h5>
          <p>תהיה טבלה של אירועים</p>
          {/* Add more content here */}
        </Col>
  
        {/* Main Content */}
        <Col xs={12} md={9} className="p-0">
          {/* Header */}
          <Navbar bg="secondary" variant="dark" expand="lg" className="w-100">
            <Navbar.Brand className="text-white">Welcome</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="ml-auto align-items-center">
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
              </Nav>
            </Navbar.Collapse>
          </Navbar>
  
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