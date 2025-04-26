import React, { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

const AutoGeneratorModal = ({ show, onHide, onStart }) => {
  const [settings, setSettings] = useState({
    types: ["Police", "Fire", "Medical", "ArmyRescue", "Combined"],
    interval: 30,
    duration: 60
  });

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Automatic Incident Generator</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Select Incident Types</Form.Label>
            {["Police", "Fire", "Medical", "ArmyRescue", "Combined"].map(type => (
              <Form.Check
                key={type}
                type="checkbox"
                label={type}
                checked={settings.types.includes(type)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSettings(prev => ({
                      ...prev,
                      types: [...prev.types, type]
                    }));
                  } else {
                    setSettings(prev => ({
                      ...prev,
                      types: prev.types.filter(t => t !== type)
                    }));
                  }
                }}
              />
            ))}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Interval (seconds)</Form.Label>
            <Form.Control
              type="number"
              value={settings.interval}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                interval: parseInt(e.target.value)
              }))}
              min={5}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Duration (seconds)</Form.Label>
            <Form.Control
              type="number"
              value={settings.duration}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                duration: parseInt(e.target.value)
              }))}
              min={10}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => onStart(settings)}
          disabled={settings.types.length === 0}
        >
          Start Generator
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AutoGeneratorModal;