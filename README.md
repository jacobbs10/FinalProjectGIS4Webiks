# 🚀 Emergency Services Dashboard 🖥️🗺️

---

# 📑 Table of Contents

1. 🚀 Introduction
2. 👥 About Us
3. 📋 Project Overview
4. 🛠️ Technology Stack
5. 🏛️ System Architecture
6. ✨ Key Features
7. ⚙️ Installation Guide
8. 🔑 Environment Variables
9. 🖥️ Usage Instructions
10. 🚀 Deployment Link
11. 🔮 Future Improvements
12. 📞 Contact

---

# 🚀 1. Introduction

An advanced FullStack GIS-based web application that manages real-time emergency incidents (Police, Fire, Medical, Army Rescue) on an interactive map interface.  
The platform allows dispatchers and incident managers to quickly assess, allocate, and monitor emergency resources.

---

# 👥 2. About Us

We are three passionate FullStack developers seeking our first opportunity:

- Jacob Bensaid 👨‍💻
- Eli Danino 👨‍💻
- Noam Yogev 👨‍💻

We developed this system within just 4 days as part of our MERN Final Project challenge.

---

# 📋 3. Project Overview

**Emergency Services Dashboard** allows real-time management and visualization of:

- 🚓 Police incidents
- 🚒 Fire incidents
- 🚑 Medical emergencies
- 🪖 Army rescue operations
- 🤝 Joint task force coordination

Features include live incident tracking, dynamic resource assignment, alert management, automatic incident simulation, and geographic analysis.

---

# 🛠️ 4. Technology Stack

- **Frontend**:
  - React.js ⚛️
  - Leaflet.js 🗺️ (GIS Map)
  - React-Leaflet-Draw 🖊️
  - Bootstrap 🎨 (Responsive UI Styling)
  - Axios 🔗 (HTTP Requests)
- **Backend**:
  - Node.js Server 🚀
  - Express.js REST API Framework 📡
  - JWT Authentication 🔐
- **Database**:
  - MongoDB (Hosted on Atlas) 🛢️
  - GeoJSON Spatial Data 🌎
  - Geospatial Indexing 📍

---

# 🏛️ 5. System Architecture

```
                    ┌─────────────────────────────┐
                    │         Frontend            │
                    │  - React.js                 │
                    │  - Leaflet.js (Map)         │
                    │  - React-Leaflet-Draw       │
                    │  - Bootstrap (UI Styling)   │
                    │  - Axios (HTTP Requests)    │
                    └──────────────┬──────────────┘
                                   │
                        (Axios HTTP Calls)
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │         Backend             │
                    │  - Node.js Server           │
                    │  - Express.js Framework     │
                    │  - JWT Authentication       │
                    │  - RESTful APIs (Resources, │
                    │    Incidents, Locations)    │
                    └──────────────┬──────────────┘
                                   │
                        (Mongoose ORM)
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │          Database           │
                    │      - MongoDB Atlas        │
                    │      - GeoJSON Format       │
                    │      - Geospatial Indexing  │
                    └─────────────────────────────┘
```

The system is designed to ensure **secure**, **real-time**, and **location-based** emergency management at scale.

---

# ✨ 6. Key Features

✅ Interactive GIS Map (Leaflet)
✅ Real-Time Incident Updates
✅ Resource Allocation (Police, Fire, Medical, Army)
✅ Dynamic Filtering by Category & Status
✅ Auto Incident Generator
✅ Incident Progress Simulation
✅ Admin Dashboard with Login/Registration
✅ Responsive Design for Mobile/Desktop

---

# ⚙️ 7. Installation Guide

```bash
# Clone the project
git clone https://github.com/jacobbs10/FinalProjectGIS4Webiks

# Navigate into project folders
cd client
npm install

cd ../server
npm install

# Start the development servers
npm run dev  # (From root folder if concurrently configured)
```

---

# 🔑 8. Environment Variables

Create a `.env` file inside `/server`:

| Variable Name        | Description                   | Example Value                                  |
| -------------------- | ----------------------------- | ---------------------------------------------- |
| `MONGODB_URI`        | MongoDB connection string     | mongodb+srv://username:password@...            |
| `JWT_SECRET`         | Secret for JWT authentication | yourSecretKey                                  |
| `REACT_APP_BASE_URL` | Client's API server URL       | http://localhost:5000                          |

---

# 🖥️ 9. Usage Instructions

```bash
# From /server
npm run start  # Starts backend

# From /client
npm start  # Starts frontend React app
```

Access at: http://localhost:3000

---

# 🚀 10. Deployment Link

✅ Live at: [https://ken-gis-c.onrender.com/](https://ken-gis-c.onrender.com/)

---

# 🔮 11. Future Improvements

- Real-time WebSocket updates for incidents
- Resource route optimization (ETA, live tracking)
- Heatmap analytics for incident density
- Multi-language support (Hebrew/English toggle)

---

# 📞 12. Contact

Jacob Bensaid | Email: jacob.bensaid@gmail.com | Cell: +972545984134  
Eli Danino | Email: daninoeli@gmail.com | Cell: +972526919937  
Noam Yogev | Email: NoamYogev2@gmail.com | Cell: +972544689124

---

🌟 **End Note**:  
*"Emergency response is measured in seconds.  
Our system helps cities respond smarter, faster, and better."*

