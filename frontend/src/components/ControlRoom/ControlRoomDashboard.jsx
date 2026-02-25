import { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { getAllHospitals } from '../../services/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './ControlRoom.css';

// This is a simplified, incomplete implementation of the dashboard
function ControlRoomDashboard() {
    const { trackedAmbulances: liveAmbulances, alerts, isConnected } = useSocket();
    const [hospitals, setHospitals] = useState([]);
    const [selectedAmbulance, setSelectedAmbulance] = useState(null);

    // Fetch initial data only once
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch all hospitals for map markers
                const hospitalsResponse = await getAllHospitals();
                if (hospitalsResponse && hospitalsResponse.data && Array.isArray(hospitalsResponse.data.data)) {
                    setHospitals(hospitalsResponse.data.data);
                } else {
                    console.error('Received malformed hospital data:', hospitalsResponse);
                    setHospitals([]);
                }
            } catch (error) {
                console.error('Error fetching initial hospital data:', error);
                setHospitals([]);
            }
        };

        fetchInitialData();
    }, []);

    const getAlertColor = (ambulance) => {
        const hasAlert = alerts.some(a => a.ambulanceId === ambulance.ambulanceId && !a.resolved);
        if (hasAlert) return '#ef4444'; // Red for active alerts
        return '#22c55e'; // Green for normal
    };
    
    const getAlertCountForAmbulance = (ambulanceId) => {
        return alerts.filter(a => a.ambulanceId === ambulanceId && !a.resolved).length;
    };

    return (
        <div className="control-room-dashboard">
            <div className="control-room-header">
                <h1>🎛️ Control Room Dashboard</h1>
                <div className="header-info">
                    <span className={`socket-status ${isConnected ? 'connected' : ''}`}>
                        {isConnected ? '● Real-time connection active' : '○ Disconnected'}
                    </span>
                </div>
            </div>

            <div className="control-room-content">
                {/* Left Panel - Ambulance List */}
                <div className="ambulance-list-panel">
                    <h2>🚑 Active Ambulances ({liveAmbulances.length})</h2>
                    {liveAmbulances.length === 0 ? (
                        <div className="empty-state"><p>No active ambulances.</p></div>
                    ) : (
                        <div className="ambulance-list">
                            {liveAmbulances.map((ambulance) => (
                                <div 
                                    key={ambulance.requestId}
                                    className={`ambulance-card ${selectedAmbulance?.requestId === ambulance.requestId ? 'selected' : ''}`}
                                    onClick={() => setSelectedAmbulance(ambulance)}
                                >
                                    <div className="ambulance-header">
                                        <span className="ambulance-id">{ambulance.ambulanceId}</span>
                                        <span 
                                            className="alert-badge"
                                            style={{ backgroundColor: getAlertColor(ambulance) }}
                                        >
                                            {getAlertCountForAmbulance(ambulance.ambulanceId) > 0 
                                                ? `${getAlertCountForAmbulance(ambulance.ambulanceId)} Alert(s)` 
                                                : 'Normal'}
                                        </span>
                                    </div>
                                    <div className="ambulance-details">
                                        <p>To: {ambulance.destination || 'Unknown'}</p>
                                        <p>ETA: {ambulance.expectedArrival?.estimatedTimeMinutes} min</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Center Panel - Map */}
                <div className="map-panel">
                    <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {hospitals.map(h => <Marker key={h._id} position={[h.location.latitude, h.location.longitude]}><Popup>🏥 {h.name}</Popup></Marker>)}

                        {liveAmbulances.map(amb => (
                            amb.currentLocation && (
                                <Marker 
                                    key={amb.requestId} 
                                    position={[amb.currentLocation.latitude, amb.currentLocation.longitude]}
                                >
                                    <Popup>🚑 {amb.ambulanceId}<br/>To: {amb.destination}</Popup>
                                </Marker>
                            )
                        ))}
                         {selectedAmbulance && selectedAmbulance.destinationCoords && (
                            <Polyline 
                                positions={[
                                    [selectedAmbulance.currentLocation.latitude, selectedAmbulance.currentLocation.longitude],
                                    [selectedAmbulance.destinationCoords.latitude, selectedAmbulance.destinationCoords.longitude]
                                ]} 
                                color="blue" 
                            />
                        )}
                    </MapContainer>
                </div>

                {/* Right Panel - Alerts and Stats */}
                <div className="stats-panel">
                    <h2>⚠️ Live Alerts</h2>
                    <div className="alert-list">
                        {alerts.filter(a => !a.resolved).length === 0 ? (
                            <div className="empty-state"><p>No active alerts.</p></div>
                        ) : (
                            alerts.filter(a => !a.resolved).map(alert => (
                                <div key={alert.id} className={`alert-card severity--${alert.severity}`}>
                                    <p><strong>{alert.ambulanceId}</strong>: {alert.details.reasons.join(', ')}</p>
                                    <span className="timestamp">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                </div>
                            ))
                        )}
                    </div>

                     <h2>📊 System Statistics</h2>
                    <div className="stat-card">
                        <span>Active Ambulances</span>
                        <div className="stat-value">{liveAmbulances.length}</div>
                    </div>
                     <div className="stat-card">
                        <span>Hospitals Online</span>
                        <div className="stat-value">{hospitals.length}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ControlRoomDashboard;
