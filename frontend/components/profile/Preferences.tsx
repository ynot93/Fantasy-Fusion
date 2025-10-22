import React from 'react';
import { motion } from 'framer-motion';
import { BellIcon, MoonIcon } from '../Icons';

const Toggle: React.FC<{ label: string; description: string; enabled: boolean; }> = ({ label, description, enabled }) => (
    <div className="flex items-center justify-between">
        <span className="flex-grow flex flex-col">
            <span className="text-sm font-medium text-slate-200">{label}</span>
            <span className="text-sm text-slate-400">{description}</span>
        </span>
        <button 
            type="button" 
            className={`${enabled ? 'bg-brand-primary-accent' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary-accent focus:ring-offset-2 focus:ring-offset-brand-dark`} 
            role="switch" 
            aria-checked={enabled}
        >
            <span 
                aria-hidden="true" 
                className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            ></span>
        </button>
    </div>
);

const Preferences: React.FC = () => (
     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-8">
         <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center"><BellIcon className="w-6 h-6 mr-3"/> Notifications</h2>
            <div className="mt-4 space-y-4 max-w-md">
                <Toggle label="Email Notifications" description="Receive updates and reminders via email." enabled={true} />
                <Toggle label="SMS Notifications" description="Get important alerts on your phone." enabled={false} />
                <Toggle label="Push Notifications" description="Browser notifications for real-time events." enabled={true} />
            </div>
         </div>
         
         <div className="border-t border-brand-border my-6"></div>

         <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center"><MoonIcon className="w-6 h-6 mr-3"/> Theme</h2>
            <div className="mt-4 space-y-4 max-w-md">
                 <Toggle label="Dark Mode" description="Reduce eye strain in low-light conditions." enabled={true} />
            </div>
         </div>
     </motion.div>
);

export default Preferences;
