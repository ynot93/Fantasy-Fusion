import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserProfile } from '../../types';

interface ProfileInformationProps {
  user: UserProfile;
  onUpdate: (data: Partial<UserProfile & { favoriteTeam?: string; bio?: string }>) => void;
}

const ProfileInformation: React.FC<ProfileInformationProps> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    favoriteTeam: 'Arsenal', // Mock data
    bio: 'FPL enthusiast, always chasing the green arrow.', // Mock data
    avatarUrl: user.avatarUrl,
  });
  
  useEffect(() => {
    setFormData({
        name: user.name,
        email: user.email,
        favoriteTeam: 'Arsenal',
        bio: 'FPL enthusiast, always chasing the green arrow.',
        avatarUrl: user.avatarUrl
    });
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    alert('Profile updated!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center space-x-6">
                <img src={formData.avatarUrl} alt="User Avatar" className="h-24 w-24 rounded-full" />
                <motion.button 
                    type="button" 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    className="bg-brand-secondary text-white font-semibold py-2 px-4 rounded-md text-sm border border-brand-border"
                >
                    Change Picture
                </motion.button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-300">Username</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent" />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email Address</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent" />
                </div>
                 <div>
                    <label htmlFor="favoriteTeam" className="block text-sm font-medium text-slate-300">Favorite Team</label>
                    <input type="text" name="favoriteTeam" id="favoriteTeam" value={formData.favoriteTeam} onChange={handleChange} className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent" />
                </div>
            </div>
            <div>
                <label htmlFor="bio" className="block text-sm font-medium text-slate-300">Bio</label>
                <textarea name="bio" id="bio" rows={3} value={formData.bio} onChange={handleChange} className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent" />
                <p className="mt-2 text-xs text-slate-500">A brief description of yourself.</p>
            </div>
            <div className="pt-4">
                <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-gradient-to-r from-brand-primary-accent to-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg">Save Changes</motion.button>
            </div>
      </form>
    </motion.div>
  );
};

export default ProfileInformation;
