import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { TrophyIcon, ArrowLeftIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/http';

const MIN_PASSWORD_LENGTH = 8;

// FastAPI 422s carry a list of field errors rather than a string
const describeError = (err: unknown): string => {
  if (err instanceof ApiError) {
    if (typeof err.detail === 'string') return err.detail;
    if (err.status === 422) return 'Check your email address and use a password of 8 to 72 characters.';
  }
  return 'Something went wrong. Please try again.';
};

const inputClass =
  'mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signup(email, password);
      navigate('/link-fpl');
    } catch (err) {
      setError(describeError(err));
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
          Create your account
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Next you'll link your Fantasy Premier League team. We never ask for your FPL password.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Already have an account?{' '}
          <NavLink to="/login" className="font-medium text-brand-primary-accent hover:underline">
            Log in
          </NavLink>
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
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex.jordan@gmail.com"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300">Confirm password</label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            className="w-full justify-center rounded-md border border-transparent bg-gradient-to-r from-brand-primary-accent to-blue-600 py-3 px-4 text-sm font-semibold text-white shadow-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent focus:ring-offset-2 focus:ring-offset-brand-dark disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default Signup;
