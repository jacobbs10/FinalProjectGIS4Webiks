// src/components/IncidentGenerator.js
import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Or use fetch

function IncidentGenerator() {
    // --- State for Manual Creation ---
    const [incidentType, setIncidentType] = useState('Fire'); // Example field
    const [location, setLocation] = useState(''); // Example field (could be coords, address)
    const [description, setDescription] = useState(''); // Example field
    const [manualStatus, setManualStatus] = useState('');

    // --- State for Automatic Generation ---
    const [intervalSeconds, setIntervalSeconds] = useState(60); // Default to 60 seconds
    const [isGeneratorRunning, setIsGeneratorRunning] = useState(false);
    const [autoStatus, setAutoStatus] = useState('');

    // --- Fetch initial generator status on component mount (Optional) ---
    useEffect(() => {
        const fetchGeneratorStatus = async () => {
            try {
                // Assuming you create this backend endpoint
                const response = await axios.get('/api/incidents/generator/status');
                setIsGeneratorRunning(response.data.isRunning);
                if (response.data.interval) {
                    setIntervalSeconds(response.data.interval);
                }
                setAutoStatus(response.data.isRunning ? `Running every ${response.data.interval}s` : 'Stopped');
            } catch (error) {
                console.error("Error fetching generator status:", error);
                setAutoStatus('Could not fetch status');
            }
        };
        fetchGeneratorStatus();
    }, []);

    // --- Handlers ---
    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setManualStatus('Creating...');
        try {
            const newIncident = { type: incidentType, location, description /* Add other fields */ };
            // Assuming you have this backend endpoint
            const response = await axios.post('/api/incidents', newIncident);
            setManualStatus(`Incident created successfully (ID: ${response.data.id})`); // Adjust based on API response
            // Optionally clear the form
            // setLocation('');
            // setDescription('');
        } catch (error) {
            console.error("Error creating incident manually:", error);
            setManualStatus(`Error: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleStartGenerator = async () => {
        setAutoStatus('Starting...');
        try {
            // Assuming you create this backend endpoint
            const response = await axios.post('/api/incidents/generator/start', { interval: intervalSeconds });
            setIsGeneratorRunning(true);
            setAutoStatus(`Generator started (Interval: ${intervalSeconds}s)`);
        } catch (error) {
            console.error("Error starting generator:", error);
            setAutoStatus(`Error: ${error.response?.data?.message || error.message}`);
            setIsGeneratorRunning(false); // Ensure state reflects reality
        }
    };

    const handleStopGenerator = async () => {
        setAutoStatus('Stopping...');
        try {
             // Assuming you create this backend endpoint
            const response = await axios.post('/api/incidents/generator/stop');
            setIsGeneratorRunning(false);
            setAutoStatus('Generator stopped successfully.');
        } catch (error) {
            console.error("Error stopping generator:", error);
            setAutoStatus(`Error: ${error.response?.data?.message || error.message}`);
            // Might still be running on the backend, status could be uncertain
        }
    };

    return (
        <div>
            <h2>Incident Generator</h2>

            {/* Manual Creation Section */}
            <section>
                <h3>Create Incident Manually</h3>
                <form onSubmit={handleManualSubmit}>
                    <div>
                        <label>Type: </label>
                        <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
                            <option value="Fire">Fire</option>
                            <option value="Flood">Flood</option>
                            <option value="Traffic">Traffic Accident</option>
                            {/* Add other relevant types */}
                        </select>
                    </div>
                    <div>
                        <label>Location: </label>
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., 32.0853, 34.7818 or Address" required />
                    </div>
                    <div>
                        <label>Description: </label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                    </div>
                    {/* Add more fields as needed for your incident data model */}
                    <button type="submit">Create Incident</button>
                    {manualStatus && <p>Status: {manualStatus}</p>}
                </form>
            </section>

            <hr />

            {/* Automatic Generation Section */}
            <section>
                <h3>Automatic Incident Generation</h3>
                <div>
                    <label>Generation Interval (seconds): </label>
                    <input
                        type="number"
                        value={intervalSeconds}
                        onChange={(e) => setIntervalSeconds(parseInt(e.target.value, 10))}
                        min="5" // Set a reasonable minimum
                        disabled={isGeneratorRunning} // Disable input while running
                    />
                </div>
                <button onClick={handleStartGenerator} disabled={isGeneratorRunning || intervalSeconds < 5}>
                    Start Automatic Generation
                </button>
                <button onClick={handleStopGenerator} disabled={!isGeneratorRunning}>
                    Stop Automatic Generation
                </button>
                 {autoStatus && <p>Status: {autoStatus}</p>}
            </section>
        </div>
    );
}

export default IncidentGenerator;
