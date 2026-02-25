import './Auth.css';

function Register() {
    // registration is disabled in demo; show information instead
    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Registration Disabled</h1>
                    <p>The demo uses pre‑seeded accounts. Please use one of the credentials shown on the login page.</p>
                </div>
                <div className="auth-footer">
                    <p>Available demo users:</p>
                    <ul>
                        <li><strong>Paramedic:</strong> paramedic@demo.com / password123</li>
                        <li><strong>Hospital staff:</strong> hospital@demo.com / password123</li>
                        <li><strong>Control room:</strong> control@demo.com / password123</li>
                        <li><strong>Admin:</strong> admin@demo.com / password123</li>
                    </ul>
                    <p><a href="/login">Back to login</a></p>
                </div>
            </div>
        </div>
    );
}

export default Register;
