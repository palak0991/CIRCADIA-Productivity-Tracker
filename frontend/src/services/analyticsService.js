import api from './api';

const analyticsService = {
  /**
   * Fetch day analytics from backend.
   * @param {string} dateStr  - YYYY-MM-DD
   * @param {string} timezone - e.g. "Asia/Kolkata"
   */
  getDayAnalytics: (dateStr, timezone = 'UTC') =>
    api.get('/analytics/day', { params: { date: dateStr, timezone } }).then(r => r.data),

  /**
   * Fetch comprehensive Python-computed productivity analytics across a date range.
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate   - YYYY-MM-DD
   * @param {string} timezone  - e.g. "Asia/Kolkata"
   */
  getProductivityAnalytics: (startDate, endDate, timezone = 'UTC') =>
    api.get('/analytics/productivity', { params: { startDate, endDate, timezone } }).then(r => r.data),

  /**
   * Trigger on-demand missed-task detection for the authenticated user.
   */
  detectMissed: () =>
    api.post('/analytics/detect-missed').then(r => r.data),

  /**
   * Fetch 365-day LeetCode-style activity contribution calendar and streaks.
   * @param {number} days     - default 365
   * @param {string} timezone - e.g. "Asia/Kolkata" or "UTC"
   */
  getActivityCalendar: (days = 365, timezone = 'UTC') =>
    api.get('/analytics/activity-calendar', { params: { days, timezone } }).then(r => r.data),
};


export default analyticsService;
