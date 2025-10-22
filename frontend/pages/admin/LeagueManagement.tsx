import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AdminLeague, LeagueStatus } from '../../types';
import { fantasyApi } from '../../services/fantasyApi';
import { ChevronRightIcon } from '../../components/Icons';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const statusColors: Record<LeagueStatus, string> = {
  Open: 'bg-green-500/20 text-green-300',
  Ongoing: 'bg-blue-500/20 text-blue-300',
  Completed: 'bg-slate-500/20 text-slate-400',
  'Payouts Approved': 'bg-yellow-500/20 text-yellow-300',
};

const LeagueManagement: React.FC = () => {
    const [leagues, setLeagues] = useState<AdminLeague[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLeagues = async () => {
            setIsLoading(true);
            const data = await fantasyApi.getAdminLeagues();
            setLeagues(data);
            setIsLoading(false);
        };
        fetchLeagues();
    }, []);

    if (isLoading) {
        return <div>Loading leagues...</div>;
    }

    return (
        <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl font-bold text-white mb-8">League Management</h1>
            <div className="overflow-x-auto bg-brand-secondary/50 rounded-lg border border-brand-border">
                <table className="min-w-full divide-y divide-brand-border">
                    <thead className="bg-brand-dark/30">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">League Name</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Creator</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white hidden sm:table-cell">Entry Fee</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Participants</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white hidden md:table-cell">Prize Pool</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">View</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {leagues.map(league => (
                            <tr key={league.id} onClick={() => navigate(`/admin/leagues/${league.id}`)} className="hover:bg-brand-dark/50 cursor-pointer transition-colors">
                                <td className="py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{league.name}</td>
                                <td className="px-3 py-4 text-sm text-slate-300">{league.creator.name}</td>
                                <td className="hidden sm:table-cell px-3 py-4 text-sm text-slate-300">Ksh {league.entryFee}</td>
                                <td className="px-3 py-4 text-sm text-slate-300">{league.participants}/{league.maxParticipants}</td>
                                <td className="hidden md:table-cell px-3 py-4 text-sm text-slate-300">Ksh {league.prizePool.toLocaleString()}</td>
                                <td className="px-3 py-4 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[league.status]}`}>{league.status}</span>
                                </td>
                                <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    <ChevronRightIcon className="w-5 h-5 text-slate-400" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};

export default LeagueManagement;
