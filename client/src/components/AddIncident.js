import React, { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

const AddIncident = ({ show, onHide, onAdd }) => {
  const [formData, setFormData] = useState({
    loc_name: '',
    address: '',
    description: '',
    category: 'Incidents',
    sub_category: 'Police',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Add New Incident</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={formData.loc_name}
              onChange={(e) => setFormData({...formData, loc_name: e.target.value})}
              required
            />
          </Form.Group>
          {/* Add other form fields */}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" type="submit">Add Incident</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddIncident;