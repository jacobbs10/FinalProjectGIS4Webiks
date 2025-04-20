import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import api from '../utils/axios';

const LocationsSearch = () => {
  const [userPosition, setUserPosition] = useState(null);
  const [category, setCategory] = useState('');
  const [distance, setDistance] = useState('');
  const [locations, setLocations] = useState([]);
  const [neighborhood, setNeighborhood] = useState(null);
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState('distance'); // 'distance' or 'neighborhood'
  const [userRole, setUserRole] = useState('Viewer');

  useEffect(() => {
    // Get user's current position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  }, []);

  useEffect(() => {
    // Get user role from authentication
    const getUserRole = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (token) {
          const response = await api.get('/api/auth/user-role');
          setUserRole(response.data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    
    getUserRole();
  }, []);

  const getNeighborhood = async () => {
    if (!userPosition) return;

    try {
      const response = await api.post('/api/neighborhoods/find', {
        coordinates: [userPosition.longitude, userPosition.latitude]
      });

      if (response.status !== 200) {
        throw new Error('Failed to fetch neighborhood');
      }

      setNeighborhood(response.data);
    } catch (error) {
      console.error('Error fetching neighborhood:', error);
      setError('Failed to determine your neighborhood.');
    }
  };

  const searchByDistance = async () => {
    if (!userPosition || !category || !distance) {
      setError('Please provide all required information.');
      return;
    }

    try {
      const response = await api.post('/api/locations/search/distance', {
        coordinates: [userPosition.longitude, userPosition.latitude],
        category,
        distance: Number(distance),
        userRole
      });

      if (response.status !== 200) {
        throw new Error('Failed to fetch locations');
      }

      setLocations(response.data);
      setError('');
    } catch (error) {
      console.error('Error searching locations:', error);
      setError('Failed to search locations. Please try again.');
    }
  };

  const searchByNeighborhood = async () => {
    if (!neighborhood || !category) {
      setError('Please provide all required information.');
      return;
    }

    try {
      const response = await api.post('/api/locations/search/neighborhood', {
        neighborhoodId: neighborhood._id,
        category,
      });

      if (response.status !== 200) {
        throw new Error('Failed to fetch locations');
      }

      setLocations(response.data);
      setError('');
    } catch (error) {
      console.error('Error searching locations:', error);
      setError('Failed to search locations. Please try again.');
    }
  };

  useEffect(() => {
    if (userPosition && searchType === 'neighborhood') {
      getNeighborhood();
    }
  }, [userPosition, searchType]);

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Search Locations
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Search Type</InputLabel>
            <Select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              label="Search Type"
            >
              <MenuItem value="distance">By Distance</MenuItem>
              <MenuItem value="neighborhood">By Neighborhood</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              label="Category"
            >
              <MenuItem value="SafeZone">Safe Zone</MenuItem>
              <MenuItem value="Restroom">Restroom</MenuItem>
              <MenuItem value="Restaurant">Restaurant</MenuItem>
            </Select>
          </FormControl>

          {searchType === 'distance' && (
            <TextField
              fullWidth
              label="Distance (meters)"
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          {searchType === 'neighborhood' && neighborhood && (
            <Typography variant="body1" sx={{ mb: 2 }}>
              Your Neighborhood: {neighborhood.properties.neighborhood}, {neighborhood.properties.city}
            </Typography>
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={searchType === 'distance' ? searchByDistance : searchByNeighborhood}
            disabled={!userPosition}
          >
            Search
          </Button>
        </Paper>

        {locations.length > 0 && (
          <Paper>
            <List>
              {locations.map((location) => (
                <ListItem key={location._id}>
                  <ListItemText
                    primary={location.name}
                    secondary={
                      <>
                        Category: {location.category} | 
                        Distance: {location.distance?.toFixed(2)}m
                        {(userRole === 'Admin' || userRole === 'Confidential') && 
                          ` | Restricted: ${location.restricted ? 'Yes' : 'No'}`
                        }
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default LocationsSearch; 