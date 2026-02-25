import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getActiveTracked } from '../services/api';

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    
    // Real-time state for the control room
    const [trackedAmbulances, setTrackedAmbulances] = useState([]);
    const [alerts, setAlerts] = useState([]);
    
    const { user } = useAuth();

    // Effect to initialize socket and listeners
    useEffect(() => {
        if (!user) return; // Don't connect if no user

        const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            auth: { token: localStorage.getItem('token') }
        });

        setSocket(newSocket);

        newSocket.on('connect', async () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);
            // Announce user connection to join appropriate rooms on backend
            newSocket.emit('user-connected', user);
            
            // If user is in control room, fetch initial state
            if (user.role === 'control-room' || user.role === 'admin') {
                try {
                    const res = await getActiveTracked();
                    setTrackedAmbulances(res.data.trackedAmbulances || []);
                } catch (error) {
                    console.error("Failed to fetch initial active ambulances:", error);
                }
            }
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        // Listener for a new trip starting
        newSocket.on('trip_started', (newAmbulance) => {
            console.log('Socket event: trip_started', newAmbulance);
            setTrackedAmbulances(prev => {
                // Avoid duplicates
                if (prev.find(a => a.requestId === newAmbulance.requestId)) return prev;
                return [...prev, newAmbulance];
            });
        });
        
        // Listener for when a trip is completed
        newSocket.on('trip_completed', ({ requestId }) => {
            console.log('Socket event: trip_completed', requestId);
            setTrackedAmbulances(prev => prev.filter(amb => amb.requestId !== requestId));
        });

        // Listener for location updates
        newSocket.on('ambulance_location_update', (updatedAmbulance) => {
            setTrackedAmbulances(prev => 
                prev.map(amb => 
                    amb.requestId === updatedAmbulance.requestId ? updatedAmbulance : amb
                )
            );
        });

        // Listener for new deviation alerts
        newSocket.on('deviation_alert', (newAlert) => {
            console.log('Socket event: deviation_alert', newAlert);
             setAlerts(prev => {
                // Avoid duplicates
                if (prev.find(a => a.id === newAlert.id)) return prev;
                return [newAlert, ...prev];
            });
        });

        // Listener for alert updates (acknowledged, resolved)
        newSocket.on('alert_updated', (updatedAlert) => {
            console.log('Socket event: alert_updated', updatedAlert);
            setAlerts(prev => 
                prev.map(a => a.id === updatedAlert.id ? updatedAlert : a)
            );
        });

        return () => {
            newSocket.close();
        };
    }, [user]);

    const value = {
        socket,
        isConnected,
        trackedAmbulances,
        alerts,
        // We can add methods here later to emit events if needed
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};