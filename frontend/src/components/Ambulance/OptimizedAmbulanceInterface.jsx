import { useState, useEffect, useRef } from 'react';
import { calculateOptimalRoute, confirmHospital, updateLocation, completeTrip } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import PatientForm from './PatientForm';
import SecureDestinationDisplay from './SecureDestinationDisplay';
import GPSTrackingDisplay from './GPSTrackingDisplay';
import './Ambulance.css';

function OptimizedAmbulanceInterface() {
    const [currentStep, setCurrentStep] = useState('patient-info'); // patient-info, calculating, destination-confirmed, enroute, completed
    const [patientData, setPatientData] = useState(null);
    const [patientLocation, setPatientLocation] = useState(null);
    const [destination, setDestination] = useState(null);
    const [navigation, setNavigation] = useState(null);
    const [requestId, setRequestId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [gpsEnabled, setGpsEnabled] = useState(false);
    const [trackingStatus, setTrackingStatus] = useState(null);
    const locationUpdateRef = useRef(null);
    const { socket } = useSocket();
    const { user } = useAuth();

    // request browser notification permission early
    useEffect(() => {
        if (Notification && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Get patient's location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setPatientLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date()
                    });
                },
                (err) => {
                    console.error('Geolocation error:', err);
                    setError('Unable to get location. Please enable GPS.');
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    }, []);

    // GPS tracking effect
    useEffect(() => {
        if (currentStep === 'enroute' && gpsEnabled) {
            locationUpdateRef.current = setInterval(() => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const location = {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                                accuracy: position.coords.accuracy,
                                speed: position.coords.speed || 0,
                                heading: position.coords.heading || 0,
                                timestamp: new Date()
                            };
                            
                            // Send location update to server
                            updateLocation({
                                requestId,
                                location
                            }).catch(err => {
                                console.error('Location update error:', err);
                                const msg = err.response?.data?.error;
                                if (msg === 'Active tracking session not found') {
                                    // session lost (maybe due to server restart); reset UI
                                    alert('⚠️ Tracking session no longer active. The trip will be reset.');
                                    // duplicate reset logic inline to avoid referencing handleReset before declaration
                                    setCurrentStep('patient-info');
                                    setPatientData(null);
                                    setDestination(null);
                                    setNavigation(null);
                                    setRequestId(null);
                                    setTrackingStatus(null);
                                    setGpsEnabled(false);
                                    setError(null);
                                }
                            });
                        },
                        (err) => console.error('GPS error:', err),
                        { enableHighAccuracy: true }
                    );
                }
            }, 30000); // Update every 30 seconds

            return () => {
                if (locationUpdateRef.current) {
                    clearInterval(locationUpdateRef.current);
                }
            };
        }
    }, [currentStep, gpsEnabled, requestId]);

    // Listen for deviation alerts and hospital confirmation notifications
    useEffect(() => {
        if (socket) {
            socket.on('deviation-alert', (data) => {
                alert(`⚠️ ROUTE DEVIATION DETECTED!\n\n${data.details.reasons.join('\n')}\n\nPlease return to the recommended route.`);
            });

            socket.on('hospital-confirmed', (info) => {
                console.log('Socket event hospital-confirmed', info);
                const msg = `Hospital confirmed: ${info.hospitalName || ''} (ETA ${info.eta} min)`;
                if (Notification.permission === 'granted') {
                    new Notification('Hospital Selected', { body: msg });
                } else {
                    alert(msg);
                }
            });

            return () => {
                socket.off('deviation-alert');
                socket.off('hospital-confirmed');
            };
        }
    }, [socket]);

    const handlePatientSubmit = async (data) => {
        if (!patientLocation) {
            setError('Location not available. Please enable GPS.');
            return;
        }

        setLoading(true);
        setError(null);
        setCurrentStep('calculating');

        try {
            const response = await calculateOptimalRoute({
                patientLocation: {
                    latitude: patientLocation.latitude,
                    longitude: patientLocation.longitude
                },
                patientCondition: data.patientCondition
            });

            const result = response.data;

            setDestination(result.destination);
            setNavigation(result.navigation);
            setPatientData(data.patientCondition);
            setCurrentStep('destination-confirmed');

        } catch (err) {
            console.error('Error calculating optimal route:', err);
            setError(err.response?.data?.error || 'Failed to calculate optimal route. Please try again.');
            setCurrentStep('patient-info');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDestination = async () => {
        if (!destination || !navigation) return;

        setLoading(true);
        setError(null);

        try {
            const response = await confirmHospital({
                hospitalId: destination.hospitalId,
                hospitalName: destination.hospitalName,
                patientLocation: {
                    latitude: patientLocation.latitude,
                    longitude: patientLocation.longitude
                },
                patientCondition: patientData,
                navigation: navigation
            });

            const result = response.data;

            setRequestId(result.requestId);
            setTrackingStatus(result.tracking);
            setGpsEnabled(true);
            setCurrentStep('enroute');

            // Notify hospital via socket
            if (socket && socket.connected) {
                socket.emit('new-request', {
                    requestId: result.requestId,
                    hospitalId: destination.hospitalId,
                    patientAge: patientData.age,
                    patientGender: patientData.gender,
                    condition: patientData.condition,
                    severity: patientData.severity,
                    requiredSpecialty: patientData.requiredSpecialty,
                    vitals: patientData.vitals,
                    eta: navigation.estimatedTime,
                    ambulanceId: user.ambulanceId,
                    paramedicName: user.name,
                    paramedicPhone: user.phone,
                    ambulanceLocation: patientLocation
                });
            }

            alert(`✅ Hospital Confirmed!\n\n${destination.hospitalName}\nETA: ${navigation.estimatedTime} minutes\n\nGPS tracking is now active.`);

        } catch (err) {
            console.error('Error confirming hospital:', err);
            setError(err.response?.data?.error || 'Failed to confirm hospital. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteTrip = async () => {
        if (!requestId) return;

        setLoading(true);

        try {
            let finalLocation = null;
            if (navigator.geolocation) {
                finalLocation = await new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        }),
                        () => resolve(null)
                    );
                });
            }

            await completeTrip({
                requestId,
                finalLocation
            });

            setGpsEnabled(false);
            setCurrentStep('completed');

            alert('✅ Trip Completed Successfully!\n\nPatient has been handed over to the hospital.');

        } catch (err) {
            console.error('Error completing trip:', err);
            const msg = err.response?.data?.error;
            if (msg === 'Active tracking session not found') {
                alert('⚠️ Tracking session no longer active. The trip will be reset.');
                setCurrentStep('patient-info');
                setPatientData(null);
                setDestination(null);
                setNavigation(null);
                setRequestId(null);
                setTrackingStatus(null);
                setGpsEnabled(false);
                setError(null);
            } else {
                setError(msg || 'Failed to complete trip.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setCurrentStep('patient-info');
        setPatientData(null);
        setDestination(null);
        setNavigation(null);
        setRequestId(null);
        setTrackingStatus(null);
        setGpsEnabled(false);
        setError(null);
    };

    return (
        <div className="ambulance-interface optimized">
            <div className="interface-header">
                <h1>🚑 Emergency Response System</h1>
                <div className="system-status">
                    <span className={`status-badge ${gpsEnabled ? 'active' : ''}`}>
                        {gpsEnabled ? '🟢 GPS Active' : '🔴 GPS Inactive'}
                    </span>
                    <span className="version-badge">v2.0</span>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {currentStep === 'patient-info' && (
                <PatientForm onSubmit={handlePatientSubmit} />
            )}

            {currentStep === 'calculating' && (
                <div className="calculating-container">
                    <div className="calculating-animation">
                        <div className="pulse-ring"></div>
                        <div className="pulse-ring delay-1"></div>
                        <div className="pulse-ring delay-2"></div>
                        <div className="calculating-icon">🔄</div>
                    </div>
                    <h2>Analyzing Hospital Readiness...</h2>
                    <p>Processing predictive analytics and traffic data</p>
                    <div className="analysis-steps">
                        <div className="step">📊 Evaluating ICU capacity predictions</div>
                        <div className="step">🚦 Analyzing real-time traffic</div>
                        <div className="step">🏥 Checking specialist availability</div>
                        <div className="step">⚡ Calculating optimal route</div>
                    </div>
                </div>
            )}

            {currentStep === 'destination-confirmed' && destination && (
                <SecureDestinationDisplay
                    destination={destination}
                    navigation={navigation}
                    patientData={patientData}
                    onConfirm={handleConfirmDestination}
                    onCancel={handleReset}
                    loading={loading}
                />
            )}

            {currentStep === 'enroute' && (
                <GPSTrackingDisplay
                    destination={destination}
                    navigation={navigation}
                    requestId={requestId}
                    trackingStatus={trackingStatus}
                    onComplete={handleCompleteTrip}
                    loading={loading}
                />
            )}

            {currentStep === 'completed' && (
                <div className="completion-container">
                    <div className="completion-icon">✅</div>
                    <h2>Trip Completed Successfully</h2>
                    <p>Patient has been handed over to {destination?.hospitalName}</p>
                    <div className="completion-details">
                        <div className="detail">
                            <span className="label">Hospital:</span>
                            <span className="value">{destination?.hospitalName}</span>
                        </div>
                        <div className="detail">
                            <span className="label">Condition:</span>
                            <span className="value">{patientData?.condition}</span>
                        </div>
                    </div>
                    <button onClick={handleReset} className="btn-primary">
                        Start New Emergency
                    </button>
                </div>
            )}

            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>Processing...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OptimizedAmbulanceInterface;
