import React from 'react';
import { motion } from 'framer-motion';
import { GoogleIcon, TwitterIcon } from '../Icons'; // Assuming you have other social icons

const ConnectedAccounts: React.FC = () => (
     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-8">
        <div>
            <h2 className="text-2xl font-bold text-white mb-6">Connected Accounts</h2>
            <p className="text-sm text-slate-400 max-w-xl mb-6">Connect your social accounts for a seamless login experience. We will never post on your behalf without your permission.</p>
            
            <div className="space-y-4 max-w-md">
                <div className="flex items-center justify-between p-4 bg-brand-dark/50 rounded-lg border border-brand-border">
                    <div className="flex items-center gap-4">
                        <GoogleIcon className="w-6 h-6"/>
                        <span className="font-semibold text-white">Google</span>
                    </div>
                    <span className="text-sm text-green-400">Connected</span>
                </div>
                 <div className="flex items-center justify-between p-4 bg-brand-dark/50 rounded-lg border border-brand-border">
                    <div className="flex items-center gap-4">
                        <TwitterIcon className="w-6 h-6 text-sky-500"/>
                        <span className="font-semibold text-white">Twitter / X</span>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-brand-secondary text-white font-semibold py-1 px-3 rounded-md text-sm border border-brand-border">Connect</motion.button>
                </div>
                 {/* Add Facebook, Apple etc. here */}
            </div>
        </div>

        <div className="border-t border-brand-border my-6"></div>

        <div>
            <h3 className="text-lg font-semibold text-slate-100">Webhooks</h3>
            <p className="text-sm text-slate-400 max-w-xl mt-2">Configure webhooks to receive real-time updates for league events and payouts to your own services.</p>
             <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-4 bg-brand-secondary text-white font-semibold py-2 px-4 rounded-md text-sm border border-brand-border">Manage Webhooks</motion.button>
        </div>
     </motion.div>
);

export default ConnectedAccounts;
