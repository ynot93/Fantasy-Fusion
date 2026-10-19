import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fantasyApi } from '../services/fantasyApi';
import { ApiError } from '../services/http';
import { FplTeamPreview } from '../types';
import { CheckCircleIcon, LinkIcon, ShieldCheckIcon } from '../components/Icons';

type Step = 'enter' | 'confirm' | 'verify' | 'done';

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof ApiError && typeof err.detail === 'string' ? err.detail : fallback;

const cardClass = 'bg-brand-secondary/50 border border-brand-border rounded-xl p-8 backdrop-blur-sm';
const primaryButtonClass =
  'rounded-md bg-gradient-to-r from-brand-primary-accent to-blue-600 py-3 px-6 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60';
const secondaryButtonClass =
  'rounded-md border border-brand-border py-3 px-6 text-sm font-semibold text-slate-300 hover:text-white hover:bg-brand-secondary';

const StepIndicator: React.FC<{ step: Step }> = ({ step }) => {
  const steps: { key: Step[]; label: string }[] = [
    { key: ['enter', 'confirm'], label: 'Link team' },
    { key: ['verify'], label: 'Verify ownership' },
    { key: ['done'], label: 'Done' },
  ];
  const activeIndex = steps.findIndex((s) => s.key.includes(step));
  return (
    <ol className="flex items-center justify-center gap-3 text-sm mb-8">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-3">
          <span className={i <= activeIndex ? 'text-brand-primary-accent font-semibold' : 'text-slate-500'}>
            {i + 1}. {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-slate-600">→</span>}
        </li>
      ))}
    </ol>
  );
};

const LinkFpl: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const initialStep: Step = !user?.fplManagerId ? 'enter' : user.fplVerified ? 'done' : 'verify';
  const [step, setStep] = useState<Step>(initialStep);
  const [teamInput, setTeamInput] = useState('');
  const [preview, setPreview] = useState<FplTeamPreview | null>(null);
  const [leagueCode, setLeagueCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (step !== 'verify') return;
    fantasyApi
      .getFplVerification()
      .then((status) => setLeagueCode(status.leagueCode))
      .catch(() => setLeagueCode(null));
  }, [step]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsBusy(true);
    try {
      const res = await fantasyApi.linkFplTeam(teamInput);
      setUser(res.user);
      setPreview(res.team);
      setStep('confirm');
    } catch (err) {
      setError(errorMessage(err, 'Could not link that team. Please try again.'));
    } finally {
      setIsBusy(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setIsBusy(true);
    try {
      const verifiedUser = await fantasyApi.verifyFplTeam();
      setUser(verifiedUser);
      setStep('done');
    } catch (err) {
      setError(errorMessage(err, 'Could not check your team right now. Please try again.'));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <h1 className="text-4xl font-bold text-white mb-2 text-center">Link your FPL team</h1>
      <p className="text-slate-400 text-center mb-8">
        We read your team's public FPL data to score your leagues. We never ask for your FPL password.
      </p>
      <StepIndicator step={step} />

      {error && (
        <div className="mb-6 rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 'enter' && (
        <div className={cardClass}>
          <form onSubmit={handleLink} className="space-y-6">
            <div>
              <label htmlFor="team" className="block text-sm font-medium text-slate-300">
                FPL manager ID or Points page URL
              </label>
              <input
                id="team"
                required
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                placeholder="https://fantasy.premierleague.com/entry/1234567/event/8"
                className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-accent"
              />
            </div>
            <details className="text-sm text-slate-400">
              <summary className="cursor-pointer text-brand-primary-accent">How do I find this?</summary>
              <ol className="mt-3 list-decimal list-inside space-y-1">
                <li>Log in at fantasy.premierleague.com (website or app).</li>
                <li>Open the <strong>Points</strong> tab.</li>
                <li>
                  Copy the page address. It looks like <code>…/entry/<strong>1234567</strong>/event/8</code>; the
                  number after <code>/entry/</code> is your manager ID. Pasting the whole address works too.
                </li>
              </ol>
            </details>
            <button type="submit" disabled={isBusy} className={`w-full ${primaryButtonClass}`}>
              {isBusy ? 'Looking up team…' : 'Find my team'}
            </button>
          </form>
        </div>
      )}

      {step === 'confirm' && preview && (
        <div className={cardClass}>
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-brand-primary-accent/20 text-brand-primary-accent rounded-full w-14 h-14 flex items-center justify-center shrink-0">
              <LinkIcon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{preview.teamName ?? 'Unnamed team'}</p>
              <p className="text-slate-400">
                {preview.managerName ?? 'Unknown manager'} · ID {preview.managerId}
                {preview.overallPoints !== null && ` · ${preview.overallPoints} pts`}
              </p>
            </div>
          </div>
          <p className="text-slate-300 mb-6">Is this your team?</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setStep('verify')} className={primaryButtonClass}>
              Yes, that's me
            </button>
            <button
              onClick={() => {
                setPreview(null);
                setStep('enter');
              }}
              className={secondaryButtonClass}
            >
              No, try a different ID
            </button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className={cardClass}>
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheckIcon className="w-7 h-7 text-brand-primary-accent" />
            <h2 className="text-xl font-bold text-white">Prove it's your team</h2>
          </div>
          <p className="text-slate-300 mb-4">
            You can join free leagues now. Before you can join or create a league with an entry fee, show that you
            control this FPL team by joining our verification league on FPL:
          </p>
          {leagueCode ? (
            <>
              <ol className="list-decimal list-inside space-y-2 text-slate-300 mb-6">
                <li>On FPL, go to <strong>Leagues &amp; Cups</strong> → <strong>Join a league</strong> → <strong>Join private league</strong>.</li>
                <li>
                  Enter the code{' '}
                  <code className="rounded bg-brand-dark border border-brand-border px-2 py-1 text-white font-mono">{leagueCode}</code>
                </li>
                <li>Come back here and press <strong>Check now</strong>.</li>
              </ol>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleVerify} disabled={isBusy} className={primaryButtonClass}>
                  {isBusy ? 'Checking…' : 'Check now'}
                </button>
                <button onClick={() => navigate('/dashboard')} className={secondaryButtonClass}>
                  Do this later
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-400 mb-6">Team verification isn't available right now. Please check back later.</p>
              <button onClick={() => navigate('/dashboard')} className={secondaryButtonClass}>
                Go to dashboard
              </button>
            </>
          )}
          <p className="mt-6 text-sm text-slate-500">
            Wrong team?{' '}
            <button onClick={() => setStep('enter')} className="text-brand-primary-accent hover:underline">
              Link a different one
            </button>
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className={`${cardClass} text-center`}>
          <CheckCircleIcon className="w-14 h-14 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Your team is verified</h2>
          <p className="text-slate-400 mb-6">
            You can now join leagues with entry fees. You're free to leave the verification league on FPL; it only
            counts towards FPL's 30 private-league limit.
          </p>
          <NavLink to="/dashboard" className={`inline-block ${primaryButtonClass}`}>
            Go to dashboard
          </NavLink>
        </div>
      )}
    </motion.div>
  );
};

export default LinkFpl;
