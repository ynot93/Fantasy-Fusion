
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { fantasyApi } from '../../../services/fantasyApi';
import { BrandingSettings } from '../../../types';
import { SaveIcon } from '../../Icons';

const ThemeBranding: React.FC = () => {
    const [branding, setBranding] = useState<BrandingSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const settings = await fantasyApi.getSystemSettings();
        setBranding(settings.branding);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!branding) return;
        
        const result = await fantasyApi.updateSystemSettings({ branding });
        if (result.success) {
            alert('Branding updated successfully!');
        } else {
            alert('Failed to update branding.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!branding) return;
        setBranding({
            ...branding,
            [e.target.name]: e.target.value,
        });
    };
    
    if (isLoading || !branding) {
        return <div className="text-center p-4">Loading branding settings...</div>
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl font-bold text-white mb-6">Theme & Branding</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label htmlFor="appName" className="block text-sm font-medium text-slate-300">Application Name</label>
                        <input type="text" name="appName" id="appName" value={branding.appName} onChange={handleChange} className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                         <div>
                            <label htmlFor="primaryColor" className="block text-sm font-medium text-slate-300">Primary Accent</label>
                            <div className="mt-1 flex items-center gap-2 p-2 bg-brand-dark border border-brand-border rounded-md">
                                <input type="color" name="primaryColor" id="primaryColor" value={branding.primaryColor} onChange={handleChange} className="w-8 h-8 rounded border-none bg-transparent cursor-pointer" />
                                <span className="text-white font-mono">{branding.primaryColor.toUpperCase()}</span>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="secondaryColor" className="block text-sm font-medium text-slate-300">Secondary Accent</label>
                            <div className="mt-1 flex items-center gap-2 p-2 bg-brand-dark border border-brand-border rounded-md">
                                <input type="color" name="secondaryColor" id="secondaryColor" value={branding.secondaryColor} onChange={handleChange} className="w-8 h-8 rounded border-none bg-transparent cursor-pointer" />
                                <span className="text-white font-mono">{branding.secondaryColor.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="pt-2">
                        <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 bg-gradient-to-r from-brand-primary-accent to-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg">
                            <SaveIcon className="w-5 h-5" /> Save Branding
                        </motion.button>
                    </div>
                </form>

                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white">Live Preview</h3>
                    <div className="p-6 bg-brand-dark rounded-lg border border-brand-border space-y-4">
                        <h4 className="text-xl font-bold" style={{ color: branding.primaryColor }}>{branding.appName}</h4>
                        <p className="text-slate-300">This is some sample text to preview your theme. The secondary accent color looks like <span style={{ color: branding.secondaryColor }}>this</span>.</p>
                        <div className="flex gap-4">
                            <button className="text-white font-semibold py-2 px-4 rounded-md" style={{ backgroundColor: branding.primaryColor }}>Primary Button</button>
                            <button className="text-white font-semibold py-2 px-4 rounded-md" style={{ backgroundColor: branding.secondaryColor }}>Secondary Button</button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ThemeBranding;
