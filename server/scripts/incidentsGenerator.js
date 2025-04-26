const fs = require('fs');

const TEL_AVIV_POLYGON = [
  [34.79301, 32.14742],
  [34.85447, 32.12213],
  [34.85241, 32.10410],
  [34.80366, 32.08403],
  [34.82014, 32.04359],
  [34.73671, 32.02962],
  [34.79301, 32.14742]
];

// Get command line arguments
const args = process.argv.slice(2);

// Validate command line arguments
if (args.length !== 2) {
  console.log('Usage: node incidentsGenerator.js <number_of_incidents> <type>');
  console.log('Types: P (Police), F (Fire), M (Medical), A (ArmyRescue), C (Combined)');
  process.exit(1);
}

const numOfIncidents = parseInt(args[0]);
const type = args[1].toUpperCase();

// Validate number of incidents
if (isNaN(numOfIncidents) || numOfIncidents < 1) {
  console.log('Error: Number of incidents must be a positive number');
  process.exit(1);
}

// Validate incident type
const validTypes = ['P', 'F', 'M', 'A', 'C'];
if (!validTypes.includes(type)) {
  console.log('Error: Invalid incident type. Must be one of: P, F, M, A, C');
  process.exit(1);
}

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

const transformData = (numOfIncidents, type) => {
  const transformedData = [];

  const now = new Date();
  const datePrefix = now.toLocaleString('en-GB', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/[^\d]/g, ''); // Remove non-digits

  for (let i = 0; i < numOfIncidents; i++) {
    // Create padded sequence number (00000-99999)
    const seqNum = i.toString().padStart(5, '0');
    
    // Combine date prefix and sequence number
    const id = `${datePrefix}${seqNum}`;
    let transformedItem = {
      id: id,
      category: "Incidents",
      sub_category: "",
      loc_name: `נקודה ${i}`,
      address: `כתובת ${i}`,
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
      equipment: [],
      vehicles: [],
      total_personal: 10,
      available_personal: 7,
      min_personal: 3,
      coordinates: generateRandomCoordinates()
    };

    // Police Incident
    if (type === "P") {
      transformedItem = {
        ...transformedItem,
        sub_category: "Police",
        description: "קטטה",
        email: "police@example.com",
        phone: "03-5555100",
        site: "police.com",
        equipment: [
          { type: "gunPack", qty: 7, standard_qty: 10, min_qty: 3 },
          { type: "granadePack", qty: 7, standard_qty: 10, min_qty: 3 },
          { type: "medicalPack", qty: 7, standard_qty: 10, min_qty: 3 },
          { type: "rescuePack", qty: 7, standard_qty: 10, min_qty: 3 }
        ],
        vehicles: [
          { type: "PatrolCar", qty: 2, min_capasity: 1, standard_qty: 2, min_qty: 1 },
          { type: "PatrolMoto", qty: 1, min_capasity: 1, standard_qty: 1, min_qty: 0 }
        ]
      };
    }
    // Fire Incident
    else if (type === "F") {
      transformedItem = {
        ...transformedItem,
        sub_category: "Fire",
        description: "שריפה",
        email: "fire@example.com",
        phone: "03-5555102",
        site: "fire.com",
        equipment: [
          { type: "medicalPack", qty: 1, standard_qty: 3, min_qty: 1 },
          { type: "rescuePack", qty: 1, standard_qty: 3, min_qty: 1 }
        ],
        vehicles: [
          { type: "FireCommand", qty: 1, min_capasity: 5, standard_qty: 1, min_qty: 1 },
          { type: "FireBig", qty: 2, min_capasity: 5, standard_qty: 2, min_qty: 1 },
          { type: "RescueTruck", qty: 1, min_capasity: 5, standard_qty: 1, min_qty: 0 }
        ]
      };
    }
    // Medical Incident
    else if (type === "M") {
      transformedItem = {
        ...transformedItem,
        sub_category: "Medical",
        description: "פציעה",
        email: "medical@example.com",
        phone: "03-5555101",
        site: "medical.com",
        equipment: [
          { type: "medicalPack", qty: 1, standard_qty: 1, min_qty: 1 } 
        ],
        vehicles: [
          { type: "Ambulance", qty: 1, min_capasity: 2, standard_qty: 0, min_qty: 0 },
          { type: "Motobulance", qty: 0, min_capasity: 1, standard_qty: 1, min_qty: 1 }
        ]
      };
    }
    // ArmyRescue Incident
    else if (type === "A") {
      transformedItem = {
        ...transformedItem,
        sub_category: "ArmyRescue",
        description: "קריסת מבנה",
        email: "armyRescue@example.com",
        phone: "03-5555109",
        site: "armyRescue.com",
        equipment: [
          { type: "medicalPack", qty: 1, standard_qty: 1, min_qty: 1 },          
          { type: "rescuePack", qty: 4, standard_qty: 10, min_qty: 5 }
        ],
        vehicles: [
          { type: "RescueTruck", qty: 4, min_capasity: 5, standard_qty: 6, min_qty: 3 }
        ]
      };
    }
    // Combined Incident
    else if (type === "C") {
      transformedItem = {
        ...transformedItem,
        sub_category: "Combined",
        description: "נפילת טיל חות'י",
        email: "combined@example.com",
        phone: "03-5555666",
        site: "combined.com",
        equipment: [
          { type: "medicalPack", qty: 20, standard_qty: 30, min_qty: 10 },          
          { type: "rescuePack", qty: 4, standard_qty: 10, min_qty: 5 }
        ],
        vehicles: [
          { type: "PatrolCar", qty: 3, min_capasity: 1, standard_qty: 5, min_qty: 3 },
          { type: "PatrolMoto", qty: 2, min_capasity: 1, standard_qty: 4, min_qty: 2 },
          { type: "FireCommand", qty: 1, min_capasity: 5, standard_qty: 1, min_qty: 1 },
          { type: "FireBig", qty: 3, min_capasity: 5, standard_qty: 4, min_qty: 2 },
          { type: "RescueTruck", qty: 2, min_capasity: 5, standard_qty: 7, min_qty: 3 },
          { type: "Ambulance", qty: 1, min_capasity: 4, standard_qty: 7, min_qty: 5 },
          { type: "Motobulance", qty: 0, min_capasity: 4, standard_qty: 6, min_qty: 4}
        ]
      };
    }

    if (transformedItem.id !== null) {
      transformedData.push(transformedItem);
    }
  };

  return transformedData;
};


// Generate the data
const transformedData = transformData(numOfIncidents, type);

// Write to file
fs.writeFileSync(
  `transformedIncidents_${type}.json`,
  JSON.stringify(transformedData, null, 2),
  'utf8'
);

console.log('Transformation complete! Check transformedIncidents.json');