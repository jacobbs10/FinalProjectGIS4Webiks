import '../css/App.css';
import { React, useState, useEffect, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, LayerGroup, useMapEvents  } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import styles from '../css/MainStyles.module.css';
import api from '../utils/axios'; 
import { Outlet, Link, useNavigate } from "react-router-dom";
import axios from "axios";

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

// Popup overlay
const MapClickPopup = ({ latlng, onSelectOption, onClose }) => {
  const [range, setRange] = useState(100);

  return (
    <div className={styles['popup-overlay']}>
      <div className={styles['popup-box']}>
        <h3>Choose an Option</h3>
        <p>Clicked: {latlng.lat.toFixed(5)}, {latlng.lng.toFixed(5)}</p>
        <button onClick={() => onSelectOption("neighborhood")}>Show locations in neighborhood</button>
        <div style={{ marginTop: "10px" }}>
          <label>Range (meters): </label>
          <select value={range} onChange={(e) => setRange(parseInt(e.target.value))}>
            <option value={100}>100m</option>
            <option value={200}>200m</option>
            <option value={500}>500m</option>
          </select>
          <button onClick={() => onSelectOption("range", range)} style={{ marginLeft: "10px" }}>
            Show within range
          </button>
        </div>
        <button onClick={onClose} style={{ marginTop: "10px" }}>Cancel</button>
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
  const [locationsByCategory, setLocationsByCategory] = useState({});
  const [visibleCategories, setVisibleCategories] = useState([]);
  const [showLayerPanel, setShowLayerPanel] = useState(true); 
  const [clickedLocation, setClickedLocation] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [results, setResults] = useState([]);
  const PORT = process.env.SERVER_PORT || 5000;
  const categoryIcons = {
    Restroom: new Icon({ iconUrl: require("../icons/destination.png"), iconSize: [36, 36] }),
    Restaurant: new Icon({ iconUrl: require("../icons/destination.png"), iconSize: [36, 36] }),
    Shop: new Icon({ iconUrl: require("../icons/destination.png"), iconSize: [36, 36] }),
    Shelter: new Icon({ iconUrl: require("../icons/destination.png"), iconSize: [36, 36] }),
    Park: new Icon({ iconUrl: require("../icons/destination.png"), iconSize: [36, 36] }),
    Museum: new Icon({ iconUrl: require("../icons/destination.png"), iconSize: [36, 36] }),
    Other: new Icon({ iconUrl: require("../icons/destination.png"), iconSize: [36, 36] }),
    // fallback/default
    default: new Icon({ iconUrl: require("../icons/destination.png"), iconSize: [36, 36] }),
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
    const fetchLocations = async () => {
      try {
        const token = sessionStorage.getItem("token");
        if (!token) {
          console.warn("No token found in sessionStorage.");
          return;
        }
        const res = await axios.get(`http://localhost:${PORT}/api/locs`, {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json"
          }
        });
        const features = res.data.locations;
  
        const grouped = {};
        features.forEach(feature => {
          const category = feature.properties.category || "Uncategorized";
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push(feature);
        });
  
        setLocationsByCategory(grouped);
        setVisibleCategories(Object.keys(grouped)); // Default: show all
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      }
    };
  
    fetchLocations();
  }, []);

 /* const RecenterMap = ({ lat, lng }) => {
    const map = useMap();
  
    useEffect(() => {
      map.setView([lat, lng]);
    }, [lat, lng, map]);
  
    return null; // This component doesn't render anything
  };*/

  const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({
      click(e) {
        onMapClick(e.latlng); // latlng = { lat, lng }
      },
    });
    return null;
  };

  const handleMapClick = (latlng) => {
    setClickedLocation(latlng); // store it in state
    setShowOptions(true);       // show a modal/popup with "in range" or "neighborhood"
  };

  const geocodeAddress = async (address) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json`);
    const data = await res.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    throw new Error("Address not found");
  };

  const handleUserChoice = async (latlng, option, range) => {
    try {
      //console.log("User clicked:", latlng, "Option:", option, "Range:", range);
      const token = sessionStorage.getItem("token");
      if (option === "neighborhood") {
        //console.log("Fetching neighborhood data...");
        const polygon = await  axios.get(`http://localhost:${PORT}/api/hood/position`, {
          params: {
            lng: latlng.lng,
            lat: latlng.lat,
          },
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json"
          }
        });
        //console.log("Neighborhood polygon:", polygon.data.geometry.coordinates);               
        const locations = await  axios.post(`http://localhost:${PORT}/api/locs/area`, { coordinates: polygon.data.geometry.coordinates }, {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json"
          }
        });
        //console.log("Locations in neighborhood:", locations.data);
        setResults(locations.data);
      } else if (option === "range") {
        const locations = await api.post(`http://localhost:${PORT}/api/locs/range`, {coordinates: [latlng.lng, latlng.lat], range: range}, {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json"
          }
        });
        //console.log("Locations in range:", locations.data);          
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
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

useEffect(() => {
  const saved = localStorage.getItem("visibleCategories");
  if (saved) {
    setVisibleCategories(JSON.parse(saved));
  }
}, []);

const handleCategoryToggle = (category, checked) => {
  const updated = checked
    ? [...visibleCategories, category]
    : visibleCategories.filter((c) => c !== category);
  setVisibleCategories(updated);
  localStorage.setItem("visibleCategories", JSON.stringify(updated));
};

const handleLogout = () => {
  console.log("Logging out...");
  // Clear session storage
  sessionStorage.removeItem("token"); 
  sessionStorage.removeItem("user");

  // Reset state
  setLoggedIn({ status: false, Name: "" });  
  setIsTokenValid(false);

  window.location.reload();
};

  return (
    <div className={styles.container}>
      {showLoginPrompt && <LoginExpiredPrompt onClose={handleCloseLoginPrompt} />}
      <div className={styles.content}>
        <div className={styles.header}>
        <nav className="App-navigation">
          <a className="App-link" href="/register">Register</a>
          <a>/</a>
          <a className="App-link" href="/login">Login</a>
          <a>/</a>
          <button 
            className="App-link" 
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
          >
            Logout
          </button>
          {user?.role === "Admin" && (
            <div className={styles.adminMenuContainer}>
            <button 
              onClick={() => setShowAdminMenu(prev => !prev)} 
              className={styles.adminenuToggle}
            >
            Admin Activities ▼
          </button>
          {showAdminMenu && (
            <div className={styles.adminMenuDropdown}>
              <Link to="/admin">Manage Users</Link>
              <Link to="/hoods">Manage Neighborhoods</Link>
            </div>
          )}
          </div>
        )}
          <span style={{ color: '#61dafb', marginLeft: '5px' }}>&copy;</span>

        </nav>
        </div>
        <div className={styles.middle}>
        <div className={styles.layerPanelWrapper}>
          <button 
            onClick={() => setShowLayerPanel(prev => !prev)} 
            className={styles.layerToggleButton}
          >
            {showLayerPanel ? 'Hide Layers' : 'Show Layers'}
          </button>

          {showLayerPanel && (
            <div className={styles.legend}>
            {Object.keys(locationsByCategory).map((category) => (
              <label key={category} className={styles.legendItem}>
                <input
                  type="checkbox"
                  checked={visibleCategories.includes(category)}
                  onChange={(e) => handleCategoryToggle(category, e.target.checked)}
                />
                <img src={categoryIcons[category]?.options.iconUrl} alt="" width={20} style={{ marginRight: '5px' }} />
                {category}
              </label>
            ))}
          </div>
          )}
        </div>
        <MapContainer center={[location.latitude, location.longitude]} zoom={13}>
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>  | <a href="https://www.flaticon.com/free-icons/destination" title="destination icons">Destination icons created by Flat Icons - Flaticon</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />     
           {/*<RecenterMap lat={location.latitude} lng={location.longitude} />*/}
           <MapClickHandler onMapClick={handleMapClick} />
                
           {Object.entries(locationsByCategory).map(([category, features]) => (
              visibleCategories.includes(category) && (
                <LayerGroup key={category}>
                  {features.map((feature, idx) => (
                    <Marker
                      key={`${category}-${idx}`}
                      position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
                      icon={categoryIcons[category] || categoryIcons.default}
                    >
                    </Marker>
                  ))}
                </LayerGroup>
              )
            ))}          
      </MapContainer>
      {showOptions && clickedLocation && (
        <MapClickPopup 
          latlng={clickedLocation}
          onSelectOption={(option, range) => {
            handleUserChoice(clickedLocation, option, range);
            setShowOptions(false);
          }}
          onClose={() => setShowOptions(false)}
        />
      )}
        </div>
        <div className={styles.footer}></div>
      </div>      
    </div>
    
    
  );
}

export default App;
