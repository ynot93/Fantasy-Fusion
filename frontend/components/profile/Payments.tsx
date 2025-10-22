import React from 'react';
import { motion } from 'framer-motion';

const Payments: React.FC = () => {
    const transactions = [
        { id: 1, date: '2024-08-26', description: 'Gameweek 2 Winnings', amount: '+ Ksh 1,800', status: 'Completed', statusColor: 'text-green-400' },
        { id: 2, date: '2024-08-25', description: 'Withdrawal to M-Pesa', amount: '- Ksh 2,000', status: 'Completed', statusColor: 'text-green-400' },
        { id: 3, date: '2024-08-20', description: 'League Entry: High Rollers', amount: '- Ksh 500', status: 'Completed', statusColor: 'text-green-400' },
        { id: 4, date: '2024-08-19', description: 'Gameweek 1 Winnings', amount: '+ Ksh 900', status: 'Completed', statusColor: 'text-green-400' },
        { id: 5, date: '2024-08-18', description: 'Deposit from Card', amount: '+ Ksh 1,000', status: 'Completed', statusColor: 'text-green-400' },
    ];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-6">Payments</h2>
            
                <div className="bg-brand-dark/50 p-6 rounded-lg border border-brand-border">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-slate-400">Available Balance</p>
                            <p className="text-3xl font-bold text-white">Ksh 1,200.00</p>
                        </div>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-gradient-to-r from-brand-primary-accent to-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg">
                            Withdraw
                        </motion.button>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Transaction History</h3>
                <div className="flow-root">
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full align-middle">
                            <table className="min-w-full divide-y divide-brand-border">
                                <thead>
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0">Date</th>
                                        <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-white">Description</th>
                                        <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-white">Amount</th>
                                        <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-white">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {transactions.map((tx) => (
                                    <tr key={tx.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-slate-300 sm:pl-0">{tx.date}</td>
                                        <td className="whitespace-nowrap py-4 px-3 text-sm text-slate-300">{tx.description}</td>
                                        <td className={`whitespace-nowrap py-4 px-3 text-sm font-medium ${tx.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{tx.amount}</td>
                                        <td className="whitespace-nowrap py-4 px-3 text-sm"><span className={tx.statusColor}>{tx.status}</span></td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default Payments;
