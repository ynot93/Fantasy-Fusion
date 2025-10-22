import React, { useState, useEffect, useCallback } from 'react';
// FIX: Import `Variants` from `framer-motion` to correctly type animation variants.
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { League, UserProfile, FplSummary } from '../types';
import { fantasyApi } from '../services/fantasyApi';
import LeagueCard from '../components/LeagueCard';
import Modal from '../components/Modal';
import { PlusIcon, ArrowRightIcon, ChevronDownIcon, UsersIcon, AwardIcon, DollarSignIcon, BarChartIcon, TrophyIcon, DownloadIcon, LinkIcon } from '../components/Icons';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// FIX: Explicitly type `cardVariants` with `Variants` to resolve type incompatibility with framer-motion.
const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: 'easeOut',
      },
    }),
};


// Component for the new User Dashboard view
const UserDashboardView: React.FC = () => {
    const [myLeagues, setMyLeagues] = useState<League[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [fplSummary, setFplSummary] = useState<FplSummary | null>(null);
    const [potentialWinnings, setPotentialWinnings] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [leagues, profile, summary] = await Promise.all([
                fantasyApi.getMyLeagues(),
                fantasyApi.getUserProfile(),
                fantasyApi.getFplSummary()
            ]);
            
            setMyLeagues(leagues);
            setUserProfile(profile);
            setFplSummary(summary);

            const totalWinnings = leagues.reduce((sum, league) => sum + league.prizePool, 0);
            setPotentialWinnings(totalWinnings);
            
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const getLeagueStatus = (id: string) => {
        const statuses = ['Ongoing', 'Finished', 'Payout Pending'];
        const index = id.charCodeAt(id.length-1) % statuses.length;
        return statuses[index];
    }
    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Ongoing': return 'bg-green-500/20 text-green-400';
            case 'Finished': return 'bg-blue-500/20 text-blue-400';
            case 'Payout Pending': return 'bg-yellow-500/20 text-yellow-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    }

    if (isLoading || !userProfile || !fplSummary) {
        return <div className="text-center p-10">Loading dashboard...</div>;
    }

    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={{ duration: 0.5 }}
        >
            <h1 className="text-4xl font-bold text-white mb-8">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Balance Card */}
                <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants} className="bg-brand-secondary/50 rounded-xl p-6 border border-brand-border flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-6">
                            <div className="bg-green-500/20 text-green-400 rounded-full w-16 h-16 flex items-center justify-center shrink-0">
                                <DollarSignIcon className="w-8 h-8"/>
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Current Balance</p>
                                <p className="text-3xl font-bold text-white">Ksh 1,200.00</p>
                            </div>
                        </div>
                    </div>
                     <div className="flex gap-3 mt-4">
                     <button className="flex items-center justify-center gap-2 w-full text-center bg-brand-secondary hover:bg-brand-dark transition-colors border border-brand-border text-white font-semibold py-2 px-4 rounded-lg">
                        <PlusIcon className="w-5 h-5"/> Add Funds
                     </button>
                     <button className="flex items-center justify-center gap-2 w-full text-center bg-brand-secondary hover:bg-brand-dark transition-colors border border-brand-border text-white font-semibold py-2 px-4 rounded-lg">
                        <DownloadIcon className="w-5 h-5"/> Withdraw
                     </button>
                   </div>
                </motion.div>

                {/* FPL Stats Card */}
                <motion.div custom={1} initial="hidden" animate="visible" variants={cardVariants} className="bg-brand-secondary/50 rounded-xl p-6 border border-brand-border">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-slate-400 text-sm">Gameweek Points</p>
                            <p className="text-3xl font-bold text-white">78 <span className="text-lg text-slate-300 font-medium">/ avg. 56</span></p>
                        </div>
                         <div className="bg-brand-primary-accent/20 text-brand-primary-accent rounded-full w-16 h-16 flex items-center justify-center shrink-0">
                            <BarChartIcon className="w-8 h-8"/>
                        </div>
                    </div>
                    <div className="border-t border-brand-border/50 pt-4 space-y-2">
                        <p className="text-xl font-bold text-white">{userProfile.teamName}</p>
                        <div className="text-sm text-slate-300 flex justify-between">
                            <span>Overall Points:</span>
                            <span className="font-semibold text-white">{fplSummary.overallPoints.toLocaleString()}</span>
                        </div>
                        <div className="text-sm text-slate-300 flex justify-between">
                            <span>Overall Rank:</span>
                            <span className="font-semibold text-white">{fplSummary.overallRank.toLocaleString()}</span>
                        </div>
                         <div className="text-sm text-slate-300 flex justify-between">
                            <span>Total Players:</span>
                            <span className="font-semibold text-white">{fplSummary.totalPlayers.toLocaleString()}</span>
                        </div>
                    </div>
                </motion.div>
                
                {/* Leagues Card */}
                <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants} className="bg-brand-secondary/50 rounded-xl p-6 border border-brand-border flex flex-col justify-between">
                   <div>
                       <div className="flex items-center gap-6">
                           <div className="bg-yellow-500/20 text-yellow-400 rounded-full w-16 h-16 flex items-center justify-center shrink-0">
                                <TrophyIcon className="w-8 h-8"/>
                           </div>
                           <div>
                                <p className="text-slate-400 text-sm">Potential Winnings</p>
                                <p className="text-3xl font-bold text-white">Ksh {potentialWinnings.toLocaleString()}</p>
                           </div>
                       </div>
                   </div>
                   <div className="flex flex-col gap-3 mt-4">
                     <NavLink to="/leagues" className="flex items-center justify-center gap-2 w-full text-center bg-brand-secondary hover:bg-brand-dark transition-colors border border-brand-border text-white font-semibold py-2 px-4 rounded-lg">
                        <UsersIcon className="w-5 h-5"/> Join League
                     </NavLink>
                     <NavLink to="/my-leagues" className="flex items-center justify-center gap-2 w-full text-center bg-brand-secondary hover:bg-brand-dark transition-colors border border-brand-border text-white font-semibold py-2 px-4 rounded-lg">
                        <PlusIcon className="w-5 h-5"/> Create League
                     </NavLink>
                   </div>
                </motion.div>

                {/* Active Leagues Summary Card */}
                <motion.div custom={3} initial="hidden" animate="visible" variants={cardVariants} className="md:col-span-2 lg:col-span-3 bg-brand-secondary/50 rounded-xl p-6 border border-brand-border">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold text-white">Active Leagues</h2>
                      <NavLink to="/my-leagues" className="text-sm font-medium text-brand-primary-accent hover:underline">View All</NavLink>
                    </div>
                    {isLoading ? <p>Loading leagues...</p> : (
                        <div className="space-y-4">
                            {myLeagues.slice(0, 3).map(league => (
                                <div key={league.id} className="bg-brand-dark/50 p-4 rounded-lg border border-brand-border grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                                    <div>
                                        <p className="font-bold text-white truncate">{league.name}</p>
                                        <p className="text-sm text-slate-400">Entry: Ksh {league.entryFee}</p>
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-sm text-slate-400">Prize Pool</p>
                                        <p className="font-semibold text-white">Ksh {league.prizePool.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right sm:text-left">
                                        <p className="text-sm text-slate-400">Members</p>
                                        <p className="font-semibold text-white">{league.members.length}/{league.maxMembers}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(getLeagueStatus(league.id))}`}>
                                            {getLeagueStatus(league.id)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
};


// Component for the Public Leagues view (original Dashboard)
const PublicLeaguesView: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [myLeagueIds, setMyLeagueIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrivateLeagueModalOpen, setIsPrivateLeagueModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueFee, setNewLeagueFee] = useState(100);
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = location.pathname !== '/';

  const fetchLeagues = useCallback(async () => {
    setIsLoading(true);
    const publicLeagues = await fantasyApi.getPublicLeagues();
    const myLeagues = await fantasyApi.getMyLeagues();
    setLeagues(publicLeagues);
    setMyLeagueIds(new Set(myLeagues.map(l => l.id)));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  const handleJoinLeague = async (leagueId: string) => {
    if (!isLoggedIn) {
        alert("You must be logged in to join a league. Please log in or sign up.");
        navigate('/login');
        return;
    }
    const result = await fantasyApi.joinLeague(leagueId);
    if (result.success) {
        alert(result.message);
        fetchLeagues(); // Re-fetch to update button state
    } else {
        alert(result.message);
    }
  };

  const handleCreateLeagueClick = () => {
    if (!isLoggedIn) {
        alert("You must be logged in to create a league. Please log in or sign up.");
        navigate('/login');
        return;
    }
    setIsModalOpen(true);
  };

  const handleJoinPrivateLeagueClick = () => {
    if (!isLoggedIn) {
        alert("You must be logged in to join a league. Please log in or sign up.");
        navigate('/login');
        return;
    }
    setIsPrivateLeagueModalOpen(true);
  };
  
  const handleJoinPrivateLeague = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
        alert("Please enter an invite code.");
        return;
    }
    // Simulate joining logic
    alert(`Successfully joined league with code: ${inviteCode}`);
    setIsPrivateLeagueModalOpen(false);
    setInviteCode('');
    // Potentially navigate to the league page or refetch leagues
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim()) {
        alert("Please enter a league name.");
        return;
    }
    const result = await fantasyApi.createLeague(newLeagueName, newLeagueFee, false, 20);
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
      fetchLeagues();
    }
  };

  if (isLoading) {
    return <div className="text-center p-10">Loading leagues...</div>;
  }

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">Leagues</h1>
        <div className="flex flex-wrap gap-4">
             <motion.button
              onClick={handleJoinPrivateLeagueClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center bg-brand-secondary text-white font-bold py-3 px-6 rounded-lg shadow-lg border border-brand-border"
            >
              <LinkIcon className="w-5 h-5 mr-2" />
              Join Private League
            </motion.button>
            <motion.button
              onClick={handleCreateLeagueClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create League
            </motion.button>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {leagues.map((league) => (
          <LeagueCard
            key={league.id}
            league={league}
            onJoin={handleJoinLeague}
            isJoined={myLeagueIds.has(league.id)}
          />
        ))}
      </motion.div>
      
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
              placeholder="e.g., Weekend Champions"
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
          <div className="pt-4">
             <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full flex justify-center items-center bg-gradient-to-r from-brand-primary-accent to-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
              >
                Create and Join
            </motion.button>
          </div>
        </form>
      </Modal>

      <Modal title="Join a Private League" isOpen={isPrivateLeagueModalOpen} onClose={() => setIsPrivateLeagueModalOpen(false)}>
        <form onSubmit={handleJoinPrivateLeague} className="space-y-4">
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-slate-300">Invite Code</label>
            <input
              type="text"
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="mt-1 block w-full bg-brand-dark border border-brand-border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary-accent focus:border-brand-primary-accent"
              placeholder="Enter your invite code"
            />
          </div>
          <div className="pt-4">
             <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full flex justify-center items-center bg-gradient-to-r from-brand-primary-accent to-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
              >
                Join with Code
            </motion.button>
          </div>
        </form>
      </Modal>

    </motion.div>
  );
};

// Component for the marketing Home Page view
const HomePageView: React.FC = () => {
    const faqItems = [
    {
      q: 'How are winners determined?',
      a: 'Winners are determined based on the highest Fantasy Premier League points accumulated for that specific gameweek. In case of a tie, the prize is split equally.'
    },
    {
      q: 'Is this app affiliated with the official Fantasy Premier League?',
      a: 'No, FPL Nexus is a third-party application and is not affiliated with the official Fantasy Premier League (FPL).'
    },
    {
      q: 'How are payouts processed?',
      a: 'Payouts are processed automatically to your registered payment method within 24 hours of a gameweek\'s conclusion. You will receive a notification once the funds have been disbursed.'
    },
    {
      q: 'What is the 10% service fee for?',
      a: 'The 10% service fee helps us cover operational costs, including server maintenance, payment processing fees, and continuous development to bring you new features and a better experience.'
    },
     {
      q: 'Can I create private leagues for just my friends?',
      a: 'Absolutely! You can create private leagues from the "My Leagues" page and share the unique invite code with your friends.'
    },
  ];

  const FaqItem: React.FC<{ q: string, a: string }> = ({ q, a }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="border-b border-brand-border">
        <button
          className="w-full flex justify-between items-center text-left py-4"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span className="text-lg font-medium text-white">{q}</span>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
            <ChevronDownIcon className="w-6 h-6 text-slate-400" />
          </motion.div>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="pb-4 text-slate-300">{a}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };
    
  return (
      <motion.div variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.5 }}>
        {/* Hero Section */}
        <section className="text-center py-20 lg:py-32">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl lg:text-6xl font-extrabold text-white leading-tight"
          >
            Where Fantasy Football<br />Meets <span className="text-brand-primary-accent">Real Winnings</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-2xl mx-auto text-lg text-slate-300"
          >
            Join weekly competitive leagues, challenge other managers, and win cash prizes based on your FPL team's performance.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10"
          >
            <NavLink to="/leagues" className="inline-flex items-center bg-gradient-to-r from-brand-primary-accent to-blue-600 text-white font-bold py-4 px-8 rounded-lg shadow-lg text-lg transition-transform transform hover:scale-105">
              Browse Leagues <ArrowRightIcon className="w-5 h-5 ml-2" />
            </NavLink>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center text-white mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} viewport={{ once: true }} className="bg-brand-secondary/50 p-8 rounded-xl border border-brand-border">
              <div className="bg-brand-primary-accent/20 text-brand-primary-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6"><UsersIcon className="w-8 h-8"/></div>
              <h3 className="text-xl font-bold text-white mb-2">1. Join a League</h3>
              <p className="text-slate-400">Browse public leagues or create a private one for you and your friends. Choose your entry fee and get in the game.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} viewport={{ once: true }} className="bg-brand-secondary/50 p-8 rounded-xl border border-brand-border">
              <div className="bg-brand-secondary-accent/20 text-brand-secondary-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6"><AwardIcon className="w-8 h-8"/></div>
              <h3 className="text-xl font-bold text-white mb-2">2. Compete Weekly</h3>
              <p className="text-slate-400">Your FPL team's gameweek points are automatically tracked. Climb the leaderboard and prove your managerial skills.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} viewport={{ once: true }} className="bg-brand-secondary/50 p-8 rounded-xl border border-brand-border">
              <div className="bg-green-500/20 text-green-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6"><DollarSignIcon className="w-8 h-8"/></div>
              <h3 className="text-xl font-bold text-white mb-2">3. Win Cash Prizes</h3>
              <p className="text-slate-400">The top-scoring managers at the end of the gameweek win a share of the prize pool, with a 10% house cut for utilities.</p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => <FaqItem key={index} q={item.q} a={item.a} />)}
          </div>
        </section>
      </motion.div>
  );
};

// Main component that decides which view to render
const Dashboard: React.FC = () => {
  const location = useLocation();
  
  const renderView = () => {
    switch(location.pathname) {
      case '/dashboard':
        return <UserDashboardView />;
      case '/':
        return <HomePageView />;
      case '/leagues':
        return <PublicLeaguesView />;
      default:
        return <HomePageView />;
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname}>
        {renderView()}
      </motion.div>
    </AnimatePresence>
  );
};

export default Dashboard;