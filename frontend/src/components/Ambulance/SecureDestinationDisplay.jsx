import React from 'react';
import './Ambulance.css';

function SecureDestinationDisplay({ destination, navigation, patientInfo, onConfirm, onReject }) {
    if (!destination || !navigation) {
        return (
            <div className="secure-destination">
                <h2>No destination received.</h2>
            </div>
        );
    }

    return (
        <div className="secure-destination-card">
            <div className="card-header">
                <h2>Destination Assigned</h2>
                <p>Proceed immediately to the designated hospital. Do not deviate.</p>
            </div>

            <div className="destination-details">
                <h3>Secure Destination: Follow GPS</h3>
            </div>

            <div className="navigation-summary">
                <div className="summary-item">
                    <span>Distance</span>
                    <strong>{navigation.distance} km</strong>
                </div>
                <div className="summary-item">
                    <span>Est. Time</span>
                    <strong>{navigation.estimatedTime} min</strong>
                </div>
                <div className="summary-item">
                    <span>Traffic</span>
                    <strong className={`traffic--${navigation.trafficCondition}`}>{navigation.trafficCondition}</strong>
                </div>
            </div>
            
            <div className="patient-recap">
                <h4>Patient Info for Hospital</h4>
                <p><strong>Condition:</strong> {patientInfo.condition}</p>
                <p><strong>Severity:</strong> {patientInfo.severity}</p>
                <p><strong>ETA:</strong> {patientInfo.eta} minutes</p>
            </div>

            <div className="confirmation-actions">
                <button onClick={onConfirm} className="btn-primary btn-large">
                    ✓ Acknowledge & Start Navigation
                </button>
                <button onClick={onReject} className="btn-secondary btn-large">
                    ✗ Reject Destination
                </button>
            </div>
             <div className="secure-note">
                <p>This is the only destination provided. All comparative data has been redacted for security and compliance.</p>
            </div>
        </div>
    );
}

export default SecureDestinationDisplay;
