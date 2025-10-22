import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const GameDataManagement: React.FC = () => {
  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
      <h1 className="text-4xl font-bold text-white mb-8">Game Data Management</h1>
      <div className="bg-brand-secondary/50 rounded-lg border border-brand-border p-8 text-center">
        <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
        <p className="text-slate-400 mt-2">
          This module will provide tools to manage the player database, add/edit player stats, sync with the FPL API, manage fixtures, and configure the scoring system.
        </p>
      </div>
    </motion.div>
  );
};

export default GameDataManagement;
