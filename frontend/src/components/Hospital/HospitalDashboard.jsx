import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CapacityManager from './CapacityManager';
import IncomingPatients from './IncomingPatients';
import './Hospital.css';

function HospitalDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('incoming');

    if (!user) {
        return <div className="loading">Loading user profile...</div>;
    }

    return (
        <div className="hospital-dashboard">
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>🏥 Hospital Dashboard</h1>
                    <div className="user-info">
                        <span className="user-name">{user.name}</span>
                        <span className="user-role">{user.role}</span>
                    </div>
                </div>

                <div className="dashboard-tabs">
                    <button
                        className={`tab-button ${activeTab === 'incoming' ? 'active' : ''}`}
                        onClick={() => setActiveTab('incoming')}
                    >
                        🚨 Incoming Patients
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'capacity' ? 'active' : ''}`}
                        onClick={() => setActiveTab('capacity')}
                    >
                        📊 Manage Capacity
                    </button>
                </div>
            </div>

            <div className="dashboard-content">
                {activeTab === 'incoming' ? (
                    <IncomingPatients />
                ) : (
                    <CapacityManager />
                )}
            </div>
        </div>
    );
}

export default HospitalDashboard;