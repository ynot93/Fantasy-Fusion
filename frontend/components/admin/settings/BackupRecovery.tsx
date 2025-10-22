
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { fantasyApi } from '../../../services/fantasyApi';
import { Backup } from '../../../types';
import { DatabaseIcon, UploadCloudIcon, DownloadIcon, TrashIcon } from '../../Icons';

const BackupRecovery: React.FC = () => {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        // Don't show loader on refetch
        const settings = await fantasyApi.getSystemSettings();
        setBackups(settings.backups);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateBackup = async () => {
        alert("Creating a new backup...");
        await fantasyApi.createBackup();
        fetchData();
        alert("New backup created successfully!");
    };

    const handleDeleteBackup = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this backup? This action is irreversible.')) {
            await fantasyApi.deleteBackup(id);
            fetchData();
            alert("Backup deleted.");
        }
    };

    if (isLoading) {
        return <div className="text-center p-4">Loading backup information...</div>
    }

    const lastBackupDate = backups.length > 0 ? new Date(backups[0].timestamp) : null;
    
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl font-bold text-white mb-6">Backup & Recovery</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-brand-dark/50 p-6 rounded-lg border border-brand-border">
                    <h3 className="font-semibold text-white mb-2">Last Backup</h3>
                    <p className="text-2xl font-bold text-brand-primary-accent">{lastBackupDate ? lastBackupDate.toLocaleString() : 'Never'}</p>
                </div>
                <div className="bg-brand-dark/50 p-6 rounded-lg border border-brand-border flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-white">Create New Backup</h3>
                        <p className="text-sm text-slate-400">Create an instant snapshot of the database.</p>
                    </div>
                    <motion.button onClick={handleCreateBackup} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 bg-brand-primary-accent text-white font-semibold py-2 px-4 rounded-lg shadow-md">
                        <DatabaseIcon className="w-5 h-5" /> Create
                    </motion.button>
                </div>
            </div>

            <div className="bg-brand-dark/50 p-6 rounded-lg border border-brand-border mb-8">
                 <h3 className="font-semibold text-white mb-2">Restore from Backup</h3>
                 <p className="text-sm text-slate-400 mb-4">Restore the application state from a backup file. This will overwrite current data.</p>
                 <div className="flex items-center gap-4">
                    <input type="file" id="backup-file" className="hidden" />
                    <label htmlFor="backup-file" className="cursor-pointer flex items-center gap-2 bg-brand-secondary hover:bg-brand-dark transition-colors border border-brand-border text-white font-semibold py-2 px-4 rounded-lg">
                        <UploadCloudIcon className="w-5 h-5" /> Choose File...
                    </label>
                    <span className="text-sm text-slate-500">No file selected</span>
                 </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-white mb-4">Recent Backup Points</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-brand-border">
                        <thead className="bg-brand-dark/30">
                            <tr>
                                <th className="py-3 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Date & Time</th>
                                <th className="px-3 py-3 text-left text-sm font-semibold text-white">File Size</th>
                                <th className="relative py-3 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {backups.map(backup => (
                                <tr key={backup.id}>
                                    <td className="py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{new Date(backup.timestamp).toLocaleString()}</td>
                                    <td className="px-3 py-4 text-sm text-slate-300">{backup.size}</td>
                                    <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                                        <button className="p-1 hover:text-brand-primary-accent" title="Download"><DownloadIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDeleteBackup(backup.id)} className="p-1 hover:text-red-500" title="Delete"><TrashIcon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};

export default BackupRecovery;
