import '../css/App.css';
import { React, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, Circle, CircleMarker  } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import styles from '../css/NewStyles.module.css';
import api from '../utils/axios'; 
import { Outlet, Link, useNavigate } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import { Navbar, Nav, Button, Dropdown, Form, Accordion, Table, Badge, FormControl, Container, Row, Col, Modal, Toast } from 'react-bootstrap';
import { format } from 'date-fns';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import ResourcesDashboard from '../components/ResourcesDashboard';
import axios from "axios";  
import UpdateIncident from '../components/UpdateIncident';
import QtrsComp from '../components/QtrsComp'
import CreateIncidentModal from '../components/CreateIncidentModal';
import AutoGeneratorModal from '../components/AutoGeneratorModal';
import AddressSearchModal from '../components/AddressSearchModal';
import { startGenerator } from '../components/IncGenerator';
import DrawControl from '../components/DrowControl';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

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

const RouteVisualizer = ({ route, unitId }) => {
  const map = useMap();
  
  // Create a polyline for the route
  const routeLine = useMemo(() => {
    if (!route?.coordinates) return null;
    return L.polyline(route.coordinates, {
      color: '#3388ff',
      weight: 3,
      opacity: 0.7
    });
  }, [route]);

  // Create a marker for the responder
  const responderMarker = useMemo(() => {
    if (!route?.coordinates?.[0]) return null;
    return L.marker(route.coordinates[0], {
      icon: L.divIcon({
        className: 'responder-marker',
        html: '<div class="responder-icon"></div>',
        iconSize: [20, 20]
      })
    });
  }, [route]);

  // Add the route and marker to the map
  useEffect(() => {
    if (routeLine) {
      routeLine.addTo(map);
    }
    if (responderMarker) {
      responderMarker.addTo(map);
    }

    return () => {
      if (routeLine) {
        routeLine.remove();
      }
      if (responderMarker) {
        responderMarker.remove();
      }
    };
  }, [map, routeLine, responderMarker]);

  return null;
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
  const [modalStates, setModalStates] = useState({
    login: false,
    register: false,
    updateIncident: false,
    resources: false,
    autoGenerator: false,
    createIncident: false,
    addressSearch: false
  });
  const [locationsByCategory, setLocationsByCategory] = useState({});
  const [visibleCategories, setVisibleCategories] = useState([]);
  const [showLegend, setShowLegend] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showIncidentDetails, setShowIncidentDetails] = useState(false);  
  const [activeKeys, setActiveKeys] = useState([]);
  const [qtrs, setQtrs] = useState([]);
  const [selectedQtr, setSelectedQtr] = useState(null);
  const [checkedQtrs, setCheckedQtrs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [areaSelectedIncidents, setAreaSelectedIncidents] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);  
  const [areaSelected, setAreaSelected] = useState(false);
  const [selectedPolygons, setSelectedPolygons] = useState([]);
  const [rangeCircle, setRangeCircle] = useState(null); // For the range circle    
  const [activeRoutes, setActiveRoutes] = useState({}); // Store active routes
  const [responderMarkers, setResponderMarkers] = useState({}); // Store responder markers
  const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

  const mapRef = useRef(null);

  const stationIcons = {
    Fire: new L.Icon({
      iconUrl: require('../icons/icon_fire_station_1.png'),
      iconSize: [25, 25],
    }),
    Police: new L.Icon({
      iconUrl: require('../icons/icon_police_station_1.png'),
      iconSize: [25, 25],
    }),
    Medical: new L.Icon({
      iconUrl: require('../icons/icon_medical_hospital_4.png'),
      iconSize: [25, 25],
    }),
    ArmyRescue: new L.Icon({
      iconUrl: require('../icons/icon_army_tent.png'),
      iconSize: [25, 25],
    }),
  };

  
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
        // Initialize all categories as visible
        const allCategories = Object.entries(locationsByCategory).flatMap(([category, subCategories]) =>
          Object.keys(subCategories).map(subCategory => `${category}:${subCategory}`)
        );
        setVisibleCategories(allCategories);
        localStorage.setItem("visibleCategories", JSON.stringify(allCategories));
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }      
    }, [locationsByCategory]);

    useEffect(() => {
  const savedCategories = localStorage.getItem("visibleCategories");
  if (savedCategories) {
    setVisibleCategories(JSON.parse(savedCategories));
  }
}, []);

useEffect(() => {
  if (visibleCategories.length > 0) {
    localStorage.setItem("visibleCategories", JSON.stringify(visibleCategories));
  }
}, [visibleCategories]);

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
    const fetchLocsAndQtrs = async () => {
      try {
        const token = sessionStorage.getItem("token");
        if (!token) {
          console.warn("No token found in sessionStorage.");
          return;
        }
  
        // Fetch emergency locations
        const emergencyRes = await axios.get(`${BASE_URL}/api/emrgLocs/all`, {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json"
          }
        });
        
        // Group emergency locations
        const grouped = {};
        emergencyRes.data.locations.forEach((feature) => {
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
        setVisibleCategories(Object.keys(grouped));
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      }
    };
  
    fetchLocsAndQtrs();
  }, [qtrs]);

  useEffect(() => {
    const handleNewIncident = (event) => {
      const incident = event.detail;
      addNotification(incident);
    };
  
    window.addEventListener('newIncident', handleNewIncident);
    return () => window.removeEventListener('newIncident', handleNewIncident);
  }, []);

  useEffect(() => {
    const handleNewIncident = (event) => {
      const incident = event.detail;
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, incident }]);
      
      // Optionally auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    };
  
    window.addEventListener('newIncident', handleNewIncident);
    return () => window.removeEventListener('newIncident', handleNewIncident);
  }, []);

  const clearAreaSelection = useCallback(() => {
    setAreaSelectedIncidents([]);
  }, []);

  const handleAreaSelect = (incidents) => {
    setAreaSelectedIncidents(incidents);
    // Optionally, update visible categories or other state as needed
  };

    const handleCategoryToggle = (category, subCategory, checked) => {
      const key = `${category}:${subCategory}`;
      const updated = checked
        ? [...visibleCategories, key]
        : visibleCategories.filter((c) => c !== key);
    
      setVisibleCategories(updated);
      localStorage.setItem("visibleCategories", JSON.stringify(updated));
    };

    const addNotification = (incident) => {
      const id = Math.random().toString(36).slice(2, 11);
      setNotifications(prev => [...prev, { id, incident }]);
    };

    const handleStopGenerator = () => {
      sessionStorage.removeItem("GenerateInc");
      alert("Generator stopped");
    };

    const handleLoginSuccess = (user) => {
      // Update App.js state when login is successful
      sessionStorage.setItem("loginStatus", "true");
      sessionStorage.setItem("user", JSON.stringify(user));
      setLoggedIn(true);
      setUser(user);
      setModalStates(prev => ({...prev, login: false}));
      setShowLoginPrompt(false);
      window.location.reload();
    };
    
    const handleCategorySelectAll = (category, checked) => {
      const updatedCategories = [...visibleCategories];
      
      Object.keys(locationsByCategory[category]).forEach(subCategory => {
        const key = `${category}:${subCategory}`;
        const keyIndex = updatedCategories.indexOf(key);
        
        if (checked && keyIndex === -1) {
          updatedCategories.push(key);
        } else if (!checked && keyIndex !== -1) {
          updatedCategories.splice(keyIndex, 1);
        }
      });
      
      setVisibleCategories(updatedCategories);
      localStorage.setItem("visibleCategories", JSON.stringify(updatedCategories));
    };

    const handleQtrSelect = (qtr) => {
      setSelectedQtr(qtr);
      
      // Center map on the first coordinate of the polygon
      if (mapRef.current && qtr.geometry.coordinates[0][0]) {
        const [lng, lat] = qtr.geometry.coordinates[0][0];
        mapRef.current.setView([lat, lng], 14);
      }
    };

    const handleQtrCheckAll = (checked) => {
      if (checked) {
        setCheckedQtrs(qtrs.map(qtr => qtr.properties.neighborhood));
      } else {
        setCheckedQtrs([]);
      }
    };
    
    const handleQtrCheck = (neighborhood, checked) => {
      if (checked) {
        setCheckedQtrs(prev => [...prev, neighborhood]);
      } else {
        setCheckedQtrs(prev => prev.filter(n => n !== neighborhood));
      }
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
                  Qtrs
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ padding: '10px', minWidth: '200px', maxHeight: '300px', overflowY: 'auto' }}>
                  <Form.Check
                    type="checkbox"
                    label="Select All"
                    checked={checkedQtrs.length === qtrs.length}
                    onChange={(e) => handleQtrCheckAll(e.target.checked)}
                    className="mb-2"
                  />
                  <Dropdown.Divider />
                  {qtrs.map((qtr, index) => (
                    <Form.Check
                      key={index}
                      type="checkbox"
                      label={qtr.properties.neighborhood}
                      checked={checkedQtrs.includes(qtr.properties.neighborhood)}
                      onChange={(e) => {
                        handleQtrCheck(qtr.properties.neighborhood, e.target.checked);
                        if (e.target.checked) {
                          handleQtrSelect(qtr);
                        }
                      }}
                      className="mb-1"
                    />
                  ))}
                </Dropdown.Menu>
              </Dropdown>                    
                    {user?.role === "Admin" && (
                      <Button
                        className="btn btn-link text-white text-decoration-none mr-3"
                        onClick={() => setModalStates(prev => ({...prev, resources: true}))}  
                      >
                        Resources
                      </Button>
                    )}
                    <Button
                      variant="link"
                      className="text-white text-decoration-none mr-3"
                      onClick={() => setModalStates(prev => ({...prev, createIncident: true}))}
                    >
                      New Incident
                    </Button>
                    <Button
                      variant="link"
                      className="text-white text-decoration-none mr-3"
                      onClick={() => setModalStates(prev => ({...prev, autoGenerator: true}))}
                    >
                      Auto Generator
                    </Button>
                    <Button
                      variant="link"
                      className="text-white text-decoration-none mr-3"
                      onClick={handleStopGenerator}
                    >
                      Stop Generator
                    </Button>
                    <Button
                      variant="link"
                      className="text-white text-decoration-none mr-3"
                      onClick={() => setModalStates(prev => ({...prev, addressSearch: true}))}
                    >
                      Search Address
                    </Button>
                    <Button
                      variant="link"
                      className="text-white text-decoration-none mr-3"
                      onClick={() => setRangeCircle(null)}
                    >
                      Clear Circle
                    </Button>                    
                    <Button
                      variant="link"
                      onClick={handleLogout}
                      className="text-white text-decoration-none mr-3"
                    >
                      Logout
                    </Button>
                    {user?.role === "Admin" && (
                      <Link to="/admin" className={styles.btnCircle}>                        
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      variant="link"
                      className="text-white text-decoration-none mr-3"
                      onClick={() => setModalStates(prev => ({...prev, login: true}))}
                    >
                      Login
                    </Button>
                    <Button
                      variant="link"
                      className="text-white text-decoration-none ml-3"
                      onClick={() => setModalStates(prev => ({...prev, register: true}))}
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

  const filteredLocations = useMemo(() => {
    const visibleByCategory = Object.entries(locationsByCategory)
      .reduce((acc, [category, subCategories]) => {
        Object.entries(subCategories).forEach(([subCategory, locations]) => {
          const key = `${category}:${subCategory}`;
          if (visibleCategories.includes(key)) {
            acc.push(...locations);
          }
        });
        return acc;
      }, []);
  
    // Combine visible categories with area-selected incidents
    return [...new Set([...visibleByCategory, ...areaSelectedIncidents])];
  }, [locationsByCategory, visibleCategories, areaSelectedIncidents]);

  const getStationIcon = (subCategory) => {
    return stationIcons[subCategory] || stationIcons.Default;
  };

  const handleAreaSelection = (location) => {
    
    setAreaSelected(true);

    const matchingQtrs = qtrs.filter(qtr => 
      location.properties.qtrs_list.includes(qtr.properties.id)
    );
  
    setSelectedPolygons(matchingQtrs); 
  };
  
  // Function to get the style for incidents based on their status
  const getIncidentStyle = (status) => {
    switch (status) {
      case 'Open':
        return { color: 'red', fillColor: 'red', fillOpacity: 0.6, radius: 10, className: 'beaming-circle' };
      case 'InProgress':
        return { color: 'orange', fillColor: 'orange', fillOpacity: 0.6, radius: 10, className: 'beaming-circle' };
      case 'Closed':
        return { color: 'green', fillColor: 'green', fillOpacity: 0.6, radius: 10 };
      default:
        return { color: 'gray', fillColor: 'gray', fillOpacity: 0.6, radius: 10 };
    }
  };

  useEffect(() => {
    // Import the simulation socket utilities
    const {
      connectToSimulation,
      disconnectFromSimulation,
      onResponderUpdate,
      onResponderArrived,
      removeResponderUpdateListener,
      removeResponderArrivedListener
    } = require('../utils/simulationSocket');

    // Connect to simulation when component mounts
    const socket = connectToSimulation();

    // Handle responder position updates
    const handleResponderUpdate = (data) => {
      setResponderMarkers(prev => ({
        ...prev,
        [data.unitId]: {
          position: data.location.coordinates,
          status: 'enroute'
        }
      }));
    };

    // Handle responder arrival
    const handleResponderArrived = (data) => {
      setResponderMarkers(prev => ({
        ...prev,
        [data.unitId]: {
          position: data.location.coordinates,
          status: 'on_scene'
        }
      }));
    };

    // Add event listeners
    onResponderUpdate(handleResponderUpdate);
    onResponderArrived(handleResponderArrived);

    // Cleanup on unmount
    return () => {
      removeResponderUpdateListener(handleResponderUpdate);
      removeResponderArrivedListener(handleResponderArrived);
      disconnectFromSimulation();
    };
  }, []);

  return (
    <>
      <QtrsComp qtrs={qtrs} setQtrs={setQtrs} />
      <Container fluid className="p-0">            
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          maxWidth: '300px'
        }}
      >
        {notifications.map(({ id, incident }) => (
          <Toast
            key={id}
            onClose={() => setNotifications(prev => prev.filter(n => n.id !== id))}
            show={true}
            delay={5000}
            autohide
          >
            <Toast.Header>
              <strong className="me-auto">New Incident</strong>
              <small>{incident?.properties?.sub_category || 'Unknown Type'}</small>
            </Toast.Header>
            <Toast.Body>
              <p><strong>ID:</strong> {incident?.id || 'N/A'}</p>
              <p><strong>Location:</strong> {incident?.properties?.loc_name || 'N/A'}</p>
              <p><strong>Type:</strong> {incident?.properties?.sub_category || 'N/A'}</p>
            </Toast.Body>
          </Toast>
        ))}
      </div>
        {showLoginPrompt && <LoginExpiredPrompt onClose={handleCloseLoginPrompt} />}
        <LoginModal 
          show={modalStates.login} 
          onHide={() => setModalStates(prev => ({...prev, login: false}))}
          onLoginSuccess={handleLoginSuccess}
        />
        <RegisterModal 
          show={modalStates.register} 
          onHide={() => setModalStates(prev => ({...prev, register: false}))}
        />
        <UpdateIncident 
          show={modalStates.updateIncident}
          onHide={() => {
            setModalStates(prev => ({...prev, updateIncident: false}));
            setShowIncidentDetails(true); // Show details popup again
          }}
          incident={selectedIncident}
        />
        <CreateIncidentModal
          show={modalStates.createIncident}
          onHide={() => setModalStates(prev => ({...prev, createIncident: false}))}
        />
        <AddressSearchModal
          show={modalStates.addressSearch}
          onHide={() => setModalStates(prev => ({...prev, addressSearch: false}))}
          setRangeCircle={setRangeCircle}
        />
        <AutoGeneratorModal
          show={modalStates.autoGenerator}
          onHide={() => setModalStates(prev => ({...prev, autoGenerator: false}))}
          onStart={(settings) => {
            if (sessionStorage.getItem("GenerateInc") === "true") {
              alert("Generator is already running!");
              return;
            }
            console.log("Starting generator with settings:", settings); // Debug log
            sessionStorage.setItem("GenerateInc", "true");
            startGenerator(settings)
              .then(() => {
                console.log("Generator started successfully");
                setModalStates(prev => ({...prev, autoGenerator: false}));
              })
              .catch(error => {
                console.error("Failed to start generator:", error);
                sessionStorage.removeItem("GenerateInc");
                alert("Failed to start generator: " + error.message);
              });
          }}
        />     
        <ResourcesDashboard 
          show={modalStates.resources}
          onHide={() => setModalStates(prev => ({...prev, resources: false}))}          
        />

        <Row className="m-0" style={{ height: "100vh" }}>
          {/* Left Box */}                
          <Col xs={4} sm={3} className="p-3" style={{
            backgroundColor: "#6c757d",
            color: "white",
            height: "100vh",
            overflowY: "auto"
          }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5>Active Incidents</h5>
            </div>
            
            <Accordion>
              {Object.entries(
                filteredLocations
                  .filter(loc => loc.properties.category === 'Incidents')
                  .sort((a, b) => new Date(b.properties.incident_start_time) - new Date(a.properties.incident_start_time)) // Sort descending
                  .reduce((acc, incident) => {
                    const subCat = incident.properties.sub_category;
                    if (!acc[subCat]) acc[subCat] = [];
                    acc[subCat].push(incident);
                    return acc;
                  }, {})
              ).map(([subCategory, incidents], idx) => (
                <Accordion.Item eventKey={idx.toString()} key={idx} className="mb-2">
                  <Accordion.Header>
                    <div className="d-flex justify-content-between w-100 align-items-center pe-3">
                      <span>{subCategory}</span>
                      <Badge bg="light" text="dark">
                        {incidents.length}
                      </Badge>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body className="p-0">
                    <Table striped hover variant="dark" responsive className="mb-0">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Status</th>
                          <th>Time</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidents.map((incident, idx) => (
                          <tr key={idx}>
                            <td>{incident.properties.loc_name}</td>
                            <td>
                              <Badge bg={
                                incident.properties.loc_status === 'Open' ? 'danger' :
                                incident.properties.loc_status === 'InProgress' ? 'warning' :
                                'success'
                              }>
                                {incident.properties.loc_status}
                              </Badge>
                            </td>
                            <td>
                              {format(new Date(incident.properties.incident_start_time), 'HH:mm dd/MM')}
                            </td>
                            <td>
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => {
                                console.log("Selected incident:", incident); // Debug log
                                if (incident) {
                                  setSelectedIncident({ ...incident }); // Create a new object to ensure state update
                                  setShowIncidentDetails(true);
                                }
                              }}
                            >
                              Details
                            </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
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
                  style={{ height: "100%", width: "100%" }}
                  ref={mapRef}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {/* Add RouteVisualizer for each active route */}
                  {Object.entries(activeRoutes).map(([unitId, route]) => (
                    <RouteVisualizer key={unitId} route={route} unitId={unitId} />
                  ))}
                  
                  <DrawControl 
                    onAreaSelect={handleAreaSelect} 
                    onClearSelection={clearAreaSelection}
                  />
                  {qtrs.map((qtr, idx) => {
                    if (!checkedQtrs.includes(qtr.properties.neighborhood)) return null;
                    
                    return (
                      <Polygon
                        key={`qtr-${idx}`}
                        positions={qtr.geometry.coordinates[0].map(coord => [coord[1], coord[0]])}
                        pathOptions={{
                          color: 'blue',
                          fillColor: 'blue',
                          fillOpacity: 0.2,
                        }}
                      >
                        <Popup>
                          <p><strong>{qtr.properties.neighborhood}</strong></p>
                          <p><strong>{qtr.properties.id}</strong></p>
                        </Popup>
                      </Polygon>
                    );
                  })}
                  {rangeCircle && (
                    <Circle
                        center={rangeCircle.center}
                        radius={rangeCircle.radius}
                        interactive={false}
                        pathOptions={{
                        color: "yellow", // Circle border color
                        fillColor: "yellow", // Circle fill color
                        fillOpacity: 0.2, // Translucent fill
                        }}
                    />
                    )} 
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
                                    // Find and replace the incident details popup div with this updated version:
                  {showIncidentDetails && selectedIncident && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50px",
                        right: "10px",
                        zIndex: 1001,
                        backgroundColor: "white",
                        borderRadius: "5px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                        padding: "15px",
                        width: "300px",
                        color: "black",
                        maxHeight: "calc(100vh - 100px)", // Set maximum height
                        display: "flex",
                        flexDirection: "column"
                      }}
                    >
                      <div className="d-flex justify-content-between mb-3">
                        <h5 style={{ margin: 0 }}>Incident Details</h5>
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => {
                            setShowIncidentDetails(false);
                            setSelectedIncident(null);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                      
                      <div style={{ overflowY: "auto", flexGrow: 1 }}> {/* Scrollable container */}
                        {selectedIncident?.properties ? (
                          <div>
                            <p><strong>Type:</strong> {selectedIncident.properties.sub_category || 'N/A'}</p>
                            <p><strong>Name:</strong> {selectedIncident.properties.loc_name || 'N/A'}</p>
                            <p><strong>Address:</strong> {selectedIncident.properties.address || 'N/A'}</p>
                            <p><strong>Description:</strong> {selectedIncident.properties.description || 'N/A'}</p>
                            <p><strong>Status:</strong> {selectedIncident.properties.loc_status || 'N/A'}</p>
                            {selectedIncident.properties.incident_start_time && (
                              <p><strong>Started:</strong> {
                                format(new Date(selectedIncident.properties.incident_start_time), 
                                'HH:mm dd/MM/yyyy')
                              }</p>
                            )}
                            
                            {Array.isArray(selectedIncident.properties.equipment) && (
                              <div className="mt-3">
                                <p><strong>Equipment:</strong></p>
                                {selectedIncident.properties.equipment.map((item, idx) => (
                                  <p key={idx} style={{ 
                                    color: item.qty < item.min_qty ? 'red' : 'inherit',
                                    marginLeft: '10px',
                                    marginBottom: '5px'
                                  }}>
                                    {item.qty} {item.type}
                                  </p>
                                ))}
                              </div>
                            )}
                  
                            {Array.isArray(selectedIncident.properties.vehicles) && (
                              <div className="mt-3">
                                <p><strong>Vehicles:</strong></p>
                                {selectedIncident.properties.vehicles.map((vehicle, idx) => (
                                  <p key={idx} style={{ 
                                    color: vehicle.qty < vehicle.min_qty ? 'red' : 'inherit',
                                    marginLeft: '10px',
                                    marginBottom: '5px'
                                  }}>
                                    {vehicle.qty} {vehicle.type}
                                  </p>
                                ))}
                              </div>
                            )}
                  
                            {selectedIncident.properties.available_personal !== undefined && (
                              <p style={{ 
                                color: selectedIncident.properties.available_personal < selectedIncident.properties.min_personal ? 'red' : 'inherit'
                              }}>
                                <strong>Responders:</strong> {selectedIncident.properties.available_personal}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p>Loading incident details...</p>
                        )}
                      </div>
                  
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="w-100 mt-3"
                        onClick={() => {
                          setShowIncidentDetails(false); // Hide details popup
                          setModalStates(prev => ({...prev, updateIncident: true})); // Show update modal
                        }}
                      >
                        Update Incident
                      </Button>
                    </div>
                  )}
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
                        maxHeight: "calc(100vh - 100px)",
                        width: "300px",
                        overflowY: "auto",
                        overflowX: "hidden"
                      }}
                    >
                      <h5 style={{ position: "sticky", top: 0, backgroundColor: "white", padding: "5px 0", marginBottom: "10px" }}>
                        Legend
                      </h5>
                      <Accordion style={{ maxHeight: "calc(100% - 40px)" }}>
                        {Object.entries(locationsByCategory).map(([category, subCategories]) => {
                          const subCategoryKeys = Object.keys(subCategories).map(sub => `${category}:${sub}`);
                          const allChecked = subCategoryKeys.every(key => visibleCategories.includes(key));
                          const someChecked = subCategoryKeys.some(key => visibleCategories.includes(key));
                          
                          return (
                            <Accordion.Item eventKey={category} key={category}>
                              <Accordion.Header>
                                <Form.Check
                                  type="checkbox"
                                  label={category}
                                  checked={allChecked}
                                  indeterminate={!allChecked && someChecked}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleCategorySelectAll(category, e.target.checked);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ marginRight: '10px' }}
                                />
                              </Accordion.Header>
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
                          );
                        })}
                      </Accordion>
                    </div>
                  )}
                  // Render markers for incidents and stations
                  {filteredLocations.map((feature, idx) => {
                    const { category, sub_category, loc_status } = feature.properties;

                    // Render incidents as CircleMarkers
                    if (category === 'Incidents') {
                      const style = getIncidentStyle(loc_status);
                      return (
                        <CircleMarker
                          key={idx}
                          center={[
                            feature.geometry.coordinates[1],
                            feature.geometry.coordinates[0],
                          ]}
                          pathOptions={style}
                          eventHandlers={{
                            click: () => {
                              setSelectedLocation(feature);
                              handleAreaSelection(feature);
                            },
                          }}
                        >
                          {selectedLocation && (
                            <Popup>
                              <div 
                                style={{
                                  position: "absolute",
                                  top: "50px",
                                  right: "10px",
                                  zIndex: 1001,
                                  backgroundColor: "white",
                                  borderRadius: "5px",
                                  boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                                  padding: "15px",
                                  width: "300px",
                                  color: "black",
                                  maxHeight: "calc(100vh - 100px)",
                                  overflowY: "auto",
                                }}
                              >
                                <div className="d-flex justify-content-between mb-3">
                                  <h5 style={{ margin: 0 }}>{selectedLocation.properties.loc_name}</h5>
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedLocation(null);
                                      setAreaSelected(null); // Close the popup
                                      setSelectedPolygons([]); // Clear selected polygons
                                    }
                                  }
                                  >
                                    ×
                                  </Button>
                                </div>                          
                                  <p><strong>Description:</strong> {selectedLocation.properties.description}</p>
                                  <p><strong>Address:</strong> {selectedLocation.properties.address}</p>
                                  <p><strong>Status:</strong> {selectedLocation.properties.loc_sttus}</p>
                              </div>
                            </Popup>
                          )}
                        </CircleMarker>
                      );
                    }

                    // Render stations as Markers with custom icons
                    if (category === 'Stations') {
                      const icon = getStationIcon(sub_category);
                      return (
                        <Marker
                          key={idx}
                          position={[
                            feature.geometry.coordinates[1],
                            feature.geometry.coordinates[0],
                          ]}
                          icon={icon}
                          eventHandlers={{
                            click: () => {
                              setSelectedLocation(feature);
                              handleAreaSelection(feature);
                            },
                          }}
                        >
                          {selectedLocation && (
                              <div 
                                style={{
                                  position: "absolute",
                                  top: "50px",
                                  right: "10px",
                                  zIndex: 1001,
                                  backgroundColor: "white",
                                  borderRadius: "5px",
                                  boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                                  padding: "15px",
                                  width: "300px",
                                  color: "black",
                                  maxHeight: "calc(100vh - 100px)",
                                  overflowY: "auto",
                                }}
                              >
                                <div className="d-flex justify-content-between mb-3">
                                  <h5 style={{ margin: 0 }}>{selectedLocation.properties.loc_name}</h5>
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedLocation(null);
                                      setAreaSelected(null); // Close the popup
                                      setSelectedPolygons([]); // Clear selected polygons
                                    }
                                   } // Close the popup
                                  >
                                    ×
                                  </Button>
                                </div>                          
                                  <p><strong>Description:</strong> {selectedLocation.properties.description}</p>
                                  <p><strong>Address:</strong> {selectedLocation.properties.address}</p>
                                  <p><strong>Email:</strong> {selectedLocation.properties.email}</p>
                                  <p><strong>Phone:</strong> {selectedLocation.properties.phone}</p>                          
                              </div>
                      )}
                        </Marker>
                      );
                    }

                    return null;
                  })}
                  {selectedPolygons.map((qtr, idx) => (
                    <Polygon
                      key={`qtr-${idx}`}
                      positions={qtr.geometry.coordinates[0].map(coord => [coord[1], coord[0]])}
                      pathOptions={{
                        color: 'green',
                        fillColor: 'green',
                        fillOpacity: 0.2,
                      }}
                    >
                      <Popup>
                        <p><strong>{qtr.properties.neighborhood}</strong></p>
                        <p><strong>{qtr.properties.id}</strong></p>
                      </Popup>
                    </Polygon>
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
                  {/* Render circle around selected marker */}
                  {selectedLocation && (
                    <Circle
                      center={[selectedLocation.geometry.coordinates[1], selectedLocation.geometry.coordinates[0]]}
                      radius={400} // radius in meters (adjust if you want)
                      pathOptions={{
                        color: 'blue',
                        fillColor: 'blue',
                        fillOpacity: 0.4,
                      }}
                    />
                  )}                  
                </MapContainer>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default App;