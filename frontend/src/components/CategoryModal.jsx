import React, { useState } from 'react';
import { X, Plus, Trash2, Tag } from 'lucide-react';

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#6366F1', '#EC4899', '#EF4444', '#14B8A6'
];

const CategoryModal = ({ isOpen, onClose, categories, onCreateCategory, onDeleteCategory }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    onCreateCategory({ name: name.trim(), color });
    setName('');
    setColor('#3B82F6');
    setError('');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card glass-panel">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-accent" />
            <h3>Manage Categories</h3>
          </div>
          <button onClick={onClose} className="btn-icon text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <div className="category-list">
          <label className="section-label">Your Categories</label>
          <div className="category-chips">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="category-chip"
                style={{ borderLeftColor: cat.color }}
              >
                <span className="color-dot" style={{ backgroundColor: cat.color }} />
                <span className="category-name">{cat.name}</span>
                {cat.isDefault ? (
                  <span className="default-badge">default</span>
                ) : (
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="btn-icon-xs text-danger"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form border-t pt-4">
          <label className="section-label">Create Custom Category</label>
          <div className="form-row">
            <div className="form-group flex-1">
              <input
                type="text"
                placeholder="Category Name (e.g. Deep Work)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="color-input"
                title="Choose Category Color"
              />
            </div>

            <button type="submit" className="btn btn-primary">
              <Plus className="w-4 h-4 mr-1" />
              <span>Add</span>
            </button>
          </div>

          <div className="preset-colors">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`preset-swatch ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
