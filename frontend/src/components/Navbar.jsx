import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, LogOut, Tag, User, BarChart2, CalendarDays, Flame } from 'lucide-react';

const Navbar = ({ onOpenCategories, activeTab = 'planner', onTabChange }) => {
  const { user, logout } = useAuth();

  return (
    <header className="glass-panel nav-header">
      <div className="nav-brand">
        <div className="brand-logo">
          <Clock className="w-6 h-6 text-pink-400" />
        </div>
        <div>
          <h1 className="brand-title">Dayloop</h1>
          <p className="brand-subtitle">Visual Day Planner & Productivity Intelligence</p>
        </div>
      </div>

      {user && onTabChange && (
        <div className="nav-tabs-group">
          <button
            onClick={() => onTabChange('planner')}
            className={`nav-tab-btn ${activeTab === 'planner' ? 'active' : ''}`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Day Planner</span>
          </button>
          <button
            onClick={() => onTabChange('analytics')}
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Productivity Analytics</span>
          </button>
          <button
            onClick={() => onTabChange('activity')}
            className={`nav-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          >
            <Flame className="w-4 h-4 text-emerald-400" />
            <span>Activity History</span>
          </button>
        </div>
      )}


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
              <User className="w-4 h-4 text-pink-400" />
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
