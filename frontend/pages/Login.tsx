import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { TrophyIcon, ArrowLeftIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/http';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin' || user.role === 'super_admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(typeof err.detail === 'string' ? err.detail : 'Invalid FPL credentials.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
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
          Log in with your FPL account
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          We use your official Fantasy Premier League credentials to sign you in. Your password is sent straight to FPL, never stored by us. First time here? Logging in creates your account automatically.
        </p>
      </div>

      <div className="bg-brand-secondary/50 border border-brand-border rounded-xl p-8 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">FPL Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex.jordan@gmail.com"
              className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
                <label htmlFor="password"className="block text-sm font-medium text-slate-300">FPL Password</label>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent"
            />
          </div>

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            className="w-full justify-center rounded-md border border-transparent bg-gradient-to-r from-brand-primary-accent to-blue-600 py-3 px-4 text-sm font-semibold text-white shadow-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent focus:ring-offset-2 focus:ring-offset-brand-dark disabled:opacity-60"
          >
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default Login;
