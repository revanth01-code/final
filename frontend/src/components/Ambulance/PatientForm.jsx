import { useState, useEffect } from 'react';
import './Ambulance.css';

function PatientForm({ onSubmit }) {
    const [formData, setFormData] = useState({
        age: '',
        gender: 'male',
        condition: 'cardiac-arrest',
        severity: 'critical',
        requiredSpecialty: 'cardiology',
        vitals: {
            heartRate: '',
            bloodPressure: '',
            oxygenLevel: ''
        },
        consciousness: 'alert'
    });

    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getLocation();
    }, []);

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    setLocationError('');
                },
                (error) => {
                    console.error('Location error:', error);
                    setLocationError('Please enable location services');
                }
            );
        } else {
            setLocationError('Geolocation not supported by browser');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name.startsWith('vitals.')) {
            const vitalKey = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                vitals: {
                    ...prev.vitals,
                    [vitalKey]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!location) {
            alert('Location is required. Please enable location services.');
            return;
        }

        setLoading(true);

        try {
            await onSubmit({
                patientCondition: formData,
                patientLocation: location
            });
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to get recommendations');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="patient-form">
            <h2>🚑 Emergency Patient Information</h2>

            {locationError && (
                <div className="error-message">
                    {locationError}
                    <button onClick={getLocation} className="btn-link">Retry</button>
                </div>
            )}

            {location && (
                <div className="location-badge">
                    📍 Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-row">
                    <div className="form-group">
                        <label>Age *</label>
                        <input
                            type="number"
                            name="age"
                            value={formData.age}
                            onChange={handleChange}
                            min="0"
                            max="120"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Gender *</label>
                        <select name="gender" value={formData.gender} onChange={handleChange} required>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Emergency Type *</label>
                    <select name="condition" value={formData.condition} onChange={handleChange} required>
                        <option value="cardiac-arrest">Cardiac Arrest</option>
                        <option value="stroke">Stroke</option>
                        <option value="trauma">Trauma/Accident</option>
                        <option value="respiratory">Respiratory Distress</option>
                        <option value="poisoning">Poisoning</option>
                        <option value="burns">Burns</option>
                        <option value="seizure">Seizure</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Severity *</label>
                    <select name="severity" value={formData.severity} onChange={handleChange} required>
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                        <option value="critical">Critical / Life-threatening</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Required Specialty *</label>
                    <select name="requiredSpecialty" value={formData.requiredSpecialty} onChange={handleChange} required>
                        <option value="cardiology">Cardiology</option>
                        <option value="neurology">Neurology</option>
                        <option value="orthopedics">Orthopedics</option>
                        <option value="general-surgery">General Surgery</option>
                        <option value="trauma">Trauma</option>
                        <option value="pediatrics">Pediatrics</option>
                    </select>
                </div>

                <div className="vitals-section">
                    <h3>Vitals (Optional)</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Heart Rate (bpm)</label>
                            <input
                                type="number"
                                name="vitals.heartRate"
                                value={formData.vitals.heartRate}
                                onChange={handleChange}
                                placeholder="75"
                            />
                        </div>

                        <div className="form-group">
                            <label>Blood Pressure</label>
                            <input
                                type="text"
                                name="vitals.bloodPressure"
                                value={formData.vitals.bloodPressure}
                                onChange={handleChange}
                                placeholder="120/80"
                            />
                        </div>

                        <div className="form-group">
                            <label>Oxygen Level (%)</label>
                            <input
                                type="number"
                                name="vitals.oxygenLevel"
                                value={formData.vitals.oxygenLevel}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                placeholder="98"
                            />
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>Consciousness *</label>
                    <select name="consciousness" value={formData.consciousness} onChange={handleChange} required>
                        <option value="alert">Alert</option>
                        <option value="drowsy">Drowsy</option>
                        <option value="semi-conscious">Semi-conscious</option>
                        <option value="unconscious">Unconscious</option>
                    </select>
                </div>

                <button type="submit" className="btn-primary btn-large" disabled={loading || !location}>
                    {loading ? 'Finding Hospitals...' : '🏥 Find Best Hospital'}
                </button>
            </form>
        </div>
    );
}

export default PatientForm;