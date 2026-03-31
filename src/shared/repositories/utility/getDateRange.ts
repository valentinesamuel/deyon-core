export const getDateRange = (filter: string): { startDate: Date | null; endDate: Date | null } => {
  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0),
  );
  const endOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );

  switch (filter) {
    case 'today':
      return { startDate: startOfToday, endDate: endOfToday };

    case 'yesterday': {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);
      const endOfYesterday = new Date(endOfToday);
      endOfYesterday.setUTCDate(endOfYesterday.getUTCDate() - 1);
      return { startDate: startOfYesterday, endDate: endOfYesterday };
    }

    case 'last7days': {
      const start7DaysAgo = new Date(startOfToday);
      start7DaysAgo.setUTCDate(start7DaysAgo.getUTCDate() - 6);
      return { startDate: start7DaysAgo, endDate: endOfToday };
    }

    case 'last30days': {
      const start30DaysAgo = new Date(startOfToday);
      start30DaysAgo.setUTCDate(start30DaysAgo.getUTCDate() - 29);
      return { startDate: start30DaysAgo, endDate: endOfToday };
    }

    case 'last90days': {
      const start90DaysAgo = new Date(startOfToday);
      start90DaysAgo.setUTCDate(start90DaysAgo.getUTCDate() - 89);
      return { startDate: start90DaysAgo, endDate: endOfToday };
    }

    case 'weekToDate': {
      const weekStart = new Date(startOfToday);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
      return { startDate: weekStart, endDate: endOfToday };
    }

    case 'monthToDate': {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      return { startDate: monthStart, endDate: endOfToday };
    }

    default:
      return { startDate: null, endDate: null };
  }
};
