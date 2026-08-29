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
   * Trigger on-demand missed-task detection for the authenticated user.
   */
  detectMissed: () =>
    api.post('/analytics/detect-missed').then(r => r.data),
};

export default analyticsService;
