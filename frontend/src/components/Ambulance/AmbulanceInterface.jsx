import { useState, useEffect } from 'react';
import { calculateOptimalRoute, confirmHospital, updateLocation, completeTrip } from '../../services/api';
import PatientForm from './PatientForm';
import SecureDestinationDisplay from './SecureDestinationDisplay';
import GPSTrackingDisplay from './GPSTrackingDisplay';
import './Ambulance.css';

// This component orchestrates the entire workflow for the paramedic
function AmbulanceInterface() {
    const [workflowState, setWorkflowState] = useState('IDLE'); // IDLE, CALCULATING, CONFIRMING_DESTINATION, NAVIGATING, COMPLETED
    const [error, setError] = useState('');

    // Data from the workflow
    const [patientDetails, setPatientDetails] = useState(null);
    const [routingResponse, setRoutingResponse] = useState(null);
    const [confirmedRequest, setConfirmedRequest] = useState(null);

    // Effect for GPS tracking simulation
    useEffect(() => {
        let trackingInterval;
        if (workflowState === 'NAVIGATING' && confirmedRequest) {
            console.log('Starting GPS tracking simulation...');
            trackingInterval = setInterval(() => {
                // In a real app, this would get a real GPS location
                const currentLocation = {
                    latitude: 28.5 + (Math.random() - 0.5) * 0.1,
                    longitude: 77.2 + (Math.random() - 0.5) * 0.1,
                    speed: 60 + Math.random() * 10,
                    heading: 180 + (Math.random() - 0.5) * 20,
                };
                
                updateLocation({
                    requestId: confirmedRequest.requestId,
                    location: currentLocation,
                }).catch(err => console.error("Failed to send location update:", err));

            }, 10000); // Send update every 10 seconds
        }

        return () => {
            if (trackingInterval) {
                console.log('Stopping GPS tracking simulation.');
                clearInterval(trackingInterval);
            }
        };
    }, [workflowState, confirmedRequest]);

    const handlePatientSubmit = async (formData) => {
        setError('');
        setWorkflowState('CALCULATING');
        setPatientDetails(formData);

        try {
            const res = await calculateOptimalRoute({
                patientLocation: formData.patientLocation,
                patientCondition: formData.patientCondition,
            });
            setRoutingResponse(res.data);
            setWorkflowState('CONFIRMING_DESTINATION');
        } catch (err) {
            console.error('Error calculating optimal route:', err);
            setError(err.response?.data?.error || 'Failed to calculate route.');
            setWorkflowState('IDLE');
        }
    };

    const handleConfirmDestination = async () => {
        setError('');
        try {
            const res = await confirmHospital({
                hospitalId: routingResponse.destination.hospitalId,
                patientLocation: patientDetails.patientLocation,
                patientCondition: patientDetails.patientCondition,
                navigation: routingResponse.navigation,
            });
            setConfirmedRequest(res.data);
            setWorkflowState('NAVIGATING');
        } catch (err) {
            console.error('Error confirming hospital:', err);
            setError(err.response?.data?.error || 'Failed to confirm hospital destination.');
        }
    };
    
    const handleCompleteTrip = async () => {
        setError('');
        try {
            await completeTrip({ requestId: confirmedRequest.requestId });
            setWorkflowState('COMPLETED');
        } catch (err) {
            console.error('Error completing trip:', err);
            setError(err.response?.data?.error || 'Failed to complete trip.');
        }
    };

    const handleReset = () => {
        setWorkflowState('IDLE');
        setPatientDetails(null);
        setRoutingResponse(null);
        setConfirmedRequest(null);
        setError('');
    };

    const renderContent = () => {
        switch (workflowState) {
            case 'IDLE':
                return <PatientForm onSubmit={handlePatientSubmit} />;
            case 'CALCULATING':
                return (
                    <div className="loading-overlay">
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <p>Calculating optimal route based on live traffic and hospital capacity...</p>
                        </div>
                    </div>
                );
            case 'CONFIRMING_DESTINATION':
                return (
                    <SecureDestinationDisplay
                        destination={routingResponse.destination}
                        navigation={routingResponse.navigation}
                        patientInfo={routingResponse.patientInfo}
                        onConfirm={handleConfirmDestination}
                        onReject={handleReset}
                    />
                );
            case 'NAVIGATING':
                return (
                    <GPSTrackingDisplay
                        destination={confirmedRequest.destination}
                        trackingInfo={confirmedRequest.tracking}
                        onComplete={handleCompleteTrip}
                    />
                );
            case 'COMPLETED':
                return (
                    <div className="trip-completed-card">
                        <h2>Trip Completed</h2>
                        <p>Patient successfully handed over to the designated hospital.</p>
                        <button onClick={handleReset} className="btn-primary">
                            Start New Emergency
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="ambulance-interface">
            <div className="interface-header">
                <h1>🚑 Ambulance Emergency Interface</h1>
                {workflowState !== 'IDLE' && workflowState !== 'CALCULATING' && (
                     <button onClick={handleReset} className="btn-secondary">
                         Cancel & Reset
                     </button>
                )}
            </div>
            {error && <div className="error-message component-error">{error}</div>}
            <div className="interface-content">
                {renderContent()}
            </div>
        </div>
    );
}

export default AmbulanceInterface;