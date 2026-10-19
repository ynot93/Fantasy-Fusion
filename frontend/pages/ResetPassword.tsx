import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { TrophyIcon } from '../components/Icons';
import { fantasyApi } from '../services/fantasyApi';
import { ApiError } from '../services/http';

const MIN_PASSWORD_LENGTH = 8;

const inputClass =
  'mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
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
      setDoneMessage(await fantasyApi.confirmPasswordReset(token, password));
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
        <h2 className="text-2xl font-bold tracking-tight text-white">Choose a new password</h2>
      </div>

      <div className="bg-brand-secondary/50 border border-brand-border rounded-xl p-8 backdrop-blur-sm">
        {!token ? (
          <div className="space-y-6 text-center">
            <p className="text-slate-300">This reset link is missing its token. Request a new one.</p>
            <NavLink to="/forgot-password" className="inline-block text-sm font-medium text-brand-primary-accent hover:underline">
              Request a new link
            </NavLink>
          </div>
        ) : doneMessage ? (
          <div className="space-y-6 text-center">
            <p className="text-slate-300">{doneMessage}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-md bg-gradient-to-r from-brand-primary-accent to-blue-600 py-3 px-4 text-sm font-semibold text-white shadow-lg hover:opacity-90"
            >
              Log in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
                {error.includes('expired') && (
                  <>
                    {' '}
                    <NavLink to="/forgot-password" className="underline">Request a new link</NavLink>
                  </>
                )}
              </div>
            )}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">New password</label>
              <input
                id="password"
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
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-gradient-to-r from-brand-primary-accent to-blue-600 py-3 px-4 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
};

export default ResetPassword;
