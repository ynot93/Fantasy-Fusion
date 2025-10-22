import React from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { TrophyIcon, GoogleIcon, ArrowLeftIcon } from '../components/Icons';

const Signup: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Account created successfully! Redirecting to dashboard...");
    navigate('/dashboard');
  };

  return (
     <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full relative"
    >
       <motion.button
        onClick={() => navigate('/')}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="absolute -top-16 -left-16 md:top-8 md:left-8 z-10 bg-brand-secondary/50 hover:bg-brand-secondary text-slate-300 hover:text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 backdrop-blur-sm border border-brand-border"
        aria-label="Go back"
      >
        <ArrowLeftIcon className="w-6 h-6" />
      </motion.button>

      <div className="text-center mb-10">
        <NavLink to="/" className="flex justify-center items-center mb-4">
          <TrophyIcon className="h-10 w-10 text-brand-primary-accent" />
          <h1 className="ml-3 text-3xl font-bold text-white">FPL Nexus</h1>
        </NavLink>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Create an Account
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Join thousands of managers and start winning today.
        </p>
      </div>

      <div className="bg-brand-secondary/50 border border-brand-border rounded-xl p-8 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Alex Jordan"
                className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="alex.jordan@gmail.com"
                className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent"
              />
            </div>
            <div>
              <label htmlFor="password"className="block text-sm font-medium text-slate-300">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent"
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full justify-center rounded-md border border-transparent bg-gradient-to-r from-brand-primary-accent to-blue-600 py-3 px-4 text-sm font-semibold text-white shadow-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent focus:ring-offset-2 focus:ring-offset-brand-dark"
            >
              Create Account
            </motion.button>
        </form>
         <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-brand-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-brand-secondary px-2 text-slate-400">OR</span>
          </div>
        </div>

        <div className="mt-6">
           <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 rounded-md border border-brand-border bg-brand-dark/50 py-3 px-4 text-sm font-medium text-slate-200 shadow-sm hover:bg-brand-secondary focus:outline-none"
            >
             <GoogleIcon className="h-5 w-5" />
              <span>Continue with Google</span>
            </motion.button>
        </div>
      </div>

       <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <NavLink to="/login" className="font-medium text-brand-primary-accent hover:text-brand-primary-accent/80">
            Log in
          </NavLink>
        </p>
    </motion.div>
  );
};

export default Signup;