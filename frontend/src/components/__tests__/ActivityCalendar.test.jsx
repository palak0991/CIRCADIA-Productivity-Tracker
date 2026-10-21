import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ActivityCalendar from '../ActivityCalendar';
import analyticsService from '../../services/analyticsService';

vi.mock('../../services/analyticsService');

describe('ActivityCalendar Component', () => {
  const mockCalendarData = {
    startDate: '2025-10-22',
    endDate: '2026-10-21',
    totalActiveDays: 14,
    currentStreak: 3,
    longestStreak: 7,
    totalTasksCompleted: 25,
    totalWorkMinutes: 1800, // 30h
    dailyContributions: [
      {
        date: '2026-10-21',
        count: 2,
        workMinutes: 120,
        level: 3,
        tasks: [
          {
            id: 1,
            title: 'Algorithm Practice',
            categoryName: 'Coding',
            categoryColor: '#22C55E',
            durationMinutes: 60
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and then displays streaks and metrics', async () => {
    analyticsService.getActivityCalendar.mockResolvedValueOnce(mockCalendarData);

    render(<ActivityCalendar timezone="UTC" />);

    expect(screen.getByText(/Live Activity & Work History/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('3 days')).toBeInTheDocument(); // current streak
      expect(screen.getByText('7 days')).toBeInTheDocument(); // longest streak
      expect(screen.getByText('25')).toBeInTheDocument();     // total tasks completed
      expect(screen.getByText('30h')).toBeInTheDocument();    // 1800m = 30h
    });
  });

  it('allows clicking an activity cell to inspect the day details', async () => {
    analyticsService.getActivityCalendar.mockResolvedValueOnce(mockCalendarData);
    const handleSelectDate = vi.fn();

    const { container } = render(
      <ActivityCalendar timezone="UTC" onSelectDate={handleSelectDate} />
    );

    await waitFor(() => {
      expect(screen.getByText('3 days')).toBeInTheDocument();
    });

    const activeCell = container.querySelector('.activity-level-3');
    expect(activeCell).toBeInTheDocument();

    fireEvent.click(activeCell);

    // Selected day detail card should show
    expect(screen.getByText('Algorithm Practice')).toBeInTheDocument();
    expect(screen.getByText(/Open in 24h Visualizer/i)).toBeInTheDocument();

    const jumpButton = screen.getByRole('button', { name: /Open in 24h Visualizer/i });
    fireEvent.click(jumpButton);
    expect(handleSelectDate).toHaveBeenCalledWith('2026-10-21');
  });
});
