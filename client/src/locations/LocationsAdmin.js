import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import api from '../utils/axios';

const LocationsAdmin = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    message: '',
    onConfirm: null,
  });

  // State for file upload
  const [fileUploadError, setFileUploadError] = useState('');

  useEffect(() => {
    // Check if user is admin
    const checkAdminAccess = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const response = await api.get('/api/auth/verify-admin');
        if (!response.data) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/login');
      }
    };

    checkAdminAccess();
    fetchLocations();
  }, [navigate]);

  const fetchLocations = async () => {
    try {
      const response = await api.get('/api/locations');
      setLocations(response.data);
      setFilteredLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  // Filter and sort functions
  useEffect(() => {
    let filtered = [...locations];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(location =>
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    setFilteredLocations(filtered);
  }, [locations, searchTerm, sortField, sortDirection]);

  const handleLocationUpdate = async (locationData) => {
    const originalPosition = selectedLocation.location.coordinates;
    const newPosition = locationData.location.coordinates;
    
    // Check if position has changed
    if (originalPosition[0] !== newPosition[0] || originalPosition[1] !== newPosition[1]) {
      setConfirmationDialog({
        open: true,
        message: 'The location position has changed. Are you sure you want to update?',
        onConfirm: async () => {
          await updateLocation(locationData);
          setConfirmationDialog({ open: false, message: '', onConfirm: null });
        },
      });
    } else {
      await updateLocation(locationData);
    }
  };

  const updateLocation = async (locationData) => {
    try {
      const response = await api.put(`/api/locations/${locationData._id}`, locationData);
      if (response.status === 200) {
        fetchLocations();
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleDelete = async (locationId) => {
    setConfirmationDialog({
      open: true,
      message: 'Are you sure you want to delete this location?',
      onConfirm: async () => {
        try {
          await api.delete(`/api/locations/${locationId}`);
          fetchLocations();
        } catch (error) {
          console.error('Error deleting location:', error);
        }
        setConfirmationDialog({ open: false, message: '', onConfirm: null });
      },
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/locations/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status !== 200) {
        throw new Error('Upload failed');
      }

      fetchLocations();
      setFileUploadError('');
    } catch (error) {
      setFileUploadError('Error uploading file. Please try again.');
      console.error('Upload error:', error);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Locations Management
        </Typography>

        {/* Search and Filter Controls */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            label="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              label="Sort By"
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="category">Category</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            component="label"
          >
            Upload File
            <input
              type="file"
              hidden
              accept=".csv,.json"
              onChange={handleFileUpload}
            />
          </Button>
        </Box>

        {fileUploadError && (
          <Alert severity="error" sx={{ mb: 2 }}>{fileUploadError}</Alert>
        )}

        {/* Locations Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Restricted</TableCell>
                <TableCell>Coordinates</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLocations.map((location) => (
                <TableRow key={location._id}>
                  <TableCell>{location.name}</TableCell>
                  <TableCell>{location.category}</TableCell>
                  <TableCell>{location.suspended ? 'Suspended' : 'Active'}</TableCell>
                  <TableCell>{location.restricted ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    {`${location.location.coordinates[0]}, ${location.location.coordinates[1]}`}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedLocation(location);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDelete(location._id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)}>
          <DialogTitle>Edit Location</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              label="Name"
              value={selectedLocation?.name || ''}
              onChange={(e) => setSelectedLocation({
                ...selectedLocation,
                name: e.target.value
              })}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedLocation?.category || ''}
                onChange={(e) => setSelectedLocation({
                  ...selectedLocation,
                  category: e.target.value
                })}
              >
                <MenuItem value="SafeZone">Safe Zone</MenuItem>
                <MenuItem value="Restroom">Restroom</MenuItem>
                <MenuItem value="Restaurant">Restaurant</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={selectedLocation?.restricted || false}
                  onChange={(e) => setSelectedLocation({
                    ...selectedLocation,
                    restricted: e.target.checked
                  })}
                />
              }
              label="Restricted Access"
            />
            <TextField
              fullWidth
              margin="dense"
              label="Latitude"
              value={selectedLocation?.location.coordinates[0] || ''}
              onChange={(e) => setSelectedLocation({
                ...selectedLocation,
                location: {
                  ...selectedLocation.location,
                  coordinates: [Number(e.target.value), selectedLocation.location.coordinates[1]]
                }
              })}
            />
            <TextField
              fullWidth
              margin="dense"
              label="Longitude"
              value={selectedLocation?.location.coordinates[1] || ''}
              onChange={(e) => setSelectedLocation({
                ...selectedLocation,
                location: {
                  ...selectedLocation.location,
                  coordinates: [selectedLocation.location.coordinates[0], Number(e.target.value)]
                }
              })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleLocationUpdate(selectedLocation)}>Save</Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmationDialog.open}
          onClose={() => setConfirmationDialog({ open: false, message: '', onConfirm: null })}
        >
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogContent>
            <Typography>{confirmationDialog.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmationDialog({ open: false, message: '', onConfirm: null })}>
              Cancel
            </Button>
            <Button onClick={confirmationDialog.onConfirm} color="primary">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default LocationsAdmin; 