
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { fantasyApi } from '../../../services/fantasyApi';
import { HelpArticle } from '../../../types';
import Modal from '../../Modal';
import { PlusIcon, EditIcon, TrashIcon } from '../../Icons';

const HelpCenterManager: React.FC = () => {
    const [articles, setArticles] = useState<HelpArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentArticle, setCurrentArticle] = useState<Partial<HelpArticle>>({});

    const fetchArticles = useCallback(async () => {
        const data = await fantasyApi.getHelpArticles();
        setArticles(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    const handleOpenModal = (article?: HelpArticle) => {
        setCurrentArticle(article || { question: '', answer: '', category: 'General' });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentArticle({});
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await fantasyApi.saveHelpArticle(currentArticle as any);
        fetchArticles();
        handleCloseModal();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this article?')) {
            await fantasyApi.deleteHelpArticle(id);
            fetchArticles();
        }
    };
    
    if (isLoading) {
        return <div className="text-center p-4">Loading help articles...</div>
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Help Center Articles</h2>
                <motion.button
                    onClick={() => handleOpenModal()}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 bg-brand-primary-accent text-white font-semibold py-2 px-4 rounded-lg shadow-md"
                >
                    <PlusIcon className="w-5 h-5" /> New Article
                </motion.button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-brand-border">
                    <thead className="bg-brand-dark/30">
                        <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Question</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Category</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Last Updated</th>
                            <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {articles.map(article => (
                            <tr key={article.id}>
                                <td className="py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{article.question}</td>
                                <td className="px-3 py-4 text-sm text-slate-300">{article.category}</td>
                                <td className="px-3 py-4 text-sm text-slate-300">{new Date(article.lastUpdated).toLocaleDateString()}</td>
                                <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                                    <button onClick={() => handleOpenModal(article)} className="p-1 hover:text-brand-primary-accent"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDelete(article.id)} className="p-1 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <Modal title={currentArticle.id ? "Edit Article" : "Create Article"} isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label htmlFor="question" className="block text-sm font-medium text-slate-300">Question / Title</label>
                        <input id="question" type="text" value={currentArticle.question} onChange={e => setCurrentArticle({...currentArticle, question: e.target.value})}
                         className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white" required />
                    </div>
                     <div>
                        <label htmlFor="answer" className="block text-sm font-medium text-slate-300">Answer / Content</label>
                        <textarea id="answer" rows={7} value={currentArticle.answer} onChange={e => setCurrentArticle({...currentArticle, answer: e.target.value})}
                         className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white" required />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-slate-300">Category</label>
                        <input id="category" type="text" value={currentArticle.category} onChange={e => setCurrentArticle({...currentArticle, category: e.target.value})}
                         className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md py-2 px-3 text-white" required />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleCloseModal} className="bg-brand-secondary text-white font-semibold py-2 px-4 rounded-md text-sm border border-brand-border">Cancel</button>
                        <button type="submit" className="bg-brand-primary-accent text-white font-semibold py-2 px-4 rounded-md text-sm">Save Article</button>
                    </div>
                </form>
            </Modal>
        </motion.div>
    );
};

export default HelpCenterManager;
