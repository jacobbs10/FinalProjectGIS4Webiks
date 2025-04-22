import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import FixedHeader from '../components/FixedHeader';
import styles from '../css/MainStyles.module.css';

const LocationMembershipAdmin = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [pageLimit, setPageLimit] = useState(10);
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [editingLocation, setEditingLocation] = useState(null);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [suspensionPeriod, setSuspensionPeriod] = useState(30);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const token = sessionStorage.getItem('token');
  const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    const raw = sessionStorage.getItem('user');
    if (!raw) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(raw);
    if (user.role !== 'Admin') {
      alert('Access denied. Admins only.');
      navigate('/login');
      return;
    }

    setAuthorized(true);
    fetchLocations();
  }, [navigate]);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${BASE_URL}/api/locs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setLocations(response.data.locations || []);
      setFilteredLocations(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError('Failed to fetch locations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      setFilteredLocations(locations);
      return;
    }

    const filtered = locations.filter(location =>
      location.properties.loc_name.toLowerCase().includes(keyword) ||
      location.properties.category.toLowerCase().includes(keyword)
    );
    setFilteredLocations(filtered);
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilteredLocations(locations);
  };

  const handleEditToggle = (e, location) => {
    e.preventDefault();
    if (editingLocation?.properties.id === location.properties.id) {
        // Save changes when unchecking
        handleLocationUpdate(editingLocation);
        setEditingLocation(null);
    } else {
        // Start editing when checking
        setEditingLocation({
            type: 'Feature',
            properties: {
                id: location.properties.id,
                category: location.properties.category || 'Restaurants',
                loc_name: location.properties.loc_name || '',
                address: location.properties.address || '',
                description: location.properties.description || '',
                confidential: location.properties.confidential || false,
                email: location.properties.email || '',
                phone: location.properties.phone || '',
                Site: location.properties.Site || '',
                loc_status: location.properties.loc_status || 'Active',
                photo: location.properties.photo || ''
            },
            geometry: {
                type: 'Point',
                coordinates: location.geometry.coordinates || [0, 0]
            }
        });
    }
  };

  const handleFieldChange = (field, value) => {
    if (!editingLocation) return;
    
    setEditingLocation(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [field]: value
      }
    }));
  };

  const handleLocationUpdate = async (location) => {
    try {
        const locationData = {
            id: location.properties.id,
            category: location.properties.category,
            loc_name: location.properties.loc_name,
            address: location.properties.address,
            description: location.properties.description,
            confidential: location.properties.confidential,
            email: location.properties.email,
            phone: location.properties.phone,
            Site: location.properties.Site,
            loc_status: location.properties.loc_status,
            photo: location.properties.photo,
            coordinates: location.geometry.coordinates
        };

        console.log('Updating location with data:', locationData);

        const response = await fetch(`${BASE_URL}/api/locs/location`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(locationData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText);
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.message || 'Failed to update location');
            } catch (e) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
        }

        const updatedLocation = await response.json();
        console.log('Location updated successfully:', updatedLocation);
        
        // Update both locations and filteredLocations states
        const updatedLocations = locations.map(loc => 
            loc.properties.id === updatedLocation.properties.id ? updatedLocation : loc
        );
        setLocations(updatedLocations);
        
        // Update filteredLocations if the current search term matches the updated location
        if (searchTerm) {
            const keyword = searchTerm.trim().toLowerCase();
            const filtered = updatedLocations.filter(loc =>
                loc.properties.loc_name.toLowerCase().includes(keyword) ||
                loc.properties.category.toLowerCase().includes(keyword)
            );
            setFilteredLocations(filtered);
        } else {
            setFilteredLocations(updatedLocations);
        }

        setIsSuspendDialogOpen(false);
        setEditingLocation(null);
        setSuccess('Location updated successfully');
    } catch (error) {
        console.error('Error updating location:', error);
        setError(error.message);
    }
  };

  const handleNewLocation = () => {
    if (!locations || locations.length === 0) {
      setError('Cannot create new location: locations not loaded');
      return;
    }

    const newLocation = {
      type: 'Feature',
      properties: {
        id: Math.max(...locations.map(l => l.properties.id), 0) + 1,
        category: 'Restaurants',
        loc_name: '',
        address: '',
        description: '',
        confidential: false,
        email: '',
        phone: '',
        Site: '',
        loc_status: 'Active',
        photo: ''
      },
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      }
    };
    setEditingLocation(newLocation);
  };

  const handleSuspend = async () => {
    try {
      const response = await axios.put(
        `${BASE_URL}/api/locs/${editingLocation.properties.id}/suspend`,
        { days: suspensionPeriod },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.status === 200) {
        setSuccess(`Location suspended for ${suspensionPeriod} days`);
        fetchLocations();
        setIsSuspendDialogOpen(false);
      }
    } catch (error) {
      console.error('Error suspending location:', error);
      setError('Failed to suspend location');
    }
  };

  const handleCancelMembership = async (locationId) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/api/locs/${locationId}/cancel-membership`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.status === 200) {
        setSuccess('Location membership cancelled');
        fetchLocations();
      }
    } catch (error) {
      console.error('Error cancelling membership:', error);
      setError('Failed to cancel membership');
    }
  };

  if (!authorized) {
    return null;
  }

  if (isLoading) {
    return <div>Loading locations...</div>;
  }

  return (
    <div>
      <FixedHeader title="Location Membership Management" />
      <div className={styles.adminPanel}>
        <h2>Manage Location Memberships</h2>

        <div className={styles.toolbar}>
          <button onClick={handleNewLocation} className={styles.addButton}>
            New Location
          </button>
          <input
            type="text"
            placeholder="Search locations"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={handleSearch} disabled={searchTerm.trim() === ''}>
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
        </div>

        {error && (
          <div className={styles.error}>{error}</div>
        )}
        {success && (
          <div className={styles.success}>{success}</div>
        )}

        <div className={styles.tableWrapper}>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Edit</th>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Address</th>
                <th>Description</th>
                <th>Confidential</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Website</th>
                <th>Status</th>
                <th>Photo</th>
                <th>Coordinates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocations.map((location) => (
                <tr key={location.properties.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={editingLocation?.properties.id === location.properties.id}
                      onChange={(e) => handleEditToggle(e, location)}
                    />
                  </td>
                  <td>{location.properties.id}</td>
                  <td>
                    {editingLocation?.properties.id === location.properties.id ? (
                      <input
                        type="text"
                        value={editingLocation.properties.loc_name || ''}
                        onChange={(e) => handleFieldChange('loc_name', e.target.value)}
                      />
                    ) : (
                      location.properties.loc_name || '-'
                    )}
                  </td>
                  <td>
                    {editingLocation?.properties.id === location.properties.id ? (
                      <select
                        value={editingLocation.properties.category}
                        onChange={(e) => handleFieldChange('category', e.target.value)}
                      >
                        <option value="Restaurants">Restaurants</option>
                        <option value="Parks">Parks</option>
                        <option value="Museums">Museums</option>
                        <option value="Shops">Shops</option>
                        <option value="Others">Others</option>
                      </select>
                    ) : (
                      location.properties.category
                    )}
                  </td>
                  <td>
                    {editingLocation?.properties.id === location.properties.id ? (
                      <input
                        type="text"
                        value={editingLocation.properties.address || ''}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                      />
                    ) : (
                      location.properties.address || '-'
                    )}
                  </td>
                  <td>
                    {editingLocation?.properties.id === location.properties.id ? (
                      <textarea
                        value={editingLocation.properties.description || ''}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                      />
                    ) : (
                      location.properties.description || '-'
                    )}
                  </td>
                  <td>
                    {editingLocation?.properties.id === location.properties.id ? (
                      <input
                        type="checkbox"
                        checked={editingLocation.properties.confidential}
                        onChange={(e) => handleFieldChange('confidential', e.target.checked)}
                      />
                    ) : (
                      location.properties.confidential ? 'Yes' : 'No'
                    )}
                  </td>
                  <td>
                    {editingLocation?.properties.id === location.properties.id ? (
                      <input
                        type="email"
                        value={editingLocation.properties.email || ''}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                      />
                    ) : (
                      location.properties.email || '-'
                    )}
                  </td>
                  <td>
                    {editingLocation?.properties.id === location.properties.id ? (
                      <input
                        type="text"
                        value={editingLocation.properties.phone || ''}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                      />
                    ) : (
                      location.properties.phone || '-'
                    )}
                  </td>
                  <td>
                    {editingLocation?.properties.id === location.properties.id ? (
                      <input
                        type="text"
                        value={editingLocation.properties.Site || ''}
                        onChange={(e) => handleFieldChange('Site', e.target.value)}
                      />
                    ) : (
                      location.properties.Site || '-'
                    )}
                  </td>
                  <td>
                    {editingLocation?.properties.id === location.properties.id ? (
                      <select
                        value={editingLocation.properties.loc_status}
                        onChange={(e) => handleFieldChange('loc_status', e.target.value)}
                      >
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Removed">Removed</option>
                      </select>
                    ) : (
                      location.properties.loc_status
                    )}
                  </td>
                  <td>
                    {editingLocation?.properties.id === location.properties.id ? (
                      <input
                        type="text"
                        value={editingLocation.properties.photo || ''}
                        onChange={(e) => handleFieldChange('photo', e.target.value)}
                      />
                    ) : (
                      location.properties.photo ? (
                        <a href={location.properties.photo} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      ) : '-'
                    )}
                  </td>
                  <td>
                    {editingLocation?.properties.id === location.properties.id ? (
                      <div>
                        <input
                          type="number"
                          value={editingLocation.geometry.coordinates[0]}
                          onChange={(e) => setEditingLocation(prev => ({
                            ...prev,
                            geometry: {
                              ...prev.geometry,
                              coordinates: [parseFloat(e.target.value), prev.geometry.coordinates[1]]
                            }
                          }))}
                          placeholder="Longitude"
                        />
                        <input
                          type="number"
                          value={editingLocation.geometry.coordinates[1]}
                          onChange={(e) => setEditingLocation(prev => ({
                            ...prev,
                            geometry: {
                              ...prev.geometry,
                              coordinates: [prev.geometry.coordinates[0], parseFloat(e.target.value)]
                            }
                          }))}
                          placeholder="Latitude"
                        />
                      </div>
                    ) : (
                      `${location.geometry.coordinates[0].toFixed(6)}, ${location.geometry.coordinates[1].toFixed(6)}`
                    )}
                  </td>
                  <td>
                    <button onClick={() => handleCancelMembership(location.properties.id)}>
                      Cancel Membership
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Suspend Dialog */}
        {isSuspendDialogOpen && (
          <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
              <h3>Suspend Location</h3>
              <div className={styles.formGroup}>
                <label>Suspension Period (days):</label>
                <select
                  value={suspensionPeriod}
                  onChange={(e) => setSuspensionPeriod(Number(e.target.value))}
                >
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
              <div className={styles.dialogActions}>
                <button onClick={() => setIsSuspendDialogOpen(false)}>Cancel</button>
                <button onClick={handleSuspend}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationMembershipAdmin; 