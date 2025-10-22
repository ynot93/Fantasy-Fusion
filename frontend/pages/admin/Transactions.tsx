import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AdminTransaction, FraudAlert, Transaction } from '../../types';
import { fantasyApi } from '../../services/fantasyApi';
import StatCard from '../../components/admin/StatCard';
import { DollarSignIcon, AlertTriangleIcon, TrophyIcon, UsersIcon } from '../../components/Icons';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const statusColors: Record<Transaction['status'], string> = {
  Completed: 'bg-green-500/20 text-green-300',
  Pending: 'bg-yellow-500/20 text-yellow-300',
  Failed: 'bg-red-500/20 text-red-300',
};

const typeColors: Record<Transaction['type'], string> = {
    deposit: 'text-green-400',
    winnings: 'text-green-400',
    withdrawal: 'text-red-400',
    entry_fee: 'text-red-400'
};

const alertLevelColors: Record<FraudAlert['level'], string> = {
    High: 'border-red-500/50 bg-red-500/10 text-red-300',
    Medium: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300',
    Low: 'border-blue-500/50 bg-blue-500/10 text-blue-300',
}

const Transactions: React.FC = () => {
    const [summary, setSummary] = useState({ totalRevenue: 0, feesCollected: 0, totalPayouts: 0, netProfit: 0 });
    const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
    const [alerts, setAlerts] = useState<FraudAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<Transaction['status'] | 'All'>('All');
    const [typeFilter, setTypeFilter] = useState<Transaction['type'] | 'All'>('All');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [summaryData, transactionsData] = await Promise.all([
                fantasyApi.getFinancialSummary(),
                fantasyApi.getAdminTransactions(),
            ]);
            setSummary({
                totalRevenue: summaryData.totalRevenue,
                feesCollected: summaryData.feesCollected,
                totalPayouts: summaryData.totalPayouts,
                netProfit: summaryData.netProfit
            });
            setAlerts(summaryData.fraudAlerts);
            setTransactions(transactionsData);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const filteredTransactions = useMemo(() => {
        return transactions
            .filter(tx => statusFilter === 'All' || tx.status === statusFilter)
            .filter(tx => typeFilter === 'All' || tx.type === typeFilter)
            .filter(tx =>
                tx.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [transactions, searchTerm, statusFilter, typeFilter]);
    
    const statCards = [
        { title: 'Total Revenue (Entries)', value: `Ksh ${summary.totalRevenue.toLocaleString()}`, icon: DollarSignIcon, color: 'bg-green-500/20 text-green-400' },
        { title: 'Platform Fees Collected', value: `Ksh ${summary.feesCollected.toLocaleString()}`, icon: UsersIcon, color: 'bg-yellow-500/20 text-yellow-400' },
        { title: 'Total Payouts (Winnings)', value: `Ksh ${summary.totalPayouts.toLocaleString()}`, icon: TrophyIcon, color: 'bg-brand-secondary-accent/20 text-brand-secondary-accent' },
        { title: 'Net Profit', value: `Ksh ${summary.netProfit.toLocaleString()}`, icon: DollarSignIcon, color: 'bg-brand-primary-accent/20 text-brand-primary-accent' },
    ];

    if (isLoading) {
        return <div>Loading financial data...</div>;
    }

    return (
        <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl font-bold text-white mb-8">Transactions & Finance</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold text-white mb-4">All Transactions</h2>
                    <div className="mb-6 flex flex-wrap gap-4 items-center bg-brand-secondary/50 p-4 rounded-lg border border-brand-border">
                        <input
                          type="text"
                          placeholder="Search user or description..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="flex-grow bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent"
                        />
                         <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent">
                            <option value="All">All Types</option>
                            <option value="deposit">Deposit</option>
                            <option value="withdrawal">Withdrawal</option>
                            <option value="entry_fee">Entry Fee</option>
                            <option value="winnings">Winnings</option>
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent">
                            <option value="All">All Statuses</option>
                            <option value="Completed">Completed</option>
                            <option value="Pending">Pending</option>
                            <option value="Failed">Failed</option>
                        </select>
                    </div>

                     <div className="overflow-x-auto bg-brand-secondary/50 rounded-lg border border-brand-border">
                        <table className="min-w-full divide-y divide-brand-border">
                            <thead className="bg-brand-dark/30">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">User</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white hidden md:table-cell">Details</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Amount</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {filteredTransactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                                            <div className="flex items-center">
                                                <img className="h-9 w-9 rounded-full" src={tx.user.avatarUrl} alt="" />
                                                <div className="ml-3">
                                                    <div className="font-medium text-white">{tx.user.name}</div>
                                                    <div className="text-slate-400 text-xs">{new Date(tx.date).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-3 py-4 text-sm">
                                            <div className="text-slate-200">{tx.description}</div>
                                            <div className="text-slate-400 capitalize">{tx.type.replace('_', ' ')}</div>
                                        </td>
                                        <td className={`px-3 py-4 text-sm font-bold ${typeColors[tx.type]}`}>
                                            Ksh {tx.amount.toLocaleString()}
                                        </td>
                                        <td className="px-3 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[tx.status]}`}>{tx.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="lg:col-span-1">
                     <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3"><AlertTriangleIcon className="w-6 h-6 text-yellow-400"/>Fraud Detection</h2>
                     <div className="space-y-4">
                        {alerts.map(alert => (
                            <div key={alert.id} className={`p-4 rounded-lg border ${alertLevelColors[alert.level]}`}>
                                <div className="flex justify-between items-start">
                                    <p className="text-sm font-bold">{alert.level} Risk</p>
                                    <p className="text-xs text-slate-400">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                                </div>
                                <p className="text-sm text-slate-200 mt-1">{alert.message}</p>
                            </div>
                        ))}
                     </div>
                </div>
            </div>

        </motion.div>
    );
};

export default Transactions;