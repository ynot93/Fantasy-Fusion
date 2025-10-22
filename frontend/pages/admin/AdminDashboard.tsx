import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fantasyApi } from '../../services/fantasyApi';
import StatCard from '../../components/admin/StatCard';
import { UsersIcon, TrophyIcon, DollarSignIcon, CheckCircleIcon, BellIcon } from '../../components/Icons';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({ totalUsers: 0, activeLeagues: 0, totalRevenue: 0, totalTransfers: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            const data = await fantasyApi.getAdminDashboardStats();
            setStats(data);
            setIsLoading(false);
        }
        fetchStats();
    }, []);

    const statCards = [
        { title: 'Total Users', value: stats.totalUsers, icon: UsersIcon, color: 'bg-brand-primary-accent/20 text-brand-primary-accent' },
        { title: 'Active Leagues', value: stats.activeLeagues, icon: TrophyIcon, color: 'bg-brand-secondary-accent/20 text-brand-secondary-accent' },
        { title: 'Total Revenue', value: `Ksh ${stats.totalRevenue.toLocaleString()}`, icon: DollarSignIcon, color: 'bg-green-500/20 text-green-400' },
        { title: 'Total Transfers', value: stats.totalTransfers, icon: CheckCircleIcon, color: 'bg-yellow-500/20 text-yellow-400' },
    ];

    const notifications = [
        { id: 1, type: 'error', message: 'FPL API sync failed at 04:30 AM. Retrying in 15 minutes.' },
        { id: 2, type: 'warning', message: 'Suspicious login activity detected for user: john.doe@email.com.' },
        { id: 3, type: 'info', message: 'Database backup completed successfully.' },
    ];

    const getNotificationColor = (type: string) => {
        switch(type) {
            case 'error': return 'border-red-500/50 bg-red-500/10';
            case 'warning': return 'border-yellow-500/50 bg-yellow-500/10';
            default: return 'border-blue-500/50 bg-blue-500/10';
        }
    }
    
    if (isLoading) {
        return <div>Loading admin dashboard...</div>
    }

    return (
        <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl font-bold text-white mb-8">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {statCards.map((card, index) => (
                    <StatCard 
                        key={card.title}
                        index={index}
                        title={card.title}
                        value={card.value}
                        icon={card.icon}
                        color={card.color}
                    />
                ))}
            </div>
            
            <div className="mt-10">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center"><BellIcon className="w-6 h-6 mr-3"/>System Notifications</h2>
                <div className="space-y-4">
                    {notifications.map(note => (
                        <div key={note.id} className={`p-4 rounded-lg border ${getNotificationColor(note.type)}`}>
                            <p className="text-sm text-slate-200">{note.message}</p>
                        </div>
                    ))}
                </div>
            </div>

        </motion.div>
    );
};

export default AdminDashboard;
