import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // ensure email is lowercase to match backend storage
            const response = await loginAPI({ email: email.toLowerCase(), password });
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            login(user);

            // if paramedic but no ambulance assigned, warn them
            if (user.role === 'paramedic' && !user.ambulanceId) {
                alert('⚠️ Your account does not have an assigned ambulance. The system will automatically allocate one when you initiate a request.');
            }

            // Redirect based on role
            if (user.role === 'paramedic') {
                navigate('/ambulance');
            } else if (user.role === 'hospital-staff') {
                navigate('/hospital');
            } else if (user.role === 'control-room' || user.role === 'admin') {
                navigate('/control-room');
            } else {
                navigate('/');
            }
        } catch (error) {
                    console.error('Login error:', error);
                // if server responded with structured message, use it
                if (error.response) {
                    setError(error.response.data?.error || 'Login failed. Please try again.');
                } else if (error.request) {
                    // no response received
                    setError('Unable to reach authentication server. Check backend is running.');
                } else {
                    setError('Login failed. Please try again.');
                }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>MediRoute</h1>
                    <p>Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="paramedic@demo.com"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Demo accounts available:</p>
                    <ul>
                        <li><strong>Paramedic:</strong> paramedic@demo.com / password123</li>
                        <li><strong>Hospital staff:</strong> hospital@demo.com / password123</li>
                        <li><strong>Control room:</strong> control@demo.com / password123</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Login;