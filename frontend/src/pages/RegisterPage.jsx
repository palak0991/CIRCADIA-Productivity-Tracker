import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, UserPlus, Lock, User, Mail, Globe } from 'lucide-react';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({ username, email, password, timezone });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="brand-icon-large">
            <Clock className="w-10 h-10 text-accent" />
          </div>
          <h2>Create Account</h2>
          <p>Start planning your 24-hour day visually</p>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <div className="input-icon-wrapper">
              <User className="input-icon" />
              <input
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input with-icon"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <div className="input-icon-wrapper">
              <Mail className="input-icon" />
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input with-icon"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-icon-wrapper">
              <Lock className="input-icon" />
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input with-icon"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Preferred Timezone</label>
            <div className="input-icon-wrapper">
              <Globe className="input-icon" />
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="form-select with-icon"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
                <option value="America/New_York">EST/EDT (America/New_York)</option>
                <option value="Europe/London">GMT/BST (Europe/London)</option>
                <option value="Asia/Tokyo">JST (Asia/Tokyo)</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-full">
            <UserPlus className="w-4 h-4 mr-2" />
            <span>{loading ? 'Creating Account...' : 'Get Started'}</span>
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account? </span>
          <Link to="/login" className="auth-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
