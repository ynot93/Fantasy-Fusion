import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { TrophyIcon } from '../components/Icons';
import { fantasyApi } from '../services/fantasyApi';
import { ApiError } from '../services/http';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      setSentMessage(await fantasyApi.requestPasswordReset(email));
    } catch (err) {
      setError(err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full">
      <div className="text-center mb-10">
        <NavLink to="/" className="flex justify-center items-center mb-4">
          <TrophyIcon className="h-10 w-10 text-brand-primary-accent" />
          <h1 className="ml-3 text-3xl font-bold text-white">FPL Nexus</h1>
        </NavLink>
        <h2 className="text-2xl font-bold tracking-tight text-white">Reset your password</h2>
        <p className="mt-2 text-sm text-slate-400">Enter your account email and we'll send you a reset link.</p>
      </div>

      <div className="bg-brand-secondary/50 border border-brand-border rounded-xl p-8 backdrop-blur-sm">
        {sentMessage ? (
          <div className="space-y-6 text-center">
            <p className="text-slate-300">{sentMessage}</p>
            <p className="text-sm text-slate-500">The link only works for a short time. Check your spam folder if it doesn't arrive.</p>
            <NavLink to="/login" className="inline-block text-sm font-medium text-brand-primary-accent hover:underline">
              Back to log in
            </NavLink>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.jordan@gmail.com"
                className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-gradient-to-r from-brand-primary-accent to-blue-600 py-3 px-4 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-sm text-slate-400">
              Remembered it?{' '}
              <NavLink to="/login" className="font-medium text-brand-primary-accent hover:underline">Log in</NavLink>
            </p>
          </form>
        )}
      </div>
    </motion.div>
  );
};

export default ForgotPassword;
