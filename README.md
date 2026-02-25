# MediRoute - Real-Time Hospital Readiness & Ambulance Routing System

**MediRoute** is an intelligent emergency healthcare system that connects ambulances with the most suitable hospitals in real-time, ensuring faster treatment and better patient outcomes during medical emergencies.

---

## 📋 Table of Contents

* [Problem Statement](#-problem-statement)
* [Solution](#-solution)
* [Key Features](#-key-features)
* [Tech Stack](#-tech-stack)
* [System Architecture](#-system-architecture)
* [Prerequisites](#-prerequisites)
* [Installation & Setup](#-installation--setup)
* [Usage Guide](#-usage-guide)
* [API Documentation](#-api-documentation)
* [Algorithm Explanation](#-algorithm-explanation)
* [Screenshots](#-screenshots)
* [Project Structure](#-project-structure)
* [Demo Credentials](#-demo-credentials)
* [Testing Scenarios](#-testing-scenarios)
* [Contributing](#-contributing)
* [Team](#-team)
* [License](#-license)

---

## 🚨 Problem Statement

**Current Challenges in Emergency Healthcare:**

1.  **Information Gap**: Ambulance drivers don't know real-time hospital capacity.
2.  **Time Wastage**: Multiple phone calls to find suitable hospitals.
3.  **Wrong Hospital Selection**: Patients arrive at hospitals that cannot treat them.
4.  **Delayed Treatment**: Critical time lost in finding the right facility.
5.  **Poor Coordination**: No communication between ambulances and hospitals.
6.  **Unprepared Hospitals**: Staff unaware of incoming emergency patients.

**Result**: Preventable delays leading to poor patient outcomes in emergencies.

---

## ✨ Solution

**MediRoute** solves these problems through:

**For Ambulance Drivers:**
* **Instant Hospital Search**: Enter patient details and get best hospitals immediately.
* **Smart Matching**: Algorithm finds hospitals that can actually treat the patient.
* **Real-Time Data**: See live bed availability, doctor availability, and equipment status.
* **One-Click Booking**: Book emergency slot with selected hospital instantly.
* **Navigation Ready**: Get hospital location and contact details.

**For Hospitals:**
* **Advance Notifications**: Know about incoming patients before they arrive.
* **Feature Management**: Update beds, doctors, and equipment availability in real-time.
* **Patient History**: Maintain complete records of all emergency cases.
* **Dashboard Analytics**: Track active cases, incoming bookings, and statistics.
* **Zero Phone Calls**: All coordination happens through the system.

**Core Innovation:**
**Real-time bidirectional synchronization** - When a hospital updates capacity, all ambulances see it instantly. When an ambulance books a slot, the hospital is notified immediately.

---

## 🎯 Key Features

### 🚑 Ambulance Interface

| Feature | Description |
| :--- | :--- |
| **Patient Booking Form** | Enter patient name, problem, pulse rate, and condition level |
| **Smart Hospital Search** | Algorithm analyzes and ranks hospitals based on patient needs |
| **Live Results** | See top 5 hospitals with match scores, distance, ETA, and availability |
| **Instant Booking** | Select and book hospital with one click |
| **Active Bookings** | Track current bookings and their status |
| **Real-Time Updates** | Receive instant notifications when hospital updates capacity |

### 🏥 Hospital Interface

| Feature | Description |
| :--- | :--- |
| **Home Dashboard** | View active cases, in-progress patients, and statistics |
| **Incoming Bookings** | Receive real-time alerts for new emergency patients |
| **Accept/Reject** | Approve or decline incoming booking requests |
| **Patient History** | Complete searchable database of all treated patients |
| **Feature Management** | Update beds, ICU, doctors, and equipment availability |
| **Live Broadcasting** | Changes broadcast instantly to all ambulances |

### 🤖 Intelligent Matching Algorithm

**Multi-Factor Scoring System (0-100 scale):**

1.  **Required Doctor Availability (40% weight)**: Matches patient condition to required specialist (e.g., Heart attack requires Cardiologist).
2.  **Bed/ICU Availability (30% weight)**: Critical patients require ICU beds; moderate patients require general beds.
3.  **Equipment Availability (20% weight)**: Validates hospital has necessary equipment (e.g., Stroke patient requires CT/MRI scan).
4.  **Distance & Proximity (10% weight)**: Considers distance and estimated travel time, balancing proximity with medical capability.

**Result**: Top 5 hospitals ranked by composite score.

### ⚡ Real-Time Synchronization

* **WebSocket Technology**: Instant bidirectional communication.
* **Sub-2 Second Updates**: Changes appear across all devices immediately.
* **Event-Driven Architecture**: Efficient resource usage and scalability.

---

## 🛠️ Tech Stack

**Frontend**
* **React.js 18.2** - Frontend framework
* **React Router DOM 6.20** - Client-side routing
* **Leaflet + React-Leaflet** - Interactive maps (OpenStreetMap)
* **Socket.io-client 4.6** - Real-time communication
* **Axios** - HTTP client for API calls
* **Context API** - State management

**Backend**
* **Node.js 18+** - Runtime environment
* **Express.js 4.18** - Web framework
* **Socket.io 4.6** - WebSocket server
* **MongoDB 6.0** - NoSQL database
* **Mongoose 7.0** - MongoDB ODM
* **JWT** - Authentication tokens
* **Bcrypt.js** - Password hashing

**Development Tools**
* **Nodemon** - Auto-restart server
* **CORS** - Cross-origin resource sharing
* **Dotenv** - Environment variable management

---

## 🏗️ System Architecture
```text
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
├──────────────────────┬──────────────────────────────────────┤
│  Ambulance Interface │     Hospital Interface               │
│      (React App)     │        (React App)                   │
└──────────────────────┴──────────────────────────────────────┘
            │                               │
            │  HTTP REST APIs               │  HTTP REST APIs
            │  WebSocket Connection         │  WebSocket Connection
            └───────────┬───────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Express.js REST API Server (Port 5000)                     │
│  ├─ Authentication (JWT)                                    │
│  ├─ Hospital Routes                                         │
│  ├─ Booking Routes                                          │
│  └─ User Routes                                             │
│                                                             │
│  Socket.io WebSocket Server                                 │
│  ├─ Real-time event handling                                │
│  ├─ Room-based broadcasting                                 │
│  └─ Bidirectional sync                                      │
│                                                             │
│  Smart Matching Algorithm                                   │
│  ├─ Haversine distance calculation                          │
│  ├─ Multi-factor scoring                                    │
│  ├─ Doctor-condition matching                               │
│  └─ Hospital ranking                                        │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  MongoDB Atlas (Cloud Database)                             │
│  ├─ hospitals collection                                    │
│  ├─ bookings collection                                     │
│  └─ users collection                                        │
└─────────────────────────────────────────────────────────────┘