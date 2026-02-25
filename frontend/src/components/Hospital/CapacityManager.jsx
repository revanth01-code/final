import { useState, useEffect } from 'react';
import { getHospital, updateHospital } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import './Hospital.css';

function CapacityManager() {
    const { user } = useAuth();
    const { socket } = useSocket();

    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const [capacity, setCapacity] = useState({
        availableBeds: 0,
        availableICU: 0,
        availableVentilators: 0
    });

    const [specialists, setSpecialists] = useState([]);
    const [currentLoad, setCurrentLoad] = useState('moderate');

    useEffect(() => {
        fetchHospitalData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchHospitalData = async () => {
        try {
            const response = await getHospital(user.hospitalId);
            const hospitalData = response.data.data;

            setHospital(hospitalData);
            setCapacity({
                availableBeds: hospitalData.capacity.availableBeds,
                availableICU: hospitalData.capacity.availableICU,
                availableVentilators: hospitalData.capacity.availableVentilators
            });
            setSpecialists(hospitalData.specialists);
            setCurrentLoad(hospitalData.currentLoad);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching hospital:', error);
            alert('Failed to load hospital data');
            setLoading(false);
        }
    };

    const handleCapacityChange = (field, value) => {
        setCapacity(prev => ({
            ...prev,
            [field]: parseInt(value)
        }));
    };

    const toggleSpecialist = (index) => {
        const updated = [...specialists];
        updated[index].available = !updated[index].available;
        setSpecialists(updated);
    };

    const handleUpdate = async () => {
        setUpdating(true);

        try {
            const updateData = {
                'capacity.availableBeds': capacity.availableBeds,
                'capacity.availableICU': capacity.availableICU,
                'capacity.availableVentilators': capacity.availableVentilators,
                specialists: specialists,
                currentLoad: currentLoad
            };

            const response = await updateHospital(user.hospitalId, updateData);

            // Emit Socket.io event
            if (socket && socket.connected) {
                socket.emit('update-capacity', {
                    hospitalId: user.hospitalId,
                    hospitalName: hospital.name,
                    availableBeds: capacity.availableBeds,
                    availableICU: capacity.availableICU,
                    timestamp: new Date()
                });
            }

            alert('Capacity updated successfully!');
            setHospital(response.data.data);
        } catch (error) {
            console.error('Error updating capacity:', error);
            alert('Failed to update capacity');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading hospital data...</div>;
    }

    if (!hospital) {
        return <div className="error-message">Failed to load hospital data. Please refresh to try again.</div>;
    }

    return (
        <div className="capacity-manager">
            <div className="manager-header">
                <h2>{hospital.name}</h2>
                <p className="last-updated">
                    Last Updated: {new Date(hospital.lastUpdated).toLocaleString()}
                </p>
            </div>

            <div className="capacity-section">
                <h3>Bed Capacity</h3>

                <div className="capacity-control">
                    <div className="control-header">
                        <label>General Beds</label>
                        <span className="capacity-display">
                            {capacity.availableBeds} / {hospital.capacity.totalBeds}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={hospital.capacity.totalBeds}
                        value={capacity.availableBeds}
                        onChange={(e) => handleCapacityChange('availableBeds', e.target.value)}
                    />
                    <div className="capacity-bar">
                        <div
                            className="capacity-fill"
                            style={{
                                width: `${(capacity.availableBeds / hospital.capacity.totalBeds) * 100}%`,
                                background: capacity.availableBeds < 10 ? '#ef4444' : '#10b981'
                            }}
                        />
                    </div>
                </div>

                <div className="capacity-control">
                    <div className="control-header">
                        <label>ICU Beds</label>
                        <span className="capacity-display">
                            {capacity.availableICU} / {hospital.capacity.totalICU}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={hospital.capacity.totalICU}
                        value={capacity.availableICU}
                        onChange={(e) => handleCapacityChange('availableICU', e.target.value)}
                    />
                    <div className="capacity-bar">
                        <div
                            className="capacity-fill"
                            style={{
                                width: `${(capacity.availableICU / hospital.capacity.totalICU) * 100}%`,
                                background: capacity.availableICU < 2 ? '#ef4444' : '#10b981'
                            }}
                        />
                    </div>
                </div>

                <div className="capacity-control">
                    <div className="control-header">
                        <label>Ventilators</label>
                        <span className="capacity-display">
                            {capacity.availableVentilators} / {hospital.capacity.totalVentilators}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={hospital.capacity.totalVentilators}
                        value={capacity.availableVentilators}
                        onChange={(e) => handleCapacityChange('availableVentilators', e.target.value)}
                    />
                    <div className="capacity-bar">
                        <div
                            className="capacity-fill"
                            style={{
                                width: `${(capacity.availableVentilators / hospital.capacity.totalVentilators) * 100}%`,
                                background: capacity.availableVentilators < 1 ? '#ef4444' : '#10b981'
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="specialists-section">
                <h3>Specialists On Duty</h3>
                <div className="specialists-grid">
                    {specialists.map((specialist, index) => (
                        <div
                            key={index}
                            className={`specialist-card ${specialist.available ? 'available' : 'unavailable'}`}
                            onClick={() => toggleSpecialist(index)}
                        >
                            <div className="specialist-icon">
                                {specialist.available ? '✅' : '❌'}
                            </div>
                            <div className="specialist-name">
                                {specialist.specialty.charAt(0).toUpperCase() + specialist.specialty.slice(1)}
                            </div>
                            <div className="specialist-status">
                                {specialist.available ? 'Available' : 'Off Duty'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="load-section">
                <h3>Current Hospital Load</h3>
                <div className="load-buttons">
                    {['low', 'moderate', 'high', 'critical'].map(load => (
                        <button
                            key={load}
                            className={`load-button ${currentLoad === load ? 'active' : ''}`}
                            onClick={() => setCurrentLoad(load)}
                        >
                            {load.charAt(0).toUpperCase() + load.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={handleUpdate}
                className="btn-update"
                disabled={updating}
            >
                {updating ? 'Updating...' : '💾 Save & Broadcast Changes'}
            </button>
        </div>
    );
}

export default CapacityManager;