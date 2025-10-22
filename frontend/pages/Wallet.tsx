
import React, { useState, useEffect } from 'react';
// FIX: Import `Variants` from `framer-motion` to correctly type animation variants.
import { motion, Variants } from 'framer-motion';
import { fantasyApi } from '../services/fantasyApi';
import { Transaction } from '../types';
import { DollarSignIcon, WalletIcon, HourglassIcon, CheckCircleIcon, PlusIcon } from '../components/Icons';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

// FIX: Explicitly type `cardVariants` with `Variants` to resolve type incompatibility.
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
};

const TransactionRow: React.FC<{ transaction: Transaction; index: number }> = ({ transaction, index }) => {
  const { date, description, amount, status } = transaction;
  const isCredit = amount > 0;
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const statusInfo = {
    Completed: { icon: CheckCircleIcon, color: 'text-green-400' },
    Pending: { icon: HourglassIcon, color: 'text-yellow-400' },
    Failed: { icon: CheckCircleIcon, color: 'text-red-400' }, // using CheckCircle as a placeholder for failed icon
  };
  
  const StatusIcon = statusInfo[status].icon;

  return (
    <motion.tr 
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.05 }}
      className="border-b border-brand-border last:border-b-0"
    >
      <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
        <div className="font-medium text-white">{description}</div>
        <div className="text-slate-400">{formattedDate}</div>
      </td>
      <td className={`whitespace-nowrap px-3 py-4 text-sm font-medium ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
        {isCredit ? '+' : '-'} Ksh {Math.abs(amount).toLocaleString()}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <div className={`inline-flex items-center gap-2 ${statusInfo[status].color}`}>
            <StatusIcon className="w-4 h-4" />
            <span>{status}</span>
        </div>
      </td>
    </motion.tr>
  );
};

const Wallet: React.FC = () => {
  const [balance, setBalance] = useState(0);
  const [pendingWinnings, setPendingWinnings] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [walletDetails, transactionHistory] = await Promise.all([
        fantasyApi.getWalletDetails(),
        fantasyApi.getTransactions(),
      ]);
      setBalance(walletDetails.currentBalance);
      setPendingWinnings(walletDetails.pendingWinnings);
      setTransactions(transactionHistory);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <div className="text-center p-10">Loading wallet details...</div>;
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
      <h1 className="text-4xl font-bold text-white mb-8">My Wallet</h1>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible" className="bg-brand-secondary/50 rounded-xl p-6 border border-brand-border">
          <div className="flex items-center gap-4 mb-4">
            <WalletIcon className="w-6 h-6 text-brand-primary-accent" />
            <h2 className="text-lg font-semibold text-slate-300">Current Balance</h2>
          </div>
          <p className="text-4xl font-bold text-white">Ksh {balance.toLocaleString()}</p>
          <p className="text-sm text-slate-400 mt-1">Available for joining leagues and withdrawals.</p>
        </motion.div>
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible" className="bg-brand-secondary/50 rounded-xl p-6 border border-brand-border">
          <div className="flex items-center gap-4 mb-4">
            <HourglassIcon className="w-6 h-6 text-brand-secondary-accent" />
            <h2 className="text-lg font-semibold text-slate-300">Pending Winnings</h2>
          </div>
          <p className="text-4xl font-bold text-white">Ksh {pendingWinnings.toLocaleString()}</p>
          <p className="text-sm text-slate-400 mt-1">From ongoing or recently finished gameweeks.</p>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg">
            <PlusIcon className="w-5 h-5"/> Add Funds
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 bg-brand-secondary text-white font-bold py-3 px-6 rounded-lg border border-brand-border">
            <DollarSignIcon className="w-5 h-5"/> Withdraw
        </motion.button>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Transaction History</h2>
        <div className="bg-brand-secondary/50 rounded-lg border border-brand-border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-brand-dark/30">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Details</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Amount</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-brand-secondary/50">
                        {transactions.map((tx, index) => (
                           <TransactionRow key={tx.id} transaction={tx} index={index} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Wallet;