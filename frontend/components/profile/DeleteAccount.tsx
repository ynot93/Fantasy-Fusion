import React from 'react';
import { motion } from 'framer-motion';

const DeleteAccount: React.FC = () => (
     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <h2 className="text-2xl font-bold text-red-500 mb-4">Delete Account</h2>
        
        <div className="space-y-4 text-slate-300 max-w-xl">
             <p>Are you sure you want to delete your account? This action is irreversible and will result in the following:</p>
            <ul className="list-disc list-inside space-y-2 pl-4 text-sm text-slate-400">
                <li>All of your personal information, including your profile and settings, will be permanently removed.</li>
                <li>You will be removed from all leagues you have joined.</li>
                <li>Any remaining balance in your account will be forfeited.</li>
                <li>You will no longer be able to log in or access any part of the service.</li>
            </ul>
             <p>If you are certain you wish to proceed, please click the button below.</p>
        </div>

        <div className="mt-8">
            <motion.button
                whileHover={{ scale: 1.05, backgroundColor: '#EF4444' }}
                whileTap={{ scale: 0.95 }}
                className="bg-red-600/80 text-white font-bold py-3 px-6 rounded-lg shadow-lg border border-red-500"
                onClick={() => alert("This is a destructive action! A confirmation modal would be shown here in a real app.")}
            >
                Permanently Delete My Account
            </motion.button>
        </div>

     </motion.div>
);

export default DeleteAccount;
