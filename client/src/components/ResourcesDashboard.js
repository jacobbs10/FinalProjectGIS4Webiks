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

const ResourcesDashboard = ({ onClose }) => {
  const [resources, setResources] = useState([]);
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch resources from API
  useEffect(() => {
    axios
      .get("/api/resources") // Replace with your API endpoint
      .then((response) => {
        setResources(response.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching resources:", err);
        setError("Failed to load resources.");
        setLoading(false);
      });
  }, []);

  // Filter resources by category and sub-category
  const filteredResources = resources.filter(
    (resource) =>
      (!category || resource.category === category) &&
      (!subCategory || resource.subCategory === subCategory)
  );

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
    <Modal open={true} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80%",
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
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
            <MenuItem value="Category 1">Category 1</MenuItem>
            <MenuItem value="Category 2">Category 2</MenuItem>
          </TextField>

          <TextField
            select
            label="Sub-Category"
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
            fullWidth
          >
            <MenuItem value="">All Sub-Categories</MenuItem>
            <MenuItem value="Sub 1">Sub 1</MenuItem>
            <MenuItem value="Sub 2">Sub 2</MenuItem>
          </TextField>
        </Box>

        {/* Resources Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Sub-Category</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedResources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell>{resource.name}</TableCell>
                  <TableCell>{resource.category}</TableCell>
                  <TableCell>{resource.subCategory}</TableCell>
                  <TableCell>{resource.level}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        bgcolor: getStatusColor(resource.level, resource.min),
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

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
          onClick={onClose}
          sx={{ mt: 2 }}
        >
          Close
        </Button>
      </Box>
    </Modal>
  );
};

export default ResourcesDashboard;