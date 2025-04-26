import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import PropTypes from 'prop-types';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import axios from 'axios';

function DrawControl({ onAreaSelect, onClearSelection }) {
    const map = useMap();
    const drawControlRef = useRef(null);
    const drawnItemsRef = useRef(new L.FeatureGroup());
    const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";
  
    useEffect(() => {
        const drawnItems = drawnItemsRef.current;
        map.addLayer(drawnItems);
  
        const drawControl = new L.Control.Draw({
          draw: {
            marker: false,
            circle: false,
            circlemarker: false,
            rectangle: true,
            polyline: false,
            polygon: {
              allowIntersection: false,
              drawError: {
                color: '#e1e100',
                message: '<strong>Error:</strong> Shape edges cannot cross!'
              },
              shapeOptions: {
                color: '#97009c'
              }
            }
          },
          edit: {
            featureGroup: drawnItems, // Use the feature group for editing
            remove: true,
            edit: true
          }
        });
  
        map.addControl(drawControl);
        drawControlRef.current = drawControl;
  
        // Handle created shapes
        map.on(L.Draw.Event.CREATED, async (event) => {
          const layer = event.layer;
          drawnItemsRef.current.clearLayers(); // Clear existing layers
          drawnItemsRef.current.addLayer(layer); // Add new layer
          await fetchIncidentsInArea(layer);
        });
  
        // Handle edited shapes
        map.on(L.Draw.Event.EDITED, async (event) => {
          const layers = event.layers;
          onAreaSelect([]); // Clear previous results
          layers.eachLayer(async (layer) => {
            await fetchIncidentsInArea(layer);
          });
        });
  
        // Handle deleted shapes
        map.on(L.Draw.Event.DELETED, () => {
          drawnItemsRef.current.clearLayers();
          if (onAreaSelect) onAreaSelect([]);
          if (onClearSelection) onClearSelection();
          });
        
          // Update the edit start handler
          map.on(L.Draw.Event.EDITSTART, () => {
          if (onAreaSelect) onAreaSelect([]);
          if (onClearSelection) onClearSelection();
        });
      
  
        // Handle editing stop
        map.on(L.Draw.Event.EDITSTOP, async () => {
          const layers = drawnItemsRef.current.getLayers();
          if (layers.length > 0) {
            await fetchIncidentsInArea(layers[0]);
          }
        });
  
      async function fetchIncidentsInArea(layer) {
        let coordinates;
        if (layer instanceof L.Polygon) {
          coordinates = layer.getLatLngs()[0].map(latLng => [latLng.lng, latLng.lat]);
          coordinates.push(coordinates[0]); // Close the polygon
        } else if (layer instanceof L.Rectangle) {
          const bounds = layer.getBounds();
          const northEast = bounds.getNorthEast();
          const southWest = bounds.getSouthWest();
          coordinates = [
            [southWest.lng, southWest.lat],
            [northEast.lng, southWest.lat],
            [northEast.lng, northEast.lat],
            [southWest.lng, northEast.lat],
            [southWest.lng, southWest.lat]
          ];
        }
  
        if (coordinates) {
          try {
            const token = sessionStorage.getItem("token");
            const response = await axios.post(
              `${BASE_URL}/api/emrgLocs/area`,
              {
                coordinates: [coordinates],
                categories: ["Incidents"]
              },
              {
                headers: {
                  Authorization: token,
                  "Content-Type": "application/json"
                }
              }
            );
  
            if (response.data && response.data.locations) {
              layer.setStyle({ color: '#4CAF50', fillColor: '#4CAF50', fillOpacity: 0.2 });
              onAreaSelect(response.data.locations);
            }
          } catch (error) {
            layer.setStyle({ color: '#f44336', fillColor: '#f44336', fillOpacity: 0.2 });
            console.error("Error fetching locations in area:", error);
          }
        }
      }
  
      return () => {
        map.removeControl(drawControlRef.current);
        map.removeLayer(drawnItemsRef.current);
        map.off(L.Draw.Event.CREATED);
        map.off(L.Draw.Event.EDITED);
        map.off(L.Draw.Event.DELETED);
        map.off(L.Draw.Event.EDITSTART);
        map.off(L.Draw.Event.EDITSTOP);
      };
    }, [map, onAreaSelect, onClearSelection]);

    return null;
}

DrawControl.propTypes = {
    onAreaSelect: PropTypes.func.isRequired,
    onClearSelection: PropTypes.func.isRequired
};

export default DrawControl;