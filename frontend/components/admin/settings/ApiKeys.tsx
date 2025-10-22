
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { fantasyApi } from '../../../services/fantasyApi';
import { MyApiKeys } from '../../../types';
import { SaveIcon } from '../../Icons';

const ApiKeys: React.FC = () => {
    const [apiKeys, setApiKeys] = useState<MyApiKeys | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const settings = await fantasyApi.getSystemSettings();
        setApiKeys(settings.apiKeys);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKeys) return;
        
        const result = await fantasyApi.updateSystemSettings({ apiKeys });
        if (result.success) {
            alert('API Keys updated successfully!');
        } else {
            alert('Failed to update API Keys.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!apiKeys) return;
        setApiKeys({
            ...apiKeys,
            [e.target.name]: e.target.value,
        });
    };

    if (isLoading || !apiKeys) {
        return <div className="text-center p-4">Loading API settings...</div>
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl font-bold text-white mb-6">API Keys Management</h2>
            <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
                <div>
                    <label htmlFor="fpl" className="block text-sm font-medium text-slate-300">FPL API Key</label>
                    <input type="text" name="fpl" id="fpl" value={apiKeys.fpl} onChange={handleChange} className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="stripePublic" className="block text-sm font-medium text-slate-300">Stripe Public Key</label>
                        <input type="text" name="stripePublic" id="stripePublic" value={apiKeys.stripePublic} onChange={handleChange} className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent" />
                    </div>
                    <div>
                        <label htmlFor="stripeSecret" className="block text-sm font-medium text-slate-300">Stripe Secret Key</label>
                        <input type="password" name="stripeSecret" id="stripeSecret" value={apiKeys.stripeSecret} onChange={handleChange} className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="mpesaKey" className="block text-sm font-medium text-slate-300">M-Pesa Consumer Key</label>
                        <input type="text" name="mpesaKey" id="mpesaKey" value={apiKeys.mpesaKey} onChange={handleChange} className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent" />
                    </div>
                    <div>
                        <label htmlFor="mpesaSecret" className="block text-sm font-medium text-slate-300">M-Pesa Consumer Secret</label>
                        <input type="password" name="mpesaSecret" id="mpesaSecret" value={apiKeys.mpesaSecret} onChange={handleChange} className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent" />
                    </div>
                </div>
                <div className="pt-2">
                    <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 bg-gradient-to-r from-brand-primary-accent to-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg">
                       <SaveIcon className="w-5 h-5" /> Save API Keys
                    </motion.button>
                </div>
            </form>
        </motion.div>
    );
};

export default ApiKeys;
