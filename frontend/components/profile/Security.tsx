import React from 'react';
import { motion } from 'framer-motion';

const Security: React.FC = () => (
     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-8">
        <div>
            <h2 className="text-2xl font-bold text-white mb-6">Security</h2>
        
            {/* Change Password */}
            <div className="space-y-4">
                 <h3 className="text-lg font-semibold text-slate-100">Change Password</h3>
                <div>
                    <label htmlFor="current-password"className="block text-sm font-medium text-slate-300">Current Password</label>
                    <input type="password" name="current-password" id="current-password" className="mt-1 block w-full max-w-sm bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent" />
                </div>
                <div>
                    <label htmlFor="new-password"className="block text-sm font-medium text-slate-300">New Password</label>
                    <input type="password" name="new-password" id="new-password" className="mt-1 block w-full max-w-sm bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent" />
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-brand-secondary text-white font-semibold py-2 px-4 rounded-md text-sm border border-brand-border">Update Password</motion.button>
            </div>
        </div>

        <div className="border-t border-brand-border my-6"></div>

        {/* Two-Factor Authentication */}
        <div>
            <h3 className="text-lg font-semibold text-slate-100">Two-Factor Authentication</h3>
            <div className="mt-4 flex items-center justify-between max-w-sm">
                <span className="flex-grow flex flex-col">
                    <span className="text-sm font-medium text-slate-200">Enable 2FA</span>
                    <span className="text-sm text-slate-400">Add an extra layer of security to your account.</span>
                </span>
                <button type="button" className="bg-slate-600 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary-accent focus:ring-offset-2 focus:ring-offset-brand-dark" role="switch" aria-checked="false">
                    <span aria-hidden="true" className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                </button>
            </div>
        </div>
        
        <div className="border-t border-brand-border my-6"></div>

        {/* Login History */}
        <div>
            <h3 className="text-lg font-semibold text-slate-100">Login History</h3>
             <ul className="mt-4 space-y-3 text-sm max-w-md">
                <li className="flex justify-between items-center text-slate-300"><span>Chrome on macOS - Nairobi, KE</span> <span>Today</span></li>
                <li className="flex justify-between items-center text-slate-400"><span>Safari on iOS - Nairobi, KE</span> <span>Yesterday</span></li>
                <li className="flex justify-between items-center text-slate-500"><span>Chrome on Windows - Nakuru, KE</span> <span>2 days ago</span></li>
            </ul>
        </div>
     </motion.div>
);

export default Security;
