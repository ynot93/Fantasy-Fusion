
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutIcon, MegaphoneIcon, BookOpenIcon } from '../../components/Icons';
import HomepageContentEditor from '../../components/admin/cms/HomepageContentEditor';
import AnnouncementsManager from '../../components/admin/cms/AnnouncementsManager';
import HelpCenterManager from '../../components/admin/cms/HelpCenterManager';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

type CmsView = 'homepage' | 'announcements' | 'help';

const ContentManagement: React.FC = () => {
  const [activeView, setActiveView] = useState<CmsView>('homepage');

  const renderContent = () => {
    switch (activeView) {
      case 'homepage':
        return <HomepageContentEditor />;
      case 'announcements':
        return <AnnouncementsManager />;
      case 'help':
        return <HelpCenterManager />;
      default:
        return null;
    }
  };

  const getTabClass = (viewName: CmsView) =>
    `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      activeView === viewName
        ? 'bg-brand-primary-accent text-white'
        : 'text-slate-300 hover:bg-brand-secondary hover:text-white'
    }`;

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
      <h1 className="text-4xl font-bold text-white mb-8">Content Management (CMS)</h1>
      
      <div className="mb-6 flex flex-wrap gap-2 p-2 bg-brand-secondary/50 rounded-lg border border-brand-border">
        <button onClick={() => setActiveView('homepage')} className={getTabClass('homepage')}>
          <LayoutIcon className="w-5 h-5" /> Homepage
        </button>
        <button onClick={() => setActiveView('announcements')} className={getTabClass('announcements')}>
          <MegaphoneIcon className="w-5 h-5" /> Announcements
        </button>
        <button onClick={() => setActiveView('help')} className={getTabClass('help')}>
          <BookOpenIcon className="w-5 h-5" /> Help Center
        </button>
      </div>

      <div className="bg-brand-secondary/50 rounded-lg border border-brand-border p-6 min-h-[500px]">
        {renderContent()}
      </div>
    </motion.div>
  );
};

export default ContentManagement;
