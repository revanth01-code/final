import { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { getAllRequests } from '../../services/api';
import './Hospital.css';

function IncomingPatients() {
    const [incomingPatients, setIncomingPatients] = useState([]);
    const { socket } = useSocket();
    const { user } = useAuth();

    useEffect(() => {
        if (socket && socket.connected && user?.hospitalId) {
            // Join hospital room
            socket.emit('join-hospital', user.hospitalId);
            console.log('Joined hospital room:', user.hospitalId);

            // Request browser notification permission
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }

            // Fetch existing active requests for this hospital
            const loadActive = async () => {
                try {
                    const res = await getAllRequests({
                        hospitalId: user.hospitalId,
                        status: 'enroute'
                    });
                    const cases = (res.data.data || []).map(r => ({
                        requestId: r._id,
                        patientAge: r.patient.age,
                        patientGender: r.patient.gender,
                        condition: r.patient.condition,
                        severity: r.patient.severity,
                        requiredSpecialty: r.patient.requiredSpecialty,
                        vitals: r.patient.vitals,
                        eta: r.navigation?.estimatedTime,
                        ambulanceId: r.ambulance,
                        paramedicName: r.paramedic.name,
                        paramedicPhone: r.paramedic.phone,
                        ambulanceLocation: r.location,
                        timestamp: r.createdAt
                    }));
                    setIncomingPatients(cases);
                } catch (err) {
                    console.error('Failed to load active cases:', err);
                }
            };

            loadActive();

            // Listen for incoming patients
            socket.on('incoming-patient', (patientData) => {
                console.log('🚨 New incoming patient:', patientData);

                // Add to state
                setIncomingPatients(prev => {
                    // Check if already exists
                    const exists = prev.find(p => p.requestId === patientData.requestId);
                    if (exists) return prev;
                    return [...prev, patientData];
                });

                // Show browser notification
                if (Notification.permission === 'granted') {
                    new Notification('🚨 New Emergency Patient', {
                        body: `${patientData.condition} - ETA: ${patientData.eta} min`,
                        icon: '/ambulance-icon.png',
                        tag: patientData.requestId
                    });
                }

                // Play alert sound
                playAlertSound();
            });

            // Listen for ambulance arrival
            socket.on('patient-arrived', (data) => {
                console.log('✅ Patient arrived:', data);
                setIncomingPatients(prev =>
                    prev.filter(p => p.requestId !== data.requestId)
                );
            });

            return () => {
                socket.off('incoming-patient');
                socket.off('patient-arrived');
            };
        }
    }, [socket, user]);

    const playAlertSound = () => {
        try {
            const audio = new Audio('/alert.mp3');
            audio.play().catch(err => console.log('Audio play failed:', err));
        } catch (error) {
            console.log('Audio not available');
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return '#ef4444';
            case 'severe': return '#f59e0b';
            case 'moderate': return '#3b82f6';
            default: return '#10b981';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical': return '🔴';
            case 'severe': return '🟠';
            case 'moderate': return '🟡';
            default: return '🟢';
        }
    };

    const formatTimeAgo = (timestamp) => {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        if (seconds < 60) return `${seconds} seconds ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    };

    return (
        <div className="incoming-patients">
            <div className="section-header">
                <h2>🏥 Active Cases</h2>
                <span className="patient-count">{incomingPatients.length}</span>
            </div>

            {incomingPatients.length === 0 ? (
                <div className="no-patients">
                    <div className="no-patients-icon">👍</div>
                    <p>No active patient cases at the moment</p>
                    <span className="status-badge">Waiting</span>
                </div>
            ) : (
                <div className="patients-list">
                    {incomingPatients.map((patient) => (
                        <div
                            key={patient.requestId}
                            className="patient-alert"
                            style={{ borderLeftColor: getSeverityColor(patient.severity) }}
                        >
                            <div className="patient-severity">
                                <span className="severity-icon">{getSeverityIcon(patient.severity)}</span>
                                <span className="severity-label">{patient.severity.toUpperCase()}</span>
                            </div>

                            <div className="patient-details">
                                <h3 className="patient-condition">
                                    {patient.condition.split('-').map(word =>
                                        word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')}
                                </h3>

                                <div className="patient-info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Patient</span>
                                        <span className="info-value">
                                            {patient.patientAge}y {patient.patientGender === 'male' ? '♂️' : '♀️'}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">ETA</span>
                                        <span className="info-value eta">{patient.eta} min</span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">Ambulance</span>
                                        <span className="info-value">{patient.ambulanceId}</span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">Paramedic</span>
                                        <span className="info-value">{patient.paramedicName}</span>
                                    </div>
                                </div>

                                <div className="required-section">
                                    <strong>Required:</strong>
                                    <div className="required-tags">
                                        <span className="tag">{patient.requiredSpecialty}</span>
                                        {patient.severity === 'critical' || patient.severity === 'severe' ? (
                                            <span className="tag urgent">ICU Bed</span>
                                        ) : null}
                                    </div>
                                </div>

                                {patient.vitals && (
                                    <div className="vitals-section">
                                        <strong>Vitals:</strong>
                                        <div className="vitals-grid">
                                            {patient.vitals.heartRate && (
                                                <span>❤️ {patient.vitals.heartRate} bpm</span>
                                            )}
                                            {patient.vitals.bloodPressure && (
                                                <span>🩺 {patient.vitals.bloodPressure}</span>
                                            )}
                                            {patient.vitals.oxygenLevel && (
                                                <span>💨 {patient.vitals.oxygenLevel}% O₂</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="patient-actions">
                                    <a
                                        href={`tel:${patient.paramedicPhone}`}
                                        className="btn-call"
                                    >
                                        📞 Call Paramedic
                                    </a>
                                    <button className="btn-prepare">
                                        ✅ Prepare Resources
                                    </button>
                                </div>

                                <div className="patient-timestamp">
                                    Request received: {formatTimeAgo(patient.timestamp)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default IncomingPatients;