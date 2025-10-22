
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnalyticsData } from '../../types';
import { fantasyApi } from '../../services/fantasyApi';

import { TrendingUpIcon, RepeatIcon, StarIcon } from '../../components/Icons';
import UserMetricsReport from '../../components/admin/reports/UserMetricsReport';
import EngagementReport from '../../components/admin/reports/EngagementReport';
import PerformanceReport from '../../components/admin/reports/PerformanceReport';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

type ReportView = 'users' | 'engagement' | 'performance';

const Reports: React.FC = () => {
  const [activeView, setActiveView] = useState<ReportView>('users');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await fantasyApi.getAnalyticsData();
      setAnalyticsData(data);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const renderContent = () => {
    if (!analyticsData) return null;

    switch (activeView) {
      case 'users':
        return <UserMetricsReport data={analyticsData} />;
      case 'engagement':
        return <EngagementReport data={analyticsData} />;
      case 'performance':
        return <PerformanceReport data={analyticsData} />;
      default:
        return null;
    }
  };

  const getTabClass = (viewName: ReportView) =>
    `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      activeView === viewName
        ? 'bg-brand-primary-accent text-white'
        : 'text-slate-300 hover:bg-brand-secondary hover:text-white'
    }`;
    
  if (isLoading) {
    return <div>Loading reports...</div>;
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
      <h1 className="text-4xl font-bold text-white mb-8">Reports & Analytics</h1>
      
      <div className="mb-6 flex flex-wrap gap-2 p-2 bg-brand-secondary/50 rounded-lg border border-brand-border">
        <button onClick={() => setActiveView('users')} className={getTabClass('users')}>
          <TrendingUpIcon className="w-5 h-5" /> User Metrics
        </button>
        <button onClick={() => setActiveView('engagement')} className={getTabClass('engagement')}>
          <RepeatIcon className="w-5 h-5" /> Engagement
        </button>
        <button onClick={() => setActiveView('performance')} className={getTabClass('performance')}>
          <StarIcon className="w-5 h-5" /> Performance
        </button>
      </div>

      <div className="bg-brand-secondary/50 rounded-lg border border-brand-border p-6 min-h-[500px]">
        {renderContent()}
      </div>
    </motion.div>
  );
};

export default Reports;
