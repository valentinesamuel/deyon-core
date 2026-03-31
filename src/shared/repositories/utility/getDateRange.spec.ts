import { getDateRange } from './getDateRange';

describe('getDateRange', () => {
  it('should return today start (UTC 00:00) and end (UTC 23:59:59)', () => {
    const { startDate, endDate } = getDateRange('today');
    expect(startDate).not.toBeNull();
    expect(endDate).not.toBeNull();
    expect(startDate!.getUTCHours()).toBe(0);
    expect(endDate!.getUTCHours()).toBe(23);
    expect(endDate!.getUTCMinutes()).toBe(59);
  });

  it('should return yesterday with endDate one day before today', () => {
    const { startDate, endDate } = getDateRange('yesterday');
    const today = new Date();
    const todayUtcDate = today.getUTCDate();
    // yesterday's end is the same calendar day as yesterday, not today
    const yesterday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1),
    );
    expect(startDate).not.toBeNull();
    expect(endDate!.getUTCDate()).toBe(yesterday.getUTCDate());
    expect(startDate!.getUTCDate()).toBe(yesterday.getUTCDate());
    void todayUtcDate;
  });

  it('should return last7days starting 6 days ago', () => {
    const { startDate, endDate } = getDateRange('last7days');
    expect(startDate).not.toBeNull();
    expect(endDate).not.toBeNull();
    const diffMs = endDate!.getTime() - startDate!.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it('should return last30days starting 29 days ago', () => {
    const { startDate, endDate } = getDateRange('last30days');
    expect(startDate).not.toBeNull();
    const diffMs = endDate!.getTime() - startDate!.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it('should return last90days starting 89 days ago', () => {
    const { startDate, endDate } = getDateRange('last90days');
    expect(startDate).not.toBeNull();
    const diffMs = endDate!.getTime() - startDate!.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
  });

  it('should return weekToDate starting on Sunday of this week', () => {
    const { startDate, endDate } = getDateRange('weekToDate');
    expect(startDate).not.toBeNull();
    expect(endDate).not.toBeNull();
    expect(startDate!.getUTCDay()).toBe(0); // Sunday
  });

  it('should return monthToDate starting on 1st of current month', () => {
    const { startDate, endDate } = getDateRange('monthToDate');
    expect(startDate).not.toBeNull();
    expect(endDate).not.toBeNull();
    expect(startDate!.getUTCDate()).toBe(1);
    expect(startDate!.getUTCHours()).toBe(0);
  });

  it('should return null dates for unknown filter', () => {
    const { startDate, endDate } = getDateRange('unknown');
    expect(startDate).toBeNull();
    expect(endDate).toBeNull();
  });
});
