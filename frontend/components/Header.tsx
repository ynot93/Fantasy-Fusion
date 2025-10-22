import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrophyIcon, UserCircleIcon, MenuIcon, XIcon, ArrowRightIcon, LogOutIcon, BellIcon, SettingsIcon } from './Icons';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // A user is considered logged in on all pages that use this header, except the homepage.
  const isLoggedIn = location.pathname !== '/';
  const isPublicView = !isLoggedIn;

  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 flex items-center gap-2 ${
      isActive
        ? 'bg-brand-primary-accent text-white'
        : 'text-slate-300 hover:bg-brand-secondary hover:text-white'
    }`;
    
  const mobileNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `text-2xl font-bold transition-colors duration-300 ${
      isActive ? 'text-brand-primary-accent' : 'text-slate-300 hover:text-brand-primary-accent'
    }`;
    
  return (
    <>
      <header className="bg-brand-secondary/50 backdrop-blur-lg border-b border-brand-border sticky top-0 z-40">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center"
            >
              <NavLink to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center">
                <TrophyIcon className="h-8 w-8 text-brand-primary-accent" />
                <span className="ml-3 text-xl font-bold text-white">FPL Fantasy Fusion</span>
              </NavLink>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-2">
              {isLoggedIn ? (
                <>
                  <NavLink to="/dashboard" className={navLinkClasses}>Dashboard</NavLink>
                  <NavLink to="/leagues" className={navLinkClasses}>Leagues</NavLink>
                  <NavLink to="/my-leagues" className={navLinkClasses}>My Leagues</NavLink>
                  <NavLink to="/wallet" className={navLinkClasses}>Wallet</NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/" className={navLinkClasses}>Home</NavLink>
                  <NavLink to="/leagues" className={navLinkClasses}>Leagues</NavLink>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
               <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                {isPublicView ? (
                  <div className="hidden md:flex items-center gap-2">
                    <NavLink to="/login" className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-brand-secondary hover:text-white transition-colors">
                      Log In
                    </NavLink>
                    <NavLink to="/signup" className="flex items-center bg-brand-primary-accent text-white font-semibold py-2 px-4 rounded-md shadow-lg text-sm transition-transform transform hover:scale-105">
                      Sign Up <ArrowRightIcon className="w-4 h-4 ml-1" />
                    </NavLink>
                  </div>
                ) : (
                  <div className="hidden md:flex items-center gap-4">
                     <button className="p-2 rounded-full hover:bg-brand-secondary transition-colors" aria-label="Notifications">
                        <BellIcon className="h-6 w-6 text-slate-400" />
                     </button>
                     <div className="relative" ref={profileMenuRef}>
                        <button onClick={() => setIsProfileOpen(prev => !prev)} className="block rounded-full hover:opacity-90 transition-opacity" aria-label="Profile menu">
                           <UserCircleIcon className="h-8 w-8 text-slate-400" />
                        </button>
                        <AnimatePresence>
                           {isProfileOpen && (
                              <motion.div
                                 initial={{ opacity: 0, y: -10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, y: -10 }}
                                 className="absolute right-0 mt-2 w-48 bg-brand-secondary border border-brand-border rounded-md shadow-lg z-50 overflow-hidden"
                              >
                                 <ul className="py-1">
                                    <li>
                                       <NavLink to="/profile" className="flex items-center w-full px-4 py-2 text-sm text-slate-200 hover:bg-brand-dark/50">
                                          <SettingsIcon className="w-4 h-4 mr-3" />
                                          Settings
                                       </NavLink>
                                    </li>
                                     <li>
                                       <button onClick={() => { navigate('/'); setIsProfileOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-200 hover:bg-brand-dark/50">
                                          <LogOutIcon className="w-4 h-4 mr-3" />
                                          Logout
                                       </button>
                                    </li>
                                 </ul>
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </div>
                  </div>
                )}
              </motion.div>
              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <motion.button
                  onClick={() => setIsMenuOpen(true)}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-brand-secondary"
                  aria-label="Open navigation menu"
                >
                  <MenuIcon className="h-6 w-6" />
                </motion.button>
              </div>
            </div>
          </div>
        </nav>
      </header>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 bg-brand-dark z-50 p-4 flex flex-col md:hidden"
          >
            <div className="flex justify-between items-center">
               <div className="flex items-center">
                <TrophyIcon className="h-8 w-8 text-brand-primary-accent" />
                <span className="ml-3 text-xl font-bold text-white">FPL Nexus</span>
              </div>
              <motion.button
                onClick={() => setIsMenuOpen(false)}
                whileTap={{ scale: 0.9, rotate: 90 }}
                className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-brand-secondary"
                aria-label="Close navigation menu"
              >
                <XIcon className="h-6 w-6" />
              </motion.button>
            </div>
            <nav className="flex-grow flex flex-col items-center justify-center space-y-8">
              {isLoggedIn ? (
                 <>
                  <NavLink to="/dashboard" className={mobileNavLinkClasses}>Dashboard</NavLink>
                  <NavLink to="/leagues" className={mobileNavLinkClasses}>Leagues</NavLink>
                  <NavLink to="/my-leagues" className={mobileNavLinkClasses}>My Leagues</NavLink>
                  <NavLink to="/wallet" className={mobileNavLinkClasses}>Wallet</NavLink>
                  <NavLink to="/profile" className={mobileNavLinkClasses}>Settings</NavLink>
                  <button onClick={() => { navigate('/'); setIsMenuOpen(false); }} className={mobileNavLinkClasses({ isActive: false })}>Logout</button>
                 </>
              ) : (
                 <>
                   <NavLink to="/" className={mobileNavLinkClasses}>Home</NavLink>
                   <NavLink to="/leagues" className={mobileNavLinkClasses}>Leagues</NavLink>
                   <NavLink to="/login" className={mobileNavLinkClasses}>Log In</NavLink>
                   <NavLink to="/signup" className={mobileNavLinkClasses}>Sign Up</NavLink>
                 </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;