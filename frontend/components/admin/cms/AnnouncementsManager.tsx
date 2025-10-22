
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fantasyApi } from '../../../services/fantasyApi';
import { Announcement } from '../../../types';
import Modal from '../../Modal';
import { PlusIcon, EditIcon, TrashIcon } from '../../Icons';

const AnnouncementsManager: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAnnouncement, setCurrentAnnouncement] = useState<Partial<Announcement>>({});

    const fetchAnnouncements = useCallback(async () => {
        const data = await fantasyApi.getAnnouncements();
        setAnnouncements(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const handleOpenModal = (announcement?: Announcement) => {
        setCurrentAnnouncement(announcement || { title: '', content: '', status: 'Draft' });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentAnnouncement({});
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await fantasyApi.saveAnnouncement(currentAnnouncement as any);
        fetchAnnouncements();
        handleCloseModal();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this announcement?')) {
            await fantasyApi.deleteAnnouncement(id);
            fetchAnnouncements();
        }
    };
    
    if (isLoading) {
        return <div className="text-center p-4">Loading announcements...</div>
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Announcements</h2>
                <motion.button
                    onClick={() => handleOpenModal()}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 bg-brand-primary-accent text-white font-semibold py-2 px-4 rounded-lg shadow-md"
                >
                    <PlusIcon className="w-5 h-5" /> New Announcement
                </motion.button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-brand-border">
                    <thead className="bg-brand-dark/30">
                        <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Title</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Date</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
                            <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {announcements.map(announcement => (
                            <tr key={announcement.id}>
                                <td className="py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{announcement.title}</td>
                                <td className="px-3 py-4 text-sm text-slate-300">{new Date(announcement.date).toLocaleDateString()}</td>
                                <td className="px-3 py-4 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${announcement.status === 'Published' ? 'bg-green-500/20 text-green-300' : 'bg-slate-500/20 text-slate-400'}`}>
                                        {announcement.status}
                                    </span>
                                </td>
                                <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                                    <button onClick={() => handleOpenModal(announcement)} className="p-1 hover:text-brand-primary-accent"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDelete(announcement.id)} className="p-1 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal title={currentAnnouncement.id ? "Edit Announcement" : "Create Announcement"} isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-300">Title</label>
                        <input id="title" type="text" value={currentAnnouncement.title} onChange={e => setCurrentAnnouncement({...currentAnnouncement, title: e.target.value})}
                         className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white" required />
                    </div>
                     <div>
                        <label htmlFor="content" className="block text-sm font-medium text-slate-300">Content</label>
                        <textarea id="content" rows={5} value={currentAnnouncement.content} onChange={e => setCurrentAnnouncement({...currentAnnouncement, content: e.target.value})}
                         className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white" required />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-slate-300">Status</label>
                        <select id="status" value={currentAnnouncement.status} onChange={e => setCurrentAnnouncement({...currentAnnouncement, status: e.target.value as any})}
                         className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white">
                            <option value="Draft">Draft</option>
                            <option value="Published">Published</option>
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleCloseModal} className="bg-brand-secondary text-white font-semibold py-2 px-4 rounded-md text-sm border border-brand-border">Cancel</button>
                        <button type="submit" className="bg-brand-primary-accent text-white font-semibold py-2 px-4 rounded-md text-sm">Save</button>
                    </div>
                </form>
            </Modal>
        </motion.div>
    );
};

export default AnnouncementsManager;
