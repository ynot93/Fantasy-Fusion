import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserProfile } from '../types';
import { fantasyApi } from '../services/fantasyApi';
import { UserCircleIcon, ShieldIcon, SettingsIcon, CreditCardIcon, LinkIcon, TrashIcon } from '../components/Icons';

import ProfileInformation from '../components/profile/ProfileInformation';
import Security from '../components/profile/Security';
import Preferences from '../components/profile/Preferences';
import Payments from '../components/profile/Payments';
import ConnectedAccounts from '../components/profile/ConnectedAccounts';
import DeleteAccount from '../components/profile/DeleteAccount';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

type View = 'profile' | 'security' | 'preferences' | 'payments' | 'connections' | 'delete';

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<View>('profile');

  useEffect(() => {
    fantasyApi.getUserProfile().then(setUser);
  }, []);

  const handleUpdate = async (data: Partial<UserProfile>) => {
    if(!user) return;
    const updatedData = { ...user, ...data };
    const updatedUser = await fantasyApi.updateUserProfile(updatedData);
    setUser(updatedUser);
  };

  const getSidebarItemClass = (viewName: View) => 
    `w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      activeView === viewName
        ? 'bg-brand-primary-accent text-white'
        : 'text-slate-300 hover:bg-brand-secondary hover:text-white'
    }`;
    
  const menuItems = [
    { id: 'profile', label: 'Profile Information', icon: UserCircleIcon },
    { id: 'security', label: 'Security', icon: ShieldIcon },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'payments', label: 'Payments', icon: CreditCardIcon },
    { id: 'connections', label: 'Connected Accounts', icon: LinkIcon },
    { id: 'delete', label: 'Delete Account', icon: TrashIcon },
  ];

  if (!user) {
    return <div className="text-center p-10">Loading profile...</div>;
  }
  
  const renderContent = () => {
    switch (activeView) {
      case 'profile':
        return <ProfileInformation user={user} onUpdate={handleUpdate} />;
      case 'security':
        return <Security />;
      case 'preferences':
        return <Preferences />;
      case 'payments':
        return <Payments />;
      case 'connections':
        return <ConnectedAccounts />;
      case 'delete':
        return <DeleteAccount />;
      default:
        return null;
    }
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
      <h1 className="text-4xl font-bold text-white mb-8">Profile & Settings</h1>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="md:w-1/4 lg:w-1/5">
          <nav className="space-y-2">
            {menuItems.map(item => (
                <button 
                    key={item.id} 
                    className={getSidebarItemClass(item.id as View)}
                    onClick={() => setActiveView(item.id as View)}
                >
                    <item.icon className={`w-5 h-5 mr-3 ${item.id === 'delete' ? 'text-red-400' : ''}`} />
                    <span className={item.id === 'delete' ? 'text-red-400' : ''}>{item.label}</span>
                </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1">
          <div className="bg-brand-secondary/50 rounded-lg border border-brand-border shadow-xl p-8 min-h-[400px]">
            {renderContent()}
          </div>
        </main>
      </div>
    </motion.div>
  );
};

export default Profile;
