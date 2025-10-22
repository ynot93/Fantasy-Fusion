
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyIcon, PaintBrushIcon, DatabaseIcon } from '../../components/Icons';
import ApiKeys from '../../components/admin/settings/ApiKeys';
import ThemeBranding from '../../components/admin/settings/ThemeBranding';
import BackupRecovery from '../../components/admin/settings/BackupRecovery';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

type SettingsView = 'api' | 'branding' | 'backup';

const SystemSettings: React.FC = () => {
  const [activeView, setActiveView] = useState<SettingsView>('api');

  const renderContent = () => {
    switch (activeView) {
      case 'api':
        return <ApiKeys />;
      case 'branding':
        return <ThemeBranding />;
      case 'backup':
        return <BackupRecovery />;
      default:
        return null;
    }
  };

  const getTabClass = (viewName: SettingsView) =>
    `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      activeView === viewName
        ? 'bg-brand-primary-accent text-white'
        : 'text-slate-300 hover:bg-brand-secondary hover:text-white'
    }`;

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
      <h1 className="text-4xl font-bold text-white mb-8">System Settings</h1>
      
      <div className="mb-6 flex flex-wrap gap-2 p-2 bg-brand-secondary/50 rounded-lg border border-brand-border">
        <button onClick={() => setActiveView('api')} className={getTabClass('api')}>
          <KeyIcon className="w-5 h-5" /> API Keys
        </button>
        <button onClick={() => setActiveView('branding')} className={getTabClass('branding')}>
          <PaintBrushIcon className="w-5 h-5" /> Theme & Branding
        </button>
        <button onClick={() => setActiveView('backup')} className={getTabClass('backup')}>
          <DatabaseIcon className="w-5 h-5" /> Backup & Recovery
        </button>
      </div>

      <div className="bg-brand-secondary/50 rounded-lg border border-brand-border p-6 min-h-[500px]">
        {renderContent()}
      </div>
    </motion.div>
  );
};

export default SystemSettings;