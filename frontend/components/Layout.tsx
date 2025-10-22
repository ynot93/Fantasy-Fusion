import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Header from './Header';
import { TrophyIcon, TwitterIcon, InstagramIcon } from './Icons';

const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-secondary border-t border-brand-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 text-slate-400">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center">
              <TrophyIcon className="h-8 w-8 text-brand-primary-accent" />
              <span className="ml-3 text-xl font-bold text-white">FPL Fantasy Fusion</span>
            </div>
            <p className="text-sm">The ultimate platform where fantasy football strategy meets the thrill of real weekly winnings.</p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-white"><TwitterIcon className="w-6 h-6" /></a>
              <a href="#" className="hover:text-white"><InstagramIcon className="w-6 h-6" /></a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Navigation</h3>
            <ul className="mt-4 space-y-2">
              <li><NavLink to="/leagues" className="text-sm hover:text-white transition-colors">Leagues</NavLink></li>
              <li><NavLink to="/my-leagues" className="text-sm hover:text-white transition-colors">My Leagues</NavLink></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Legal</h3>
            <ul className="mt-4 space-y-2">
              <li><NavLink to="/terms" className="text-sm hover:text-white transition-colors">Terms of Service</NavLink></li>
              <li><NavLink to="/privacy" className="text-sm hover:text-white transition-colors">Privacy Policy</NavLink></li>
              <li><NavLink to="/responsible-gaming" className="text-sm hover:text-white transition-colors">Responsible Gaming</NavLink></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Contact</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="mailto:support@fplnexus.com" className="text-sm hover:text-white transition-colors">support@fantasyfusion.com</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="bg-brand-dark py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <p>FPL Fantasy Fusion &copy; 2025. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-dark via-indigo-900/50 to-brand-dark text-slate-100 font-sans flex items-center justify-center p-4">
        <main className="w-full max-w-md">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark via-indigo-900/50 to-brand-dark text-slate-100 font-sans flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;