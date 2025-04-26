import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Modal,
  Box,
  Typography,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TablePagination,
} from "@mui/material";

const ResourcesDashboard = ({ show, onHide }) => {
  const [resources, setResources] = useState([]);
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const categories = resources && Array.isArray(resources) 
    ? [...new Set(resources.map(r => r.properties?.category).filter(Boolean))]
    : [];
  const subCategories = resources && Array.isArray(resources)
    ? [...new Set(resources.map(r => r.properties?.sub_category).filter(Boolean))]
    : [];

  const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

  // Fetch resources from API
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const token = sessionStorage.getItem("token");
        if (!token) {
          setError("No token found");
          setLoading(false);
          return;
        }
  
        const response = await axios.get(`${BASE_URL}/api/emrgLocs`, {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json"
          }
        });
        console.log("Response data:", response.data); // Debugging line

        // Ensure we're setting an array
        if (response.data.locations && Array.isArray(response.data.locations)) {
          setResources(response.data.locations);
        } else {
          setError("Invalid data format received");
          console.error("Invalid data format:", response.data.locations);
        }
      } catch (err) {
        setError(err.message);
        console.error("Failed to fetch locations:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResources();
  }, [BASE_URL]);

  // Filter resources by category and sub-category
  const filteredResources = resources && Array.isArray(resources)
    ? resources.filter(
        (resource) =>
          resource.properties &&
          (!category || resource.properties.category === category) &&
          (!subCategory || resource.properties.sub_category === subCategory)
      )
    : [];

  // Determine status color
  const getStatusColor = (level, min) => {
    if (level <= min) return "red";
    if (level > min && level <= min + 2) return "orange";
    return "green";
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => setRowsPerPage(parseInt(event.target.value, 10));

  const paginatedResources = filteredResources.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Modal 
      open={show}  // Use the show prop instead of hardcoding true
      onClose={onHide}  // Use onHide for closing
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80%",
          maxHeight: "90vh", // Add maximum height
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          display: "flex",
          flexDirection: "column", // Add flex layout
        }}
      >
        <Typography variant="h6" component="h2" gutterBottom>
          Resources Dashboard
        </Typography>

        {/* Filters */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <TextField
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Sub-Category"
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
            fullWidth
          >
            <MenuItem value="">All Sub-Categories</MenuItem>
            {subCategories.map(subCat => (
              <MenuItem key={subCat} value={subCat}>{subCat}</MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Resources Table */}
        <Box sx={{ flexGrow: 1, overflow: "auto" }}> {/* Add this wrapper */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Responders</TableCell>
                  <TableCell>Equipment</TableCell>
                  <TableCell>Vehicles</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {paginatedResources.map((resource, idx) => (
                <TableRow key={idx}>
                  <TableCell>{resource.properties.loc_name}</TableCell>
                  <TableCell>{resource.properties.category}</TableCell>
                  <TableCell>{resource.properties.sub_category}</TableCell>
                  <TableCell
                    sx={{
                      color: resource.properties.available_personal < resource.properties.min_personal ? 'red' : 'inherit'
                    }}
                  >
                    {resource.properties.available_personal}
                  </TableCell>
                  <TableCell>
                    {Array.isArray(resource.properties.equipment) && 
                      resource.properties.equipment.map((item, eqIdx) => (
                        <div
                          key={eqIdx}
                          style={{
                            color: item.qty < item.min_qty ? 'red' : 'inherit',
                            marginBottom: '4px'
                          }}
                        >
                          {item.qty} {item.type}
                        </div>
                      ))
                    }
                  </TableCell>
                  <TableCell>
                    {Array.isArray(resource.properties.vehicles) && 
                      resource.properties.vehicles.map((vehicle, vIdx) => (
                        <div
                          key={vIdx}
                          style={{
                            color: vehicle.qty < vehicle.min_qty ? 'red' : 'inherit',
                            marginBottom: '4px'
                          }}
                        >
                          {vehicle.qty} {vehicle.type}
                        </div>
                      ))
                    }
                  </TableCell>
                  <TableCell>
                    {resource.properties.loc_status}
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Pagination */}
        <Box sx={{ mt: 2 }}>
          <TablePagination
            component="div"
            count={filteredResources.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />

          <Button
            variant="outlined"
            color="secondary"
            onClick={onHide}
            sx={{ mt: 2 }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ResourcesDashboard;