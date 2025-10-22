import React from 'react';
import { motion, Variants } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  index: number;
}

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

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, index }) => {
  return (
    <motion.div 
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="bg-brand-secondary/50 rounded-xl p-6 border border-brand-border flex items-center gap-6"
    >
      <div className={`rounded-full w-16 h-16 flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-slate-400 text-sm">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
};

export default StatCard;
