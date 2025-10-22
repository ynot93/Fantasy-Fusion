import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  TrophyIcon,
  UsersIcon,
  BarChartIcon,
  SettingsIcon,
  DollarSignIcon,
  DatabaseIcon,
  FileTextIcon,
  EditIcon,
  LifeBuoyIcon,
  LogOutIcon
} from '../Icons';

const AdminSidebar: React.FC = () => {
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-brand-primary-accent text-white'
        : 'text-slate-300 hover:bg-brand-secondary hover:text-white'
    }`;

  const menuItems = [
    { to: '/admin/dashboard', icon: BarChartIcon, label: 'Dashboard' },
    { to: '/admin/users', icon: UsersIcon, label: 'User Management' },
    { to: '/admin/leagues', icon: TrophyIcon, label: 'League Management' },
    { to: '/admin/transactions', icon: DollarSignIcon, label: 'Transactions' },
    { to: '/admin/content', icon: EditIcon, label: 'Content (CMS)' },
    { to: '/admin/reports', icon: FileTextIcon, label: 'Reports & Analytics' },
    { to: '/admin/settings', icon: SettingsIcon, label: 'System Settings' },
  ];

  return (
    <aside className="w-64 bg-brand-secondary border-r border-brand-border flex flex-col p-4">
      <div className="flex items-center mb-8 px-2">
        <TrophyIcon className="h-8 w-8 text-brand-primary-accent" />
        <span className="ml-3 text-xl font-bold text-white">FPL Nexus Admin</span>
      </div>
      <nav className="flex-1 space-y-2">
        {menuItems.map(item => (
          <NavLink key={item.to} to={item.to} className={navLinkClasses}>
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-2">
         <a href="https://fpl-nexus.com/help" target="_blank" rel="noopener noreferrer" className={navLinkClasses({isActive: false})}>
            <LifeBuoyIcon className="w-5 h-5 mr-3" />
            Help & Support
         </a>
         <NavLink to="/" className={navLinkClasses}>
            <LogOutIcon className="w-5 h-5 mr-3" />
            Logout
         </NavLink>
      </div>
    </aside>
  );
};

export default AdminSidebar;