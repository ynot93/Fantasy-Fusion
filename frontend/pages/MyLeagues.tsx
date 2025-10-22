

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { League, Member } from '../types';
import { fantasyApi } from '../services/fantasyApi';
import { TrophyIcon, UsersIcon, PlusIcon } from '../components/Icons';
import Modal from '../components/Modal';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const Leaderboard: React.FC<{ members: Member[] }> = ({ members }) => {
  return (
    <div className="mt-6 flow-root">
      <div className="-my-2 overflow-x-auto">
        <div className="inline-block min-w-full py-2 align-middle">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-brand-border">
              <thead className="bg-brand-secondary">
                <tr>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Rank</th>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Player</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Team</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-white">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border bg-brand-dark/50">
                <AnimatePresence>
                  {members.map((member, index) => (
                    <motion.tr
                      key={member.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={member.isCurrentUser ? 'bg-indigo-900/50' : ''}
                    >
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-white">{index + 1}</td>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{member.name} {member.isCurrentUser && '(You)'}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300">{member.teamName}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300 text-right font-bold">{member.points}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const MyLeagues: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueFee, setNewLeagueFee] = useState(100);
  const [newLeagueMaxMembers, setNewLeagueMaxMembers] = useState(20);
  const [isNewLeaguePrivate, setIsNewLeaguePrivate] = useState(true);

  const fetchMyLeagues = useCallback(async () => {
    // We don't need to set loading to true on refetch after creation
    // setIsLoading(true);
    const myLeagues = await fantasyApi.getMyLeagues();
    setLeagues(myLeagues);
    if (!selectedLeague && myLeagues.length > 0) {
      handleSelectLeague(myLeagues[0].id);
    } else if (selectedLeague) {
      // Re-fetch selected league details in case it was the one just created
      const currentlySelected = myLeagues.find(l => l.id === selectedLeague.id);
      if (currentlySelected) {
        handleSelectLeague(selectedLeague.id);
      } else if (myLeagues.length > 0) {
        handleSelectLeague(myLeagues[0].id);
      } else {
        setSelectedLeague(null);
      }
    }
    setIsLoading(false);
  }, [selectedLeague]);

  useEffect(() => {
    setIsLoading(true);
    fetchMyLeagues();
  }, []);

  const handleSelectLeague = async (leagueId: string) => {
    const detailedLeague = await fantasyApi.getLeagueDetails(leagueId);
    if(detailedLeague) setSelectedLeague(detailedLeague);
  }
  
  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim()) {
        alert("Please enter a league name.");
        return;
    }
    const result = await fantasyApi.createLeague(newLeagueName, newLeagueFee, isNewLeaguePrivate, newLeagueMaxMembers);
    // The conditional check on `result.success` was not correctly narrowing the union type.
    // This has been updated to check the failure case first, which helps TypeScript's
    // type inference and resolves the error when accessing `result.message`.
    // FIX: Use a type guard to check the `success` property. This allows TypeScript to correctly
    // narrow the type of `result` and access `message` on failure or `newLeague` on success.
    if (result.success === false) {
      alert(result.message);
    } else {
      alert(`League "${result.newLeague.name}" created!`);
      setIsModalOpen(false);
      setNewLeagueName('');
      // After creating, re-fetch leagues and select the new one.
      await fetchMyLeagues();
      handleSelectLeague(result.newLeague.id);
    }
  };

  if (isLoading) {
    return <div className="text-center p-10">Loading your leagues...</div>;
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.5 }}>
      <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">My Leagues</h1>
         <motion.button
          onClick={() => setIsModalOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create League
        </motion.button>
      </div>

      {leagues.length === 0 ? (
        <div className="text-center py-16 px-6 bg-brand-secondary/50 rounded-lg">
          <h2 className="text-2xl font-semibold text-white">No Leagues Yet</h2>
          <p className="text-slate-400 mt-2">You haven't joined any leagues. Check out the dashboard or create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-semibold text-white mb-4">Select a League</h2>
            <div className="space-y-3">
              {leagues.map(league => (
                <motion.button
                  key={league.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleSelectLeague(league.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedLeague?.id === league.id ? 'bg-brand-primary-accent border-brand-primary-accent' : 'bg-brand-secondary border-brand-border hover:border-slate-600'}`}
                >
                  <p className={`font-bold ${selectedLeague?.id === league.id ? 'text-white' : 'text-slate-100'}`}>{league.name}</p>
                  <p className={`text-sm ${selectedLeague?.id === league.id ? 'text-indigo-100' : 'text-slate-400'}`}>{league.isPrivate ? 'Private' : 'Public'} League</p>
                </motion.button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
             <AnimatePresence mode="wait">
              {selectedLeague ? (
                <motion.div
                  key={selectedLeague.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="p-6 bg-brand-secondary/50 rounded-lg border border-brand-border"
                >
                  <h2 className="text-3xl font-bold text-white">{selectedLeague.name}</h2>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-300 mt-4">
                     <div className="flex items-center">
                        <TrophyIcon className="w-5 h-5 mr-2 text-yellow-400" /> Prize: Ksh {selectedLeague.prizePool.toLocaleString()}
                     </div>
                     <div className="flex items-center">
                        <UsersIcon className="w-5 h-5 mr-2 text-brand-primary-accent" /> {selectedLeague.members.length} / {selectedLeague.maxMembers} Members
                     </div>
                  </div>
                  {selectedLeague.members && <Leaderboard members={selectedLeague.members} />}
                </motion.div>
              ) : (
                 <div className="flex items-center justify-center h-full text-slate-400 p-8 bg-brand-secondary/50 rounded-lg">Select a league to see details.</div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
      
      <Modal title="Create a New League" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleCreateLeague} className="space-y-4">
          <div>
            <label htmlFor="leagueName" className="block text-sm font-medium text-slate-300">League Name</label>
            <input
              type="text"
              id="leagueName"
              value={newLeagueName}
              onChange={(e) => setNewLeagueName(e.target.value)}
              className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent"
              placeholder="e.g., Office Bragging Rights"
              required
            />
          </div>
           <div>
            <label htmlFor="maxMembers" className="block text-sm font-medium text-slate-300">Max Members</label>
            <input
              type="number"
              id="maxMembers"
              value={newLeagueMaxMembers}
              min="2"
              max="100"
              onChange={(e) => setNewLeagueMaxMembers(Number(e.target.value))}
              className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent"
            />
          </div>
          <div>
            <label htmlFor="entryFee" className="block text-sm font-medium text-slate-300">Entry Fee (Ksh)</label>
            <select
              id="entryFee"
              value={newLeagueFee}
              onChange={(e) => setNewLeagueFee(Number(e.target.value))}
               className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent"
            >
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              id="isPrivate"
              name="isPrivate"
              type="checkbox"
              checked={isNewLeaguePrivate}
              onChange={(e) => setIsNewLeaguePrivate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-primary-accent focus:ring-brand-primary-accent"
            />
            <label htmlFor="isPrivate" className="ml-2 block text-sm text-slate-300">
              Private League
            </label>
          </div>
          <div className="pt-4">
             <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full flex justify-center items-center bg-gradient-to-r from-brand-primary-accent to-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
              >
                Create and Join League
            </motion.button>
          </div>
        </form>
      </Modal>

    </motion.div>
  );
};

export default MyLeagues;
