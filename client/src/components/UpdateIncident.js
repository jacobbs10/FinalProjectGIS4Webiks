import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import axios from 'axios';

const UpdateIncident = ({ show, onHide, incident }) => {
  const [formData, setFormData] = useState(null);
  const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    if (incident) {
      setFormData({
        id: incident.properties.id,
        category: incident.properties.category,
        sub_category: incident.properties.sub_category,
        loc_name: incident.properties.loc_name,
        address: incident.properties.address,
        description: incident.properties.description,
        restricted: incident.properties.restricted,
        email: incident.properties.email,
        phone: incident.properties.phone,
        site: incident.properties.site,
        loc_status: incident.properties.loc_status,
        photo: incident.properties.photo,
        incident_start_time: incident.properties.incident_start_time,
        incident_end_time: incident.properties.incident_end_time,
        qtrs_list: incident.properties.qtrs_list,
        coordinates: incident.geometry.coordinates,
        equipment: incident.properties.equipment,
        vehicles: incident.properties.vehicles,
        total_personal: incident.properties.total_personal,
        available_personal: incident.properties.available_personal,
        min_personal: incident.properties.min_personal
      });
    }
  }, [incident]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.put(`${BASE_URL}/api/emrgLocs/location`, formData, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        }
      });
      if (response.data) {
        onHide();
        window.location.reload(); // Refresh to show updated data
      }
    } catch (error) {
      console.error("Failed to update incident:", error);
      alert("Failed to update incident: " + error.message);
    }
  };

  if (!formData) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Update Incident</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>ID</Form.Label>
            <Form.Control type="text" value={formData.id} disabled />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={formData.loc_name}
              onChange={(e) => setFormData({...formData, loc_name: e.target.value})}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={formData.loc_status}
              onChange={(e) => setFormData({...formData, loc_status: e.target.value})}
            >
              <option value="Open">Open</option>
              <option value="InProgress">In Progress</option>
              <option value="Closed">Closed</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Address</Form.Label>
            <Form.Control
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Responders</Form.Label>
            <Form.Control
              type="number"
              value={formData.available_personal}
              onChange={(e) => setFormData({...formData, available_personal: parseInt(e.target.value)})}
              min={0}
            />
          </Form.Group>

          {formData.equipment && (
            <Form.Group className="mb-3">
              <Form.Label>Equipment</Form.Label>
              {formData.equipment.map((item, idx) => (
                <div key={idx} className="d-flex align-items-center mb-2">
                  <span className="me-2">{item.type}:</span>
                  <Form.Control
                    type="number"
                    value={item.qty}
                    onChange={(e) => {
                      const newEquipment = [...formData.equipment];
                      newEquipment[idx] = { ...item, qty: parseInt(e.target.value) };
                      setFormData({...formData, equipment: newEquipment});
                    }}
                    min={0}
                    style={{ width: '100px' }}
                  />
                </div>
              ))}
            </Form.Group>
          )}

          {formData.vehicles && (
            <Form.Group className="mb-3">
              <Form.Label>Vehicles</Form.Label>
              {formData.vehicles.map((vehicle, idx) => (
                <div key={idx} className="d-flex align-items-center mb-2">
                  <span className="me-2">{vehicle.type}:</span>
                  <Form.Control
                    type="number"
                    value={vehicle.qty}
                    onChange={(e) => {
                      const newVehicles = [...formData.vehicles];
                      newVehicles[idx] = { ...vehicle, qty: parseInt(e.target.value) };
                      setFormData({...formData, vehicles: newVehicles});
                    }}
                    min={0}
                    style={{ width: '100px' }}
                  />
                </div>
              ))}
            </Form.Group>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit}>Update Incident</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UpdateIncident;