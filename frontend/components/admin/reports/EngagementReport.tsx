
import React from 'react';
import { motion } from 'framer-motion';
import { AnalyticsData } from '../../../types';

const getRetentionColor = (value: number) => {
    if (value > 60) return 'bg-green-500/50';
    if (value > 40) return 'bg-green-500/30';
    if (value > 20) return 'bg-yellow-500/30';
    if (value > 0) return 'bg-yellow-500/20';
    return 'bg-brand-dark/20';
};

const EngagementReport: React.FC<{ data: AnalyticsData }> = ({ data }) => {
    const { retentionCohorts } = data;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl font-bold text-white mb-6">Retention & Churn</h2>
            <div className="overflow-x-auto bg-brand-secondary rounded-lg border border-brand-border p-4">
                <table className="min-w-full text-sm text-center">
                    <thead className="text-slate-400">
                        <tr>
                            <th className="py-2 px-3 text-left">Cohort</th>
                            <th className="py-2 px-3">New Users</th>
                            {Array.from({ length: retentionCohorts[0]?.weeklyRetention.length || 0 }).map((_, i) => (
                                <th key={i} className="py-2 px-3">Week {i}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-white">
                        {retentionCohorts.map((cohort, index) => (
                            <tr key={index} className="border-t border-brand-border/50">
                                <td className="py-3 px-3 text-left font-medium">{cohort.cohort}</td>
                                <td className="py-3 px-3 text-slate-300">{cohort.newUsers}</td>
                                {cohort.weeklyRetention.map((value, weekIndex) => (
                                    <td key={weekIndex} className="py-1 px-1">
                                        {value !== null ? (
                                            <div className={`p-2 rounded-md ${getRetentionColor(value)}`}>
                                                {value.toFixed(1)}%
                                            </div>
                                        ) : (
                                            <div className="p-2 text-slate-600">-</div>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">Retention shows the percentage of users from a cohort who returned in subsequent weeks.</p>
        </motion.div>
    );
};

export default EngagementReport;
