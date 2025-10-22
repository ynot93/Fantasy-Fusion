
import React from 'react';
import { motion } from 'framer-motion';
import { AnalyticsData } from '../../../types';
import { UsersIcon, BarChartIcon } from '../../Icons';

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType; }> = ({ title, value, icon: Icon }) => (
    <div className="bg-brand-secondary p-6 rounded-lg border border-brand-border">
        <div className="flex items-center gap-4">
            <Icon className="w-6 h-6 text-slate-400" />
            <div>
                <p className="text-sm text-slate-400">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

const UserMetricsReport: React.FC<{ data: AnalyticsData }> = ({ data }) => {
    const maxUserValue = Math.max(...data.userTrends.map(t => t.value), 1);
    
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl font-bold text-white mb-6">User Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <StatCard title="Total Users" value="10,450" icon={UsersIcon} />
                <StatCard title="New Sign-ups (Last 30d)" value="+1,204" icon={BarChartIcon} />
            </div>

            <h3 className="text-xl font-bold text-white mb-4">Active Users Trend</h3>
            <div className="bg-brand-secondary p-6 rounded-lg border border-brand-border">
                <div className="flex justify-around items-end h-64 gap-8">
                    {data.userTrends.map(trend => (
                        <div key={trend.period} className="flex flex-col items-center flex-1">
                            <motion.div
                                className="w-full bg-gradient-to-t from-brand-primary-accent to-blue-500 rounded-t-md"
                                initial={{ height: 0 }}
                                animate={{ height: `${(trend.value / maxUserValue) * 100}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                            <p className="mt-2 text-sm font-semibold text-white">{trend.value}</p>
                            <p className="text-xs text-slate-400">{trend.period}</p>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default UserMetricsReport;
