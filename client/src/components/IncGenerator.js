import axios from 'axios';
import { format } from 'date-fns';

const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

export const startGenerator = async (settings) => {
  let currentIndex = 0;
  let generatedCount = 0;
  const startTime = Date.now();
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
  
    const generateIncident = (type) => {
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

  const generateInterval = setInterval(async () => {
    if (!sessionStorage.getItem("GenerateInc") || 
        Date.now() - startTime >= settings.duration * 1000) {
      clearInterval(generateInterval);
      sessionStorage.removeItem("GenerateInc");
      return;
    }

    try {
      const type = settings.types[currentIndex % settings.types.length];
      currentIndex++;
     
      const incident = generateIncident(type);

      const token = sessionStorage.getItem("token");
      const response = await axios.post(`${BASE_URL}/api/emrgLocs/location`, incident, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        }
      });

      // Trigger notification
      if (response.data) {
        // Trigger notification with verified data
        window.dispatchEvent(new CustomEvent('newIncident', { 
          detail: incident 
        }));
      }

    } catch (error) {
      console.error("Failed to generate incident:", error);
    }
  }, settings.interval * 1000);
};