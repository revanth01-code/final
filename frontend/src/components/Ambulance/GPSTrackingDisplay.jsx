import React from 'react';
import './Ambulance.css';

// A simple map placeholder. In a real app, this would be a Leaflet or Google Maps component.
const MapPlaceholder = ({ destination }) => {
    return (
        <div className="map-placeholder">
            <div className="map-content">
                <div className="map-pin origin">📍</div>
                <div className="map-route-line"></div>
                <div className="map-pin destination">🏥</div>
            </div>
            <p>Navigating to Secure Destination</p>
        </div>
    );
};


function GPSTrackingDisplay({ destination, trackingInfo, onComplete }) {
    if (!destination || !trackingInfo) {
        return <h2>Starting navigation...</h2>;
    }
    
    const expectedArrival = new Date(trackingInfo.expectedArrival.estimatedArrival).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="gps-tracking-display">
            <div className="card-header">
                <h2>En Route to Destination</h2>
                <p>Follow the recommended route. Deviations will be flagged.</p>
            </div>
            
            <div className="destination-details-tracking">
                 <h3>Destination: Classified</h3>
            </div>

            <MapPlaceholder destination={destination} />

            <div className="tracking-summary">
                 <div className="summary-item">
                    <span>Est. Arrival</span>
                    <strong>{expectedArrival}</strong>
                </div>
                 <div className="summary-item">
                    <span>Est. Time Left</span>
                    <strong>{trackingInfo.expectedArrival.estimatedTimeMinutes} min</strong>
                </div>
                 <div className="summary-item">
                    <span>Distance Left</span>
                    <strong>{(trackingInfo.expectedArrival.estimatedDistanceMeters / 1000).toFixed(1)} km</strong>
                </div>
            </div>

            <div className="completion-action">
                <button onClick={onComplete} className="btn-primary btn-large btn-arrive">
                    ✓ Arrived at Hospital & Complete Trip
                </button>
            </div>
        </div>
    );
}

export default GPSTrackingDisplay;
