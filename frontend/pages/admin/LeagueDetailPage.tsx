import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLeague, Member, LeagueStatus } from '../../types';
import { fantasyApi } from '../../services/fantasyApi';
import { TrophyIcon, UsersIcon, DollarSignIcon, StopCircleIcon, RefreshCwIcon, CheckCircleIcon } from '../../components/Icons';

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

const LeagueDetailPage: React.FC = () => {
    const { leagueId } = useParams<{ leagueId: string }>();
    const navigate = useNavigate();
    const [league, setLeague] = useState<AdminLeague | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLeagueDetails = useCallback(async () => {
        if (!leagueId) return;
        // Don't set loading to true on refetch
        const data = await fantasyApi.getAdminLeagueDetails(leagueId);
        if (data) {
            setLeague(data);
        } else {
            navigate('/admin/leagues');
        }
        setIsLoading(false);
    }, [leagueId, navigate]);

    useEffect(() => {
        setIsLoading(true);
        fetchLeagueDetails();
    }, [fetchLeagueDetails]);

    const handleCloseLeague = async () => {
        if (!league || !window.confirm('Are you sure you want to close this league early? This will mark it as "Completed".')) return;
        const result = await fantasyApi.updateLeagueStatus(league.id, 'Completed');
        if (result.success) {
            alert('League closed successfully.');
            fetchLeagueDetails();
        } else {
            alert('Failed to close league.');
        }
    };

    const handleRecalculatePoints = async () => {
        if (!league || !window.confirm('Are you sure you want to recalculate points for all participants? This will assign random new scores.')) return;
        const result = await fantasyApi.recalculateLeaguePoints(league.id);
        if (result.success) {
            alert('Points recalculated successfully.');
            fetchLeagueDetails();
        } else {
            alert('Failed to recalculate points.');
        }
    };

    const handleApprovePayouts = async () => {
        if (!league || !window.confirm('Are you sure you want to approve payouts for this league?')) return;
        const result = await fantasyApi.updateLeagueStatus(league.id, 'Payouts Approved');
        if (result.success) {
            alert('Payouts approved.');
            fetchLeagueDetails();
        } else {
            alert('Failed to approve payouts.');
        }
    };


    if (isLoading || !league) {
        return <div className="text-center p-10">Loading league details...</div>;
    }

    return (
        <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-4 mb-8">
              <h1 className="text-4xl font-bold text-white truncate">{league.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[league.status]}`}>
                  {league.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <InfoCard icon={DollarSignIcon} title="Entry Fee" value={`Ksh ${league.entryFee}`} color="text-green-400" />
                <InfoCard icon={TrophyIcon} title="Prize Pool" value={`Ksh ${league.prizePool.toLocaleString()}`} color="text-yellow-400" />
                <InfoCard icon={UsersIcon} title="Creator" value={league.creator.name} color="text-brand-primary-accent" />
                <InfoCard icon={UsersIcon} title="Participants" value={`${league.participants}/${league.maxParticipants}`} color="text-brand-secondary-accent" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold text-white mb-4">Participant Leaderboard</h2>
                    <LeaderboardTable members={league.members} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-brand-secondary/50 rounded-lg border border-brand-border p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Admin Actions</h3>
                        <div className="space-y-3">
                            <button onClick={handleCloseLeague} className="w-full flex items-center justify-center gap-2 bg-brand-secondary hover:bg-brand-dark transition-colors border border-brand-border text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={league.status === 'Completed' || league.status === 'Payouts Approved'}>
                               <StopCircleIcon className="w-5 h-5" /> Close League Early
                            </button>
                            <button onClick={handleRecalculatePoints} className="w-full flex items-center justify-center gap-2 bg-brand-secondary hover:bg-brand-dark transition-colors border border-brand-border text-white font-semibold py-2 px-4 rounded-lg">
                               <RefreshCwIcon className="w-5 h-5" /> Recalculate Points
                            </button>
                            <button onClick={handleApprovePayouts} className="w-full flex items-center justify-center gap-2 bg-green-600/80 hover:bg-green-700 transition-colors border border-green-500 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={league.status !== 'Completed'}>
                               <CheckCircleIcon className="w-5 h-5" /> Approve Payouts
                            </button>
                        </div>
                    </div>
                     <div className="bg-brand-secondary/50 rounded-lg border border-brand-border p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Prize Distribution</h3>
                        <ul className="space-y-2 text-sm text-slate-300">
                           <li className="flex justify-between"><span>1st Place (50%)</span> <span className="font-semibold text-white">Ksh {(league.prizePool * 0.5).toLocaleString()}</span></li>
                           <li className="flex justify-between"><span>2nd Place (30%)</span> <span className="font-semibold text-white">Ksh {(league.prizePool * 0.3).toLocaleString()}</span></li>
                           <li className="flex justify-between"><span>3rd Place (20%)</span> <span className="font-semibold text-white">Ksh {(league.prizePool * 0.2).toLocaleString()}</span></li>
                        </ul>
                    </div>
                </div>
            </div>

        </motion.div>
    );
};

const InfoCard: React.FC<{ icon: React.ElementType; title: string; value: string; color: string; }> = ({ icon: Icon, title, value, color }) => (
    <div className="bg-brand-secondary/50 rounded-lg border border-brand-border p-5 flex items-center gap-4">
        <div className={`p-3 rounded-full bg-brand-dark ${color}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const LeaderboardTable: React.FC<{ members: Member[] }> = ({ members }) => (
    <div className="overflow-x-auto bg-brand-secondary/50 rounded-lg border border-brand-border">
        <table className="min-w-full divide-y divide-brand-border">
          <thead className="bg-brand-dark/30">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Rank</th>
              <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-white">User</th>
              <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-white">Team</th>
              <th scope="col" className="py-3.5 px-3 text-right text-sm font-semibold text-white">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            <AnimatePresence>
            {members.map((member, index) => (
                <motion.tr 
                    key={member.id} 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{index + 1}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-200">{member.name}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-400">{member.teamName}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-white text-right">{member.points}</td>
                </motion.tr>
            ))}
            </AnimatePresence>
          </tbody>
        </table>
    </div>
);

export default LeagueDetailPage;
