import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import './Common.css';

function Navbar() {
    const { user, logout } = useAuth();
    const { isConnected } = useSocket();

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <div className="navbar-brand">
                    <h1>🚑 MediRoute</h1>
                    <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? '● Connected' : '● Disconnected'}
                    </span>
                </div>

                <div className="navbar-user">
                    <div className="user-details">
                        <span className="user-name">{user.name}</span>
                        <span className="user-role">{user.role}</span>
                    </div>
                    <button onClick={logout} className="btn-logout">
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;