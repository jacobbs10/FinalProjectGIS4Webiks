import React, { useState } from 'react';
import { Button, Modal, Form } from 'react-bootstrap';
import styles from '../css/NewStyles.module.css';
import axios from "axios";
import { Circle } from 'react-leaflet'; // Import Circle from react-leaflet
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS 

const AddressSearchModal = ({ show, onHide }) => {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [coordinates, setCoordinates] = useState(null);
  const [rangeCircle, setRangeCircle] = useState(null); // For the range circle
  const [locations, setLocations] = useState([]); // For the locations in range
  const [token, setToken] = useState(sessionStorage.getItem("token") || null);
  const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";
  

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

  // Fetch suggestions from Nominatim
  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&addressdetails=1&limit=5`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  // Handle address input change
  const handleCompleteAddress = async (address) => {
    //const address = e.target.value;
    if (address) {
      try {
        const coords = await geocodeAddress(address);
        setCoordinates(coords);
      } catch (err) {
        alert("Failed to find address.");
      }
    }
    setRangeCircle(null);
    setAddress(address);
    fetchSuggestions(address);
    const range = 1000; // Set a default range in meters (1 km)
    setRangeCircle({
        center: [coordinates.lat, coordinates.lng],
        radius: range,
      });
      const locations = await axios.post(`${BASE_URL}/api/locs/range`, {coordinates: [coordinates.lng, coordinates.lat], range: range}, {
        headers: {
          Authorization: `${token}`,
          "Content-Type": "application/json"
        }
      });
      //console.log("Locations in range:", locations.data);          
      const features = locations.data.locations;
      setLocations(features);

  };

   // Handle address input change
   const handleInputChange = (e) => {
    const value = e.target.value;
    setAddress(value);
    fetchSuggestions(value);
  };

  // Handle address selection
  const handleSelect = (suggestion) => {
    setAddress(suggestion.display_name);
    setCoordinates({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    });
    setSuggestions([]); // Clear suggestions after selection
  };

  const handleAddressSubmit = (event) => {
    event.preventDefault();
    setRangeCircle(null);
    // Apply your logic here with the address, for example:
    console.log("Address Submitted:", address);
    onHide();  // Optionally close the modal after submission
  };

  return (
    <Modal show={show} onHide={onHide} setRangeCircle={setRangeCircle}>
        <Modal.Header closeButton>
            <Modal.Title>Address Search</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            {/* Address search bar */}
            <Form onSubmit={handleAddressSubmit}>
            <Form.Group controlId="addressSearch">
                <Form.Control
                type="text"
                placeholder="Enter address"
                value={address}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                    handleCompleteAddress(address);  // Trigger the submit logic when Enter is pressed
                    }
                }}
                />
            </Form.Group>
            </Form>
            {suggestions.length > 0 && (
            <div className={styles.suggestionsDropdown}>
            {suggestions.map((suggestion) => (
                <div
                key={suggestion.place_id}
                className={styles.suggestion}
                onClick={() => handleSelect(suggestion)}
                >
                {suggestion.display_name}
                </div>
            ))}
            </div>
        )}
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={onHide}>
            Close
            </Button>
        </Modal.Footer>        
    </Modal>
  );
};

export default AddressSearchModal;
