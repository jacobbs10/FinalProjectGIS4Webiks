import '../css/App.css';
import { React, useState, useEffect, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap  } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import styles from '../css/MainStyles.module.css';
import api from '../utils/axios'; 
import { Outlet, Link, useNavigate } from "react-router-dom";

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

  const RecenterMap = ({ lat, lng }) => {
    const map = useMap();
  
    useEffect(() => {
      map.setView([lat, lng]);
    }, [lat, lng, map]);
  
    return null; // This component doesn't render anything
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

  // Reset state
  setLoggedIn({ status: false, Name: "" });  
  setIsTokenValid(false);

  window.location.reload();
};

  const markers = [
    {
      geocode: [32.0860, 34.7825],
      popUp: "Place holder for locations"
    },
    {
      geocode: [32.0847, 34.7805],
      popUp: "Place holder for locations"
    },
    {
      geocode: [32.0858, 34.7798],
      popUp: "Place holder for locations"
    }
  ]

  const customIcon = new Icon({
    iconUrl: require("../icons/destination.png"),
    iconSize: [36,36]
  })

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
        <MapContainer center={[location.latitude, location.longitude]} zoom={13}>
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>  | <a href="https://www.flaticon.com/free-icons/destination" title="destination icons">Destination icons created by Flat Icons - Flaticon</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />     
           <RecenterMap lat={location.latitude} lng={location.longitude} />
                
          {markers.map(marker => (
            <Marker position={marker.geocode} icon={customIcon}>
              <Popup>{marker.popUp}</Popup>
            </Marker>
          ))}
      </MapContainer>
        </div>
        <div className={styles.footer}></div>
      </div>      
    </div>
    
    
  );
}

export default App;
