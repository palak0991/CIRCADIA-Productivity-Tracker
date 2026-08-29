import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, LogOut, Tag, User } from 'lucide-react';

const Navbar = ({ onOpenCategories }) => {
  const { user, logout } = useAuth();

  return (
    <header className="glass-panel nav-header">
      <div className="nav-brand">
        <div className="brand-logo">
          <Clock className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="brand-title">24 Hour Visualizer</h1>
          <p className="brand-subtitle">Visual Day Planner & Productivity Tracker</p>
        </div>
      </div>

      <div className="nav-actions">
        {user && (
          <>
            <button
              onClick={onOpenCategories}
              className="btn btn-secondary btn-sm"
              title="Manage Categories"
            >
              <Tag className="w-4 h-4" />
              <span>Categories</span>
            </button>

            <div className="user-badge" title={`Logged in as ${user.email}`}>
              <User className="w-4 h-4 text-accent" />
              <span className="user-name">{user.username}</span>
            </div>

            <button
              onClick={logout}
              className="btn btn-danger btn-sm"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
