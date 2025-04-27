import axios from "axios";

// Required attributes for hood validation
const REQUIRED_ATTRIBUTES = [
    'id',
    'city',
    'neighborhood',
    'coordinates'
];

// Validate a single hood object
const validatehoodObject = (hood) => {
    const errors = [];
    
    // Check all required attributes exist and are correctly named
    REQUIRED_ATTRIBUTES.forEach(attr => {
        if (!hood.hasOwnProperty(attr)) {
            errors.push(`Missing or incorrectly named attribute: ${attr}`);
        }
    });

    // Check for extra attributes
    Object.keys(hood).forEach(key => {
        if (!REQUIRED_ATTRIBUTES.includes(key)) {
            errors.push(`Unknown attribute: ${key}`);
        }
    });

    // Validate data types
    if (typeof hood.id !== 'number') {
        errors.push('id must be a number');
    }
    if (typeof hood.city !== 'string') {
        errors.push('city must be a string');
    }
    if (typeof hood.neighborhood !== 'string') {
        errors.push('neighborhood must be a string');
    }    
    if (!Array.isArray(hood.coordinates)) {
        errors.push('coordinates must be an array');
    } else {
        hood.coordinates.forEach((pair, index) => {
            if (!Array.isArray(pair) || pair.length !== 2) {
                errors.push(`coordinates[${index}] must be an array of two numbers`);
            } else {
                if (typeof pair[0] !== 'number' || typeof pair[1] !== 'number') {
                    errors.push(`coordinates[${index}] must contain two numbers`);
                }
            }
        });
    }
    if (Array.isArray(hood.coordinates) && hood.coordinates.length > 1) {
        const first = hood.coordinates[0];
        const last = hood.coordinates[hood.coordinates.length - 1];
        if (JSON.stringify(first) !== JSON.stringify(last)) {
            errors.push('coordinates must form a closed polygon (first and last points must be identical)');
        }
    }
    hood.coordinates.forEach((pair, index) => {
        if (!Array.isArray(pair) || pair.length !== 2) {
            errors.push(`coordinates[${index}] must be an array of two numbers`);
        } else {
            if (typeof pair[0] !== 'number' || typeof pair[1] !== 'number') {
                errors.push(`coordinates[${index}] must contain two numbers`);
            }
        }
    });


    return errors;
};

// Main function to process bulk hood insertion
export const processBulkHoods = async (fileContent) => {
    try {
        let hoods;
        
        try {
            hoods = JSON.parse(fileContent);
        } catch (error) {
            throw new Error('Invalid JSON format in file');
        }

        // Validate it's an array
        if (!Array.isArray(hoods)) {
            throw new Error('File content must be an array of hoods');
        }

        // Validate each hood object
        const validationErrors = [];
        hoods.forEach((hood, index) => {
            const hoodErrors = validatehoodObject(hood);
            if (hoodErrors.length > 0) {
                validationErrors.push({
                    index,
                    hood,
                    errors: hoodErrors
                });
            }
        });

        // If there are validation errors, return them
        if (validationErrors.length > 0) {
            return {
                success: false,
                errors: validationErrors
            };
        }

        // Get token from session storage
        const token = sessionStorage.getItem("token");
        console.log("Token in bulkhoods:", token); // Debug log
        if (!token) {
            throw new Error('No authentication token found');
        }

        const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

        // Send to server
        const response = await axios.post(`${BASE_URL}/api/hood/bulk`, hoods, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${token}`,
            },
        });
        
        // Return the result
        return {
            success: true,
            data: response.data, 
        };
        
        } catch (error) {
            // Handle Axios errors
            return {
                success: false,
                error: error.response
                    ? `Server responded with status: ${error.response.status}. ${error.response.data}`
                    : error.message, // Handle network or other errors
            };
        }
};