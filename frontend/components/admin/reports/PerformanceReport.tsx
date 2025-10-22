
import React from 'react';
import { motion } from 'framer-motion';
import { AnalyticsData } from '../../../types';

const PerformanceReport: React.FC<{ data: AnalyticsData }> = ({ data }) => {
    const { topLeagues, topPlayers } = data;
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl font-bold text-white mb-6">Performance</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Top Leagues by Participants</h3>
                    <div className="bg-brand-secondary rounded-lg border border-brand-border overflow-hidden">
                        <table className="min-w-full divide-y divide-brand-border">
                            <thead className="bg-brand-dark/30">
                                <tr>
                                    <th className="py-3 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">League</th>
                                    <th className="px-3 py-3 text-right text-sm font-semibold text-white">Participants</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {topLeagues.map((league) => (
                                    <tr key={league.id}>
                                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{league.name}</td>
                                        <td className="px-3 py-4 text-sm text-slate-300 text-right">{league.participants}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Top Players by Winnings</h3>
                     <div className="bg-brand-secondary rounded-lg border border-brand-border overflow-hidden">
                        <table className="min-w-full divide-y divide-brand-border">
                            <thead className="bg-brand-dark/30">
                                <tr>
                                    <th className="py-3 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Player</th>
                                    <th className="px-3 py-3 text-right text-sm font-semibold text-white">Total Winnings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {topPlayers.map((player) => (
                                    <tr key={player.id}>
                                        <td className="py-3 pl-4 pr-3 text-sm sm:pl-6">
                                            <div className="flex items-center">
                                                <img className="h-9 w-9 rounded-full" src={player.avatarUrl} alt="" />
                                                <div className="ml-3">
                                                    <div className="font-medium text-white">{player.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-sm text-green-400 font-semibold text-right">Ksh {player.totalWinnings.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PerformanceReport;
