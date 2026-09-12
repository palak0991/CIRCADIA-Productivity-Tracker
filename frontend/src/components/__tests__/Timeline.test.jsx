import React from 'react';
import { render, screen } from '@testing-library/react';
import Timeline from '../Timeline';

describe('Timeline Component', () => {
  const midnightTask = {
    id: 101,
    title: 'Overnight Shift',
    startDateTime: '2026-09-12T10:00:00.000Z',
    endDateTime: '2026-09-13T10:00:00.000Z',
    status: 'PLANNED',
    category: { id: 1, name: 'Work', color: '#8B5CF6' }
  };

  it('renders "cont. tomorrow" badge when midnight-crossing task is viewed on Day 1', () => {
    render(
      <Timeline
        selectedDate="2026-09-12"
        tasks={[midnightTask]}
        onEditTask={() => {}}
      />
    );

    expect(screen.getByText('Overnight Shift')).toBeInTheDocument();
    expect(screen.getByText('cont. tomorrow')).toBeInTheDocument();
  });

  it('renders "cont. yesterday" badge when midnight-crossing task is viewed on Day 2', () => {
    render(
      <Timeline
        selectedDate="2026-09-13"
        tasks={[midnightTask]}
        onEditTask={() => {}}
      />
    );

    expect(screen.getByText('Overnight Shift')).toBeInTheDocument();
    expect(screen.getByText('cont. yesterday')).toBeInTheDocument();
  });
});
