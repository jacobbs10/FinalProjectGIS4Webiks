import React, { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { format } from 'date-fns';
import axios from 'axios';

const CreateIncidentModal = ({ show, onHide }) => {
  const [step, setStep] = useState(1);
  const [subCategory, setSubCategory] = useState('');
  const [incidentData, setIncidentData] = useState(null);
  const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

  const TEL_AVIV_POLYGON = [
    [34.79301, 32.14742],
    [34.85447, 32.12213],
    [34.85241, 32.10410],
    [34.80366, 32.08403],
    [34.82014, 32.04359],
    [34.73671, 32.02962],
    [34.79301, 32.14742]
  ];

  function isPointInPolygon(point, polygon) {
    const x = point[0], y = point[1];
    let inside = false;
  
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
  
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
  
    return inside;
  }
  
  function getBoundingBox(polygon) {
    const bounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };
  
    for (const point of polygon) {
      bounds.minX = Math.min(bounds.minX, point[0]);
      bounds.minY = Math.min(bounds.minY, point[1]);
      bounds.maxX = Math.max(bounds.maxX, point[0]);
      bounds.maxY = Math.max(bounds.maxY, point[1]);
    }
  
    return bounds;
  }
  
  // Also improve the generateRandomCoordinates function to ensure more realistic distribution
  const generateRandomCoordinates = () => {
    const bounds = getBoundingBox(TEL_AVIV_POLYGON);
    let point;
    
    // Keep generating points until we find one inside the polygon
    do {
      point = [
        Math.random() * (bounds.maxX - bounds.minX) + bounds.minX,
        Math.random() * (bounds.maxY - bounds.minY) + bounds.minY
      ];
    } while (!isPointInPolygon(point, TEL_AVIV_POLYGON));
    
    return point;
  };

  const getInitialData = (type) => {
    const now = new Date();
    const datePrefix = format(now, 'yyMMddHHmmss');
    const seqNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const id = `${datePrefix}${seqNum}`;

    const baseData = {
      id,
      category: "Incidents",
      sub_category: type,
      loc_name: `נקודה ${seqNum}`,
      address: `כתובת ${seqNum}`,
      description: "",
      restricted: true,
      email: null,
      phone: null,
      site: null,
      loc_status: "Open",
      photo: "Shelter.png",
      incident_start_time: now,
      incident_end_time: null,
      qtrs_list: [1, 2, 3],
      total_personal: 10,
      available_personal: 0,
      min_personal: 3,
      coordinates: generateRandomCoordinates()
    };

    switch(type) {
      case "Police":
        return {
          ...baseData,
          description: "קטטה",
          email: "police@example.com",
          phone: "03-5555100",
          site: "police.com",
          equipment: [
            { type: "gunPack", qty: 0, standard_qty: 10, min_qty: 3 },
            { type: "granadePack", qty: 0, standard_qty: 10, min_qty: 3 },
            { type: "medicalPack", qty: 0, standard_qty: 10, min_qty: 3 },
            { type: "rescuePack", qty: 0, standard_qty: 10, min_qty: 3 }
          ],
          vehicles: [
            { type: "PatrolCar", qty: 0, min_capasity: 1, standard_qty: 2, min_qty: 1 },
            { type: "PatrolMoto", qty: 0, min_capasity: 1, standard_qty: 1, min_qty: 0 }
          ]
        };
        case "Fire":
        return {
          ...baseData,
          description: "שריפה",
          email: "fire@example.com",
          phone: "03-5555102",
          site: "fire.com",
          equipment: [
          { type: "medicalPack", qty: 0, standard_qty: 3, min_qty: 1 },
          { type: "rescuePack", qty: 0, standard_qty: 3, min_qty: 1 }
          ],
          vehicles: [
          { type: "FireCommand", qty: 0, min_capasity: 5, standard_qty: 1, min_qty: 1 },
          { type: "FireBig", qty: 0, min_capasity: 5, standard_qty: 2, min_qty: 1 },
          { type: "RescueTruck", qty: 0, min_capasity: 5, standard_qty: 1, min_qty: 0 }
          ]
        };
        case "Medical":
        return {
          ...baseData,
          description: "פציעה",
          email: "medical@example.com",
          phone: "03-5555101",
          site: "medical.com",
          equipment: [
            { type: "medicalPack", qty: 0, standard_qty: 1, min_qty: 1 } 
          ],
          vehicles: [
            { type: "Ambulance", qty: 0, min_capasity: 2, standard_qty: 0, min_qty: 0 },
            { type: "Motobulance", qty: 0, min_capasity: 1, standard_qty: 1, min_qty: 1 }
          ]
        };
        case "ArmyRescue":
        return {
          ...baseData,
          description: "קריסת מבנה",
          email: "armyRescue@example.com",
          phone: "03-5555109",
          site: "armyRescue.com",
          equipment: [
            { type: "medicalPack", qty: 0, standard_qty: 1, min_qty: 1 },          
            { type: "rescuePack", qty: 0, standard_qty: 10, min_qty: 5 }
          ],
          vehicles: [
            { type: "RescueTruck", qty: 0, min_capasity: 5, standard_qty: 6, min_qty: 3 }
          ]
        };
        case "Combined":
        return {
          ...baseData,
          description: "נפילת טיל חות'י",
          email: "combined@example.com",
          phone: "03-5555666",
          site: "combined.com",
          equipment: [
            { type: "medicalPack", qty: 0, standard_qty: 30, min_qty: 10 },          
            { type: "rescuePack", qty: 0, standard_qty: 10, min_qty: 5 }
          ],
          vehicles: [
            { type: "PatrolCar", qty: 0, min_capasity: 1, standard_qty: 5, min_qty: 3 },
            { type: "PatrolMoto", qty: 0, min_capasity: 1, standard_qty: 4, min_qty: 2 },
            { type: "FireCommand", qty: 0, min_capasity: 5, standard_qty: 1, min_qty: 1 },
            { type: "FireBig", qty: 0, min_capasity: 5, standard_qty: 4, min_qty: 2 },
            { type: "RescueTruck", qty: 0, min_capasity: 5, standard_qty: 7, min_qty: 3 },
            { type: "Ambulance", qty: 0, min_capasity: 4, standard_qty: 7, min_qty: 5 },
            { type: "Motobulance", qty: 0, min_capasity: 4, standard_qty: 6, min_qty: 4}
          ]
        };      
    }
  };

  const handleSubmit = async () => {
    try {
      const token = sessionStorage.getItem("token");
      await axios.post(`${BASE_URL}/api/emrgLocs/location`, incidentData, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        }
      });
      onHide();
    } catch (error) {
      console.error("Failed to create incident:", error);
    }
  };

  const hasAssignedResources = (data) => {
    if (data.available_personal > 0) return true;
    if (data.equipment?.some(item => item.qty > 0)) return true;
    if (data.vehicles?.some(vehicle => vehicle.qty > 0)) return true;
    return false;
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Create New Incident</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {step === 1 ? (
          <Form>
            <Form.Group>
              <Form.Label>Select Incident Type</Form.Label>
              <Form.Select 
                value={subCategory} 
                onChange={(e) => setSubCategory(e.target.value)}
              >
                <option value="">Select Type</option>
                <option value="Police">Police</option>
                <option value="Fire">Fire</option>
                <option value="Medical">Medical</option>
                <option value="ArmyRescue">Army Rescue</option>
                <option value="Combined">Combined</option>
              </Form.Select>
            </Form.Group>
          </Form>
        ) : (
          <Form>
            {/* Render editable fields based on incidentData */}
          </Form>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        {step === 1 ? (
          <Button 
            variant="primary" 
            onClick={() => {
              setIncidentData(getInitialData(subCategory));
              setStep(2);
            }}
            disabled={!subCategory}
          >
            Next
          </Button>
        ) : (
          <Button variant="primary" onClick={handleSubmit}>
            Create Incident
          </Button>
        )}                
        {step === 2 && (
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={incidentData.loc_name}
                onChange={(e) => setIncidentData({
                  ...incidentData,
                  loc_name: e.target.value
                })}
              />
            </Form.Group>
        
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                type="text"
                value={incidentData.address}
                onChange={(e) => setIncidentData({
                  ...incidentData,
                  address: e.target.value
                })}
              />
            </Form.Group>
        
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                value={incidentData.description}
                onChange={(e) => setIncidentData({
                  ...incidentData,
                  description: e.target.value
                })}
              />
            </Form.Group>
        
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={incidentData.loc_status}
                onChange={(e) => setIncidentData({
                  ...incidentData,
                  loc_status: e.target.value
                })}
              >
                <option value="Open">Open</option>
                <option value="InProgress">In Progress</option>
                <option value="Closed">Closed</option>
              </Form.Select>
            </Form.Group>
        
            {incidentData.equipment && (
              <Form.Group className="mb-3">
                <Form.Label>Equipment</Form.Label>
                {incidentData.equipment.map((item, idx) => (
                  <div key={idx} className="d-flex align-items-center mb-2">
                    <span className="me-2">{item.type}:</span>
                    <Form.Control
                      type="number"
                      value={item.qty}
                      onChange={(e) => {
                        const newQty = parseInt(e.target.value);
                        const newEquipment = [...incidentData.equipment];
                        newEquipment[idx] = { ...item, qty: newQty };
                        const updatedData = {
                          ...incidentData,
                          equipment: newEquipment
                        };
                        
                        // Update status if resources are assigned
                        if (newQty > 0 && updatedData.loc_status === "Open") {
                          updatedData.loc_status = "InProgress";
                        } else if (!hasAssignedResources(updatedData)) {
                          updatedData.loc_status = "Open";
                        }
                        
                        setIncidentData(updatedData);
                      }}
                      min={0}
                      style={{ width: '100px' }}
                    />
                  </div>
                ))}
              </Form.Group>
            )}
        
            {incidentData.vehicles && (
              <Form.Group className="mb-3">
                <Form.Label>Vehicles</Form.Label>
                {incidentData.vehicles.map((vehicle, idx) => (
                  <div key={idx} className="d-flex align-items-center mb-2">
                    <span className="me-2">{vehicle.type}:</span>
                    <Form.Control
                      type="number"
                      value={vehicle.qty}
                      onChange={(e) => {
                        const newQty = parseInt(e.target.value);
                        const newVehicles = [...incidentData.vehicles];
                        newVehicles[idx] = { ...vehicle, qty: newQty };
                        const updatedData = {
                          ...incidentData,
                          vehicles: newVehicles
                        };
                        
                        // Update status if resources are assigned
                        if (newQty > 0 && updatedData.loc_status === "Open") {
                          updatedData.loc_status = "InProgress";
                        } else if (!hasAssignedResources(updatedData)) {
                          updatedData.loc_status = "Open";
                        }
                        
                        setIncidentData(updatedData);
                      }}
                      min={0}
                      style={{ width: '100px' }}
                    />
                  </div>
                ))}
              </Form.Group>
            )}
        
            <Form.Group className="mb-3">
              <Form.Label>Responders</Form.Label>
              <Form.Control
                type="number"
                value={incidentData.available_personal}
                onChange={(e) => {
                  const newPersonal = parseInt(e.target.value);
                  const updatedData = {
                    ...incidentData,
                    available_personal: newPersonal
                  };
                  
                  // Update status if resources are assigned
                  if (newPersonal > 0 && updatedData.loc_status === "Open") {
                    updatedData.loc_status = "InProgress";
                  } else if (!hasAssignedResources(updatedData)) {
                    updatedData.loc_status = "Open";
                  }
                  
                  setIncidentData(updatedData);
                }}
                min={0}
              />
            </Form.Group>
          </Form>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CreateIncidentModal;