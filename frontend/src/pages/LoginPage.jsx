import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, LogIn, Lock, User } from 'lucide-react';

const LoginPage = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ usernameOrEmail, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username/email or password');
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
          <h2>Welcome Back</h2>
          <p>Sign in to your 24 Hour Visualizer account</p>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username or Email</label>
            <div className="input-icon-wrapper">
              <User className="input-icon" />
              <input
                type="text"
                placeholder="Enter username or email"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input with-icon"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-full">
            <LogIn className="w-4 h-4 mr-2" />
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="auth-footer">
          <span>Don't have an account? </span>
          <Link to="/register" className="auth-link">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
