import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskModal from '../TaskModal';

describe('TaskModal Component', () => {
  const mockCategories = [
    { id: 1, name: 'Work', color: '#8B5CF6' }
  ];

  it('blocks submitting when end time is before start time and displays error message', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    const { container } = render(
      <TaskModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        categories={mockCategories}
        selectedDate="2026-09-12"
      />
    );

    // Enter title
    const titleInput = screen.getByPlaceholderText(/e\.g\. Study Data Structures/i);
    fireEvent.change(titleInput, { target: { value: 'Invalid Task' } });

    // Set start time and an earlier end time
    const datetimeInputs = container.querySelectorAll('input[type="datetime-local"]');
    const startInput = datetimeInputs[0];
    const endInput = datetimeInputs[1];

    fireEvent.change(startInput, { target: { value: '2026-09-12T10:00' } });
    fireEvent.change(endInput, { target: { value: '2026-09-12T09:00' } });

    // Click Create Task submit button
    const submitButton = screen.getByRole('button', { name: /create task/i });
    fireEvent.click(submitButton);

    // Verify onSave was NOT called
    expect(handleSave).not.toHaveBeenCalled();

    // Verify error message is displayed
    expect(screen.getByText('End time must be strictly after start time')).toBeInTheDocument();
  });
});
