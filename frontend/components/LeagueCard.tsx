
import React from 'react';
import { motion } from 'framer-motion';
import { League } from '../types';
import { UsersIcon, TrophyIcon } from './Icons';

interface LeagueCardProps {
  league: League;
  onJoin: (leagueId: string) => void;
  isJoined: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const LeagueCard: React.FC<LeagueCardProps> = ({ league, onJoin, isJoined }) => {
  const members = league.members.length;
  const maxMembers = league.maxMembers;
  const isFull = members >= maxMembers;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      className="bg-brand-secondary/70 backdrop-blur-md rounded-xl shadow-lg border border-brand-border overflow-hidden flex flex-col"
    >
      <div className="p-6 flex-grow">
        <h3 className="text-xl font-bold text-white truncate">{league.name}</h3>
        <p className="text-sm text-brand-secondary-accent font-semibold mt-1">Ksh {league.entryFee} Entry</p>

        <div className="mt-4 space-y-3 text-slate-300">
          <div className="flex items-center">
            <TrophyIcon className="w-5 h-5 mr-3 text-yellow-400" />
            <span>Prize Pool: <span className="font-bold text-white">Ksh {league.prizePool.toLocaleString()}</span></span>
          </div>
          <div className="flex items-center">
            <UsersIcon className="w-5 h-5 mr-3 text-brand-primary-accent" />
            <span>Members: <span className="font-bold text-white">{members} / {maxMembers}</span></span>
          </div>
        </div>

        <div className="w-full bg-slate-700 rounded-full h-2.5 mt-4">
          <motion.div
            className="bg-gradient-to-r from-pink-500 to-purple-500 h-2.5 rounded-full"
            style={{ width: `${(members / maxMembers) * 100}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${(members / maxMembers) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
      
      <div className="p-4 bg-black/20">
        <motion.button
          onClick={() => onJoin(league.id)}
          disabled={isFull || isJoined}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-full font-bold py-2 px-4 rounded-lg transition-all duration-300 ${
            isFull 
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
              : isJoined
              ? 'bg-green-600 text-white cursor-not-allowed'
              : 'bg-gradient-to-r from-brand-primary-accent to-blue-600 hover:from-blue-600 hover:to-brand-primary-accent text-white'
          }`}
        >
          {isFull ? 'Full' : isJoined ? 'Joined' : 'Join League'}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default LeagueCard;
