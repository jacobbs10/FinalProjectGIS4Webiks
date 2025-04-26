import React, { useState, useEffect } from "react";
import axios from "axios";

const QtrsComp = ({ qtrs, setQtrs }) => {
    const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";
  
    useEffect(() => {
      fetchNeighborhoods();
    }, []);
  
    const fetchNeighborhoods = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await axios.get(`${BASE_URL}/api/hood/neighborhoods`, {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json",
          },
        });
        
        // Transform the data to match GeoJSON format
       /* const transformedQtrs = res.data.neighborhoods.map(qtr => ({
          type: 'Feature',
          properties: {
            category: 'Qtrs',
            neighborhood: qtr.properties.neighborhood
          },
          geometry: {
            type: 'Polygon',
            coordinates: qtr.geometry.coordinates // Keep the existing structure since it matches [[[Number]]]
          }
        }));*/
        
        //setQtrs(transformedQtrs);
        setQtrs(res.data.neighborhoods);
      } catch (err) {
        console.error("Failed to fetch neighborhoods:", err);
      }
    };
  
    return null;
};

export default QtrsComp;