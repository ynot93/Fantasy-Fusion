
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { fantasyApi } from '../../../services/fantasyApi';
import { HomepageContent } from '../../../types';
import { SaveIcon } from '../../Icons';

const HomepageContentEditor: React.FC = () => {
    const [content, setContent] = useState<HomepageContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const data = await fantasyApi.getHomepageContent();
        setContent(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content) return;
        
        const result = await fantasyApi.updateHomepageContent(content);
        if (result.success) {
            alert('Homepage content updated successfully!');
        } else {
            alert('Failed to update content.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!content) return;
        setContent({
            ...content,
            [e.target.name]: e.target.value,
        });
    };

    if (isLoading) {
        return <div className="text-center p-4">Loading content editor...</div>
    }

    if (!content) {
        return <div className="text-center p-4 text-red-400">Could not load homepage content.</div>
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl font-bold text-white mb-6">Homepage Editor</h2>
            <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
                <div>
                    <label htmlFor="heroTitle" className="block text-sm font-medium text-slate-300">Hero Title</label>
                    <textarea
                        id="heroTitle"
                        name="heroTitle"
                        rows={3}
                        value={content.heroTitle.replace(/<br \/>/g, "\n").replace(/<span class="text-brand-primary-accent">/g, "").replace(/<\/span>/g, "")}
                        onChange={handleChange}
                        className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent font-mono"
                        placeholder="e.g. Where Fantasy Football..."
                    />
                    <p className="text-xs text-slate-500 mt-1">Use line breaks for new lines. The last line will be automatically accented.</p>
                </div>
                <div>
                    <label htmlFor="heroSubtitle" className="block text-sm font-medium text-slate-300">Hero Subtitle</label>
                    <textarea
                        id="heroSubtitle"
                        name="heroSubtitle"
                        rows={3}
                        value={content.heroSubtitle}
                        onChange={handleChange}
                        className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent"
                        placeholder="e.g. Join weekly competitive leagues..."
                    />
                </div>
                 <div className="pt-2">
                    <motion.button
                        type="submit"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 bg-gradient-to-r from-brand-primary-accent to-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg"
                    >
                       <SaveIcon className="w-5 h-5" /> Save Changes
                    </motion.button>
                </div>
            </form>
        </motion.div>
    );
};

export default HomepageContentEditor;
