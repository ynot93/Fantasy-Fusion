
import { League, Member, UserProfile, PlayerStat, Transaction, AdminUser, UserStatus, UserRole, AdminLeague, LeagueStatus, AdminTransaction, FraudAlert, HomepageContent, Announcement, HelpArticle, AnalyticsData, SystemSettingsData, Backup, FplSummary } from '../types';

let mockLeagues: League[] = [
  { id: 'l1', name: 'Ksh 100 Pro League #1', entryFee: 100, maxMembers: 20, members: Array.from({ length: 20 }, (_, i) => ({ id: `u${i}`, name: `Player ${i + 1}`, teamName: `Team ${i+1}`, points: Math.floor(Math.random() * 80) })), isPrivate: false, prizePool: 1800 },
  { id: 'l2', name: 'Ksh 100 Pro League #2', entryFee: 100, maxMembers: 20, members: Array.from({ length: 15 }, (_, i) => ({ id: `u${i+20}`, name: `Player ${i + 21}`, teamName: `Team ${i+21}`, points: Math.floor(Math.random() * 80) })), isPrivate: false, prizePool: 1350 },
  { id: 'l3', name: 'Ksh 200 Elite Challenge', entryFee: 200, maxMembers: 20, members: Array.from({ length: 18 }, (_, i) => ({ id: `u${i+40}`, name: `User ${i + 41}`, teamName: `FC ${i+41}`, points: Math.floor(Math.random() * 80) })), isPrivate: false, prizePool: 3240 },
  { id: 'l4', name: 'Ksh 500 High Rollers', entryFee: 500, maxMembers: 20, members: Array.from({ length: 7 }, (_, i) => ({ id: `u${i+60}`, name: `Manager ${i + 61}`, teamName: `Winners ${i+61}`, points: Math.floor(Math.random() * 80) })), isPrivate: false, prizePool: 3150 },
  { id: 'l5', name: 'Ksh 1000 Legends Arena', entryFee: 1000, maxMembers: 20, members: Array.from({ length: 19 }, (_, i) => ({ id: `u${i+80}`, name: `Legend ${i + 81}`, teamName: `Legends ${i+81}`, points: Math.floor(Math.random() * 80) })), isPrivate: false, prizePool: 17100 },
  { id: 'l6', name: 'Weekend Warriors (Private)', entryFee: 200, maxMembers: 10, members: Array.from({ length: 4 }, (_, i) => ({ id: `u${i+100}`, name: `Friend ${i + 1}`, teamName: `Buddies ${i+1}`, points: Math.floor(Math.random() * 80) })), isPrivate: true, prizePool: 720 },
];

let myJoinedLeaguesIds = new Set<string>(['l4', 'l6']);

const currentUser: UserProfile = {
    id: 'user_current',
    name: 'Alex Mercer',
    email: 'alex.mercer@email.com',
    fplTeamId: '1234567',
    avatarUrl: 'https://picsum.photos/seed/alex/100/100',
    teamName: 'Mercer FC',
};

const mockFplSummary: FplSummary = {
    overallPoints: 1850,
    overallRank: 123456,
    totalPlayers: 11000000,
};

const mockPlayerStats: PlayerStat[] = [
    { id: 'p1', name: 'Erling Haaland', team: 'Man City', position: 'FWD', price: 14.2, goals: 27, assists: 7, cleanSheets: 10, selectionPercent: 58.1 },
    { id: 'p2', name: 'Cole Palmer', team: 'Chelsea', position: 'MID', price: 7.9, goals: 22, assists: 11, cleanSheets: 8, selectionPercent: 45.3 },
    { id: 'p3', name: 'Bukayo Saka', team: 'Arsenal', position: 'MID', price: 9.2, goals: 16, assists: 9, cleanSheets: 16, selectionPercent: 62.5 },
    { id: 'p4', name: 'William Saliba', team: 'Arsenal', position: 'DEF', price: 6.1, goals: 2, assists: 1, cleanSheets: 18, selectionPercent: 55.2 },
    { id: 'p5', name: 'Alisson Becker', team: 'Liverpool', position: 'GK', price: 5.8, goals: 0, assists: 1, cleanSheets: 9, saves: 76, selectionPercent: 12.0 },
    { id: 'p6', name: 'Son Heung-min', team: 'Spurs', position: 'MID', price: 9.9, goals: 17, assists: 10, cleanSheets: 7, selectionPercent: 30.7 },
    { id: 'p7', name: 'Ollie Watkins', team: 'Aston Villa', position: 'FWD', price: 8.5, goals: 19, assists: 13, cleanSheets: 9, selectionPercent: 40.1 },
    { id: 'p8', name: 'Gabriel Magalhães', team: 'Arsenal', position: 'DEF', price: 5.4, goals: 4, assists: 0, cleanSheets: 17, selectionPercent: 28.9 },
    { id: 'p9', name: 'André Onana', team: 'Man Utd', position: 'GK', price: 5.0, goals: 0, assists: 0, cleanSheets: 9, saves: 149, selectionPercent: 20.3 },
    { id: 'p10', name: 'Mohamed Salah', team: 'Liverpool', position: 'MID', price: 13.3, goals: 18, assists: 10, cleanSheets: 8, selectionPercent: 25.4 },
];

const mockWallet = {
    currentBalance: 1200.00,
    pendingWinnings: 450.00,
};

const mockTransactions: Transaction[] = [
    { id: 't1', date: new Date('2024-08-26T10:00:00Z').toISOString(), description: 'Gameweek 2 Winnings', amount: 1800, type: 'winnings', status: 'Completed' },
    { id: 't2', date: new Date('2024-08-25T15:30:00Z').toISOString(), description: 'Withdrawal to M-Pesa', amount: -2000, type: 'withdrawal', status: 'Completed' },
    { id: 't3', date: new Date('2024-08-20T11:00:00Z').toISOString(), description: 'League Entry: High Rollers', amount: -500, type: 'entry_fee', status: 'Completed' },
    { id: 't4', date: new Date('2024-08-19T09:00:00Z').toISOString(), description: 'Gameweek 1 Winnings', amount: 900, type: 'winnings', status: 'Pending' },
    { id: 't5', date: new Date('2024-08-18T14:00:00Z').toISOString(), description: 'Deposit from Card', amount: 1000, type: 'deposit', status: 'Completed' },
    { id: 't6', date: new Date('2024-08-17T18:00:00Z').toISOString(), description: 'League Entry: Weekend Warriors', amount: -200, type: 'entry_fee', status: 'Completed' },
];

let mockAdminUsers: AdminUser[] = [
    { id: 'au1', name: 'Admin User', email: 'admin@fplnexus.com', avatarUrl: 'https://picsum.photos/seed/admin/100/100', role: 'Admin', status: 'Active', joinedDate: '2023-01-15T10:00:00Z' },
    { id: currentUser.id, name: currentUser.name, email: currentUser.email, avatarUrl: currentUser.avatarUrl, role: 'User', status: 'Active', joinedDate: '2023-05-20T14:30:00Z' },
    { id: 'au2', name: 'Jane Doe', email: 'jane.doe@email.com', avatarUrl: 'https://picsum.photos/seed/jane/100/100', role: 'Moderator', status: 'Active', joinedDate: '2023-06-01T11:00:00Z' },
    { id: 'au3', name: 'John Smith', email: 'john.smith@email.com', avatarUrl: 'https://picsum.photos/seed/john/100/100', role: 'User', status: 'Banned', joinedDate: '2023-07-10T09:00:00Z' },
    { id: 'au4', name: 'Emily White', email: 'emily.white@email.com', avatarUrl: 'https://picsum.photos/seed/emily/100/100', role: 'User', status: 'Active', joinedDate: '2023-08-22T18:45:00Z' },
    { id: 'au5', name: 'Michael Brown', email: 'michael.brown@email.com', avatarUrl: 'https://picsum.photos/seed/michael/100/100', role: 'User', status: 'Active', joinedDate: '2023-09-05T12:00:00Z' },
    { id: 'au6', name: 'Sarah Green', email: 'sarah.green@email.com', avatarUrl: 'https://picsum.photos/seed/sarah/100/100', role: 'Moderator', status: 'Active', joinedDate: '2023-10-11T16:20:00Z' },
    { id: 'au7', name: 'David Black', email: 'david.black@email.com', avatarUrl: 'https://picsum.photos/seed/david/100/100', role: 'User', status: 'Banned', joinedDate: '2023-11-30T20:00:00Z' },
    { id: 'au8', name: 'Laura Grey', email: 'laura.grey@email.com', avatarUrl: 'https://picsum.photos/seed/laura/100/100', role: 'User', status: 'Active', joinedDate: '2024-01-02T13:10:00Z' },
    { id: 'au9', name: 'Chris Blue', email: 'chris.blue@email.com', avatarUrl: 'https://picsum.photos/seed/chris/100/100', role: 'User', status: 'Active', joinedDate: '2024-02-14T11:55:00Z' },
    { id: 'au10', name: 'Patricia Yellow', email: 'patricia.yellow@email.com', avatarUrl: 'https://picsum.photos/seed/patricia/100/100', role: 'User', status: 'Active', joinedDate: '2024-03-19T08:30:00Z' },
];

let mockAdminLeagues: AdminLeague[] = [
  { id: 'l1', name: 'Ksh 100 Pro League #1', creator: { id: 'au5', name: 'Michael Brown' }, entryFee: 100, participants: 20, maxParticipants: 20, prizePool: 1800, status: 'Completed', startDate: '2024-08-10T12:00:00Z', endDate: '2024-08-12T12:00:00Z', members: Array.from({ length: 20 }, (_, i) => ({ id: `u${i}`, name: `Player ${i + 1}`, teamName: `Team ${i+1}`, points: Math.floor(Math.random() * 80) })) },
  { id: 'l2', name: 'Ksh 100 Pro League #2', creator: { id: 'au2', name: 'Jane Doe' }, entryFee: 100, participants: 15, maxParticipants: 20, prizePool: 1350, status: 'Ongoing', startDate: '2024-08-17T12:00:00Z', endDate: '2024-08-19T12:00:00Z', members: Array.from({ length: 15 }, (_, i) => ({ id: `u${i+20}`, name: `Player ${i + 21}`, teamName: `Team ${i+21}`, points: Math.floor(Math.random() * 80) })) },
  { id: 'l3', name: 'Ksh 200 Elite Challenge', creator: { id: 'au6', name: 'Sarah Green' }, entryFee: 200, participants: 18, maxParticipants: 20, prizePool: 3240, status: 'Ongoing', startDate: '2024-08-17T12:00:00Z', endDate: '2024-08-19T12:00:00Z', members: Array.from({ length: 18 }, (_, i) => ({ id: `u${i+40}`, name: `User ${i + 41}`, teamName: `FC ${i+41}`, points: Math.floor(Math.random() * 80) })) },
  { id: 'l4', name: 'Ksh 500 High Rollers', creator: { id: 'au9', name: 'Chris Blue' }, entryFee: 500, participants: 7, maxParticipants: 20, prizePool: 3150, status: 'Open', startDate: '2024-08-24T12:00:00Z', endDate: '2024-08-26T12:00:00Z', members: Array.from({ length: 7 }, (_, i) => ({ id: `u${i+60}`, name: `Manager ${i + 61}`, teamName: `Winners ${i+61}`, points: Math.floor(Math.random() * 80) })) },
  { id: 'l5', name: 'Ksh 1000 Legends Arena', creator: { id: 'au1', name: 'Admin User' }, entryFee: 1000, participants: 19, maxParticipants: 20, prizePool: 17100, status: 'Payouts Approved', startDate: '2024-08-03T12:00:00Z', endDate: '2024-08-05T12:00:00Z', members: Array.from({ length: 19 }, (_, i) => ({ id: `u${i+80}`, name: `Legend ${i + 81}`, teamName: `Legends ${i+81}`, points: Math.floor(Math.random() * 80) })) },
  { id: 'l6', name: 'Weekend Warriors (Private)', creator: { id: currentUser.id, name: currentUser.name }, entryFee: 200, participants: 4, maxParticipants: 10, prizePool: 720, status: 'Completed', startDate: '2024-08-10T12:00:00Z', endDate: '2024-08-12T12:00:00Z', members: Array.from({ length: 4 }, (_, i) => ({ id: `u${i+100}`, name: `Friend ${i + 1}`, teamName: `Buddies ${i+1}`, points: Math.floor(Math.random() * 80) })) },
];

const mockAdminTransactions: AdminTransaction[] = [
    { id: 'at1', user: mockAdminUsers[1], date: '2024-08-26T10:00:00Z', description: 'Gameweek 2 Winnings', amount: 1800, type: 'winnings', status: 'Completed' },
    { id: 'at2', user: mockAdminUsers[2], date: '2024-08-26T09:00:00Z', description: 'Deposit via M-Pesa', amount: 500, type: 'deposit', status: 'Completed' },
    { id: 'at3', user: mockAdminUsers[3], date: '2024-08-25T18:00:00Z', description: 'Withdrawal Request', amount: -1000, type: 'withdrawal', status: 'Pending' },
    { id: 'at4', user: mockAdminUsers[4], date: '2024-08-25T11:00:00Z', description: 'League Entry: Elite', amount: -200, type: 'entry_fee', status: 'Completed' },
    { id: 'at5', user: mockAdminUsers[5], date: '2024-08-24T14:20:00Z', description: 'League Entry: Pro', amount: -100, type: 'entry_fee', status: 'Completed' },
    { id: 'at6', user: mockAdminUsers[6], date: '2024-08-23T16:00:00Z', description: 'Deposit via Card', amount: 2000, type: 'deposit', status: 'Completed' },
    { id: 'at7', user: mockAdminUsers[7], date: '2024-08-22T10:00:00Z', description: 'Deposit via Card', amount: 500, type: 'deposit', status: 'Failed' },
    { id: 'at8', user: mockAdminUsers[8], date: '2024-08-21T12:00:00Z', description: 'Gameweek 1 Winnings', amount: 450, type: 'winnings', status: 'Completed' },
    { id: 'at9', user: mockAdminUsers[9], date: '2024-08-20T08:45:00Z', description: 'Withdrawal to Bank', amount: -5000, type: 'withdrawal', status: 'Completed' },
    { id: 'at10', user: mockAdminUsers[10], date: '2024-08-19T20:00:00Z', description: 'League Entry: High Roller', amount: -500, type: 'entry_fee', status: 'Completed' },
];

const mockFraudAlerts: FraudAlert[] = [
    { id: 'fa1', level: 'High', message: 'User au3 attempted 5 failed withdrawals in 1 hour.', timestamp: '2024-08-26T11:05:00Z', userId: 'au3' },
    { id: 'fa2', level: 'Medium', message: 'Multiple accounts (au4, au8) logged in from the same IP address.', timestamp: '2024-08-26T08:20:00Z', userId: 'au4' },
    { id: 'fa3', level: 'Low', message: 'Unusual deposit amount from user au9.', timestamp: '2024-08-25T19:30:00Z', userId: 'au9' },
];

let mockHomepageContent: HomepageContent = {
    heroTitle: 'Where Fantasy Football<br />Meets <span class="text-brand-primary-accent">Real Winnings</span>',
    heroSubtitle: 'Join weekly competitive leagues, challenge other managers, and win cash prizes based on your FPL team\'s performance.',
    bannerImageUrl: '/img/hero-banner.jpg',
};

let mockAnnouncements: Announcement[] = [
    { id: 'an1', title: 'New Season, New Features!', content: 'Welcome to the 2024/2025 season! We\'ve rolled out a new user dashboard and improved performance across the site. Good luck managers!', date: '2024-08-15T10:00:00Z', status: 'Published' },
    { id: 'an2', title: 'Gameweek 3 Payouts Processed', content: 'All winnings for Gameweek 3 have been processed. Please check your wallets. Contact support if you have any issues.', date: '2024-08-28T14:00:00Z', status: 'Published' },
    { id: 'an3', title: 'Upcoming System Maintenance', content: 'We will be undergoing scheduled maintenance on September 5th from 02:00 to 04:00. The platform may be unavailable during this time.', date: '2024-09-01T18:00:00Z', status: 'Draft' },
];

let mockHelpArticles: HelpArticle[] = [
    { id: 'ha1', question: 'How are winners determined?', answer: 'Winners are determined based on the highest Fantasy Premier League points accumulated for that specific gameweek. In case of a tie, the prize is split equally.', category: 'Gameplay', lastUpdated: '2024-07-20T11:00:00Z' },
    { id: 'ha2', question: 'How do I withdraw my winnings?', answer: 'Navigate to your Wallet page, click the "Withdraw" button, and follow the instructions. We support withdrawals via M-Pesa and Bank Transfer.', category: 'Payments', lastUpdated: '2024-08-01T09:30:00Z' },
    { id: 'ha3', question: 'Is this app affiliated with the official FPL?', answer: 'No, FPL Nexus is a third-party application and is not affiliated with the official Fantasy Premier League (FPL).', category: 'General', lastUpdated: '2024-06-10T15:00:00Z' },
    { id: 'ha4', question: 'What is the 10% service fee for?', answer: 'The 10% service fee helps us cover operational costs, including server maintenance, payment processing fees, and continuous development to bring you new features and a better experience.', category: 'Payments', lastUpdated: '2024-07-25T16:45:00Z' },
];

const mockAnalyticsData: AnalyticsData = {
  userTrends: [
    { period: 'DAU', value: 152 },
    { period: 'WAU', value: 876 },
    { period: 'MAU', value: 2450 },
  ],
  retentionCohorts: [
    { cohort: 'Aug 1 - Aug 7', newUsers: 250, weeklyRetention: [100, 62.4, 51.2, 45.6, 40.0, 35.2, 31.8, 28.1] },
    { cohort: 'Aug 8 - Aug 14', newUsers: 310, weeklyRetention: [100, 65.1, 53.5, 48.2, 42.1, 38.7, 34.5, null] },
    { cohort: 'Aug 15 - Aug 21', newUsers: 285, weeklyRetention: [100, 60.7, 50.1, 44.3, 39.8, 36.1, null, null] },
    { cohort: 'Aug 22 - Aug 28', newUsers: 350, weeklyRetention: [100, 68.2, 55.9, 50.1, 45.3, null, null, null] },
    { cohort: 'Aug 29 - Sep 4', newUsers: 320, weeklyRetention: [100, 64.5, 52.8, 47.0, null, null, null, null] },
    { cohort: 'Sep 5 - Sep 11', newUsers: 410, weeklyRetention: [100, 70.1, 58.2, null, null, null, null, null] },
    { cohort: 'Sep 12 - Sep 18', newUsers: 380, weeklyRetention: [100, 66.8, null, null, null, null, null, null] },
    { cohort: 'Sep 19 - Today', newUsers: 290, weeklyRetention: [100, null, null, null, null, null, null, null] },
  ],
  topLeagues: [
    { id: 'l5', name: 'Ksh 1000 Legends Arena', participants: 19, prizePool: 17100 },
    { id: 'l1', name: 'Ksh 100 Pro League #1', participants: 20, prizePool: 1800 },
    { id: 'l3', name: 'Ksh 200 Elite Challenge', participants: 18, prizePool: 3240 },
    { id: 'l2', name: 'Ksh 100 Pro League #2', participants: 15, prizePool: 1350 },
    { id: 'l4', name: 'Ksh 500 High Rollers', participants: 7, prizePool: 3150 },
  ],
  topPlayers: [
    { id: 'au1', name: 'Admin User', avatarUrl: 'https://picsum.photos/seed/admin/100/100', totalWinnings: 18000 },
    { id: 'au9', name: 'Chris Blue', avatarUrl: 'https://picsum.photos/seed/chris/100/100', totalWinnings: 12500 },
    { id: 'au2', name: 'Jane Doe', avatarUrl: 'https://picsum.photos/seed/jane/100/100', totalWinnings: 9800 },
    { id: 'au6', name: 'Sarah Green', avatarUrl: 'https://picsum.photos/seed/sarah/100/100', totalWinnings: 7200 },
    { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl, totalWinnings: 5500 },
  ],
};

let mockSystemSettings: SystemSettingsData = {
    apiKeys: {
        fpl: 'fpl_live_xxxxxxxxxxxx',
        stripePublic: 'pk_test_xxxxxxxxxxxx',
        stripeSecret: 'sk_test_xxxxxxxxxxxx',
        mpesaKey: 'mpesa_key_xxxxxxxx',
        mpesaSecret: 'mpesa_secret_xxxxxxxx',
    },
    branding: {
        appName: 'FPL Nexus',
        primaryColor: '#58A6FF',
        secondaryColor: '#F778BA',
    },
    backups: [
        { id: 'bkp1', timestamp: new Date(Date.now() - 86400000).toISOString(), size: '15.2 MB' },
        { id: 'bkp2', timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), size: '14.8 MB' },
        { id: 'bkp3', timestamp: new Date(Date.now() - 30 * 86400000).toISOString(), size: '14.5 MB' },
    ]
};


const simulateDelay = <T,>(data: T): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), 500 + Math.random() * 800));

export const fantasyApi = {
  getPublicLeagues: (): Promise<League[]> => {
    return simulateDelay(mockLeagues.filter(l => !l.isPrivate));
  },

  getMyLeagues: (): Promise<League[]> => {
    const myLeagues = mockLeagues.filter(l => myJoinedLeaguesIds.has(l.id));
    return simulateDelay(myLeagues);
  },
  
  getLeagueDetails: (leagueId: string): Promise<League | undefined> => {
     const league = mockLeagues.find(l => l.id === leagueId);
     if (league) {
        league.members.sort((a, b) => b.points - a.points);
     }
     return simulateDelay(league);
  },

  joinLeague: (leagueId: string): Promise<{ success: boolean; message: string }> => {
    const league = mockLeagues.find(l => l.id === leagueId);
    if (!league) return simulateDelay({ success: false, message: 'League not found.' });
    if (league.members.length >= league.maxMembers) return simulateDelay({ success: false, message: 'League is full.' });
    if (myJoinedLeaguesIds.has(leagueId)) return simulateDelay({ success: false, message: 'Already in this league.' });
    
    myJoinedLeaguesIds.add(leagueId);
    const newMember: Member = { id: currentUser.id, name: currentUser.name, teamName: 'My Awesome Team', points: Math.floor(Math.random() * 80), isCurrentUser: true };
    league.members.push(newMember);
    league.prizePool = league.entryFee * league.members.length * 0.9;
    
    return simulateDelay({ success: true, message: `Successfully joined ${league.name}!` });
  },

  createLeague: (name: string, entryFee: number, isPrivate: boolean, maxMembers: number): Promise<{ success: true, newLeague: League } | { success: false, message: string }> => {
    const newLeague: League = {
      id: `l${Date.now()}`,
      name,
      entryFee,
      isPrivate,
      maxMembers,
      members: [{ id: currentUser.id, name: currentUser.name, teamName: 'My Awesome Team', points: 0, isCurrentUser: true }],
      prizePool: entryFee * 0.9
    };
    mockLeagues.push(newLeague);
    myJoinedLeaguesIds.add(newLeague.id);
    return simulateDelay({ success: true, newLeague });
  },
  
  getUserProfile: (): Promise<UserProfile> => {
      return simulateDelay(currentUser);
  },
  
  getFplSummary: (): Promise<FplSummary> => {
      return simulateDelay(mockFplSummary);
  },

  updateUserProfile: (data: Partial<UserProfile>): Promise<UserProfile> => {
      Object.assign(currentUser, data);
      return simulateDelay(currentUser);
  },

  getPlayerStats: (): Promise<PlayerStat[]> => {
      return simulateDelay(mockPlayerStats);
  },

  getWalletDetails: (): Promise<{ currentBalance: number; pendingWinnings: number; }> => {
      return simulateDelay(mockWallet);
  },

  getTransactions: (): Promise<Transaction[]> => {
      return simulateDelay(mockTransactions);
  },

  getAdminDashboardStats: (): Promise<{ totalUsers: number; activeLeagues: number; totalRevenue: number; totalTransfers: number; }> => {
    const stats = {
        totalUsers: 104, // Sum of all unique members
        activeLeagues: mockLeagues.length,
        totalRevenue: mockLeagues.reduce((acc, l) => acc + (l.prizePool / 0.9), 0),
        totalTransfers: mockTransactions.length,
    };
    return simulateDelay(stats);
  },

  // Admin User Management APIs
  getUsers: (): Promise<AdminUser[]> => {
    return simulateDelay(mockAdminUsers);
  },

  updateUserStatus: (userId: string, status: UserStatus): Promise<{ success: boolean }> => {
    const user = mockAdminUsers.find(u => u.id === userId);
    if (user) {
      user.status = status;
      return simulateDelay({ success: true });
    }
    return simulateDelay({ success: false });
  },

  updateUserRole: (userId: string, role: UserRole): Promise<{ success: boolean }> => {
    const user = mockAdminUsers.find(u => u.id === userId);
    if (user) {
      user.role = role;
      return simulateDelay({ success: true });
    }
    return simulateDelay({ success: false });
  },

  // Admin League Management
  getAdminLeagues: (): Promise<AdminLeague[]> => {
    return simulateDelay(mockAdminLeagues);
  },

  getAdminLeagueDetails: (leagueId: string): Promise<AdminLeague | undefined> => {
    const league = mockAdminLeagues.find(l => l.id === leagueId);
    if (league) {
        league.members.sort((a, b) => b.points - a.points);
    }
    return simulateDelay(league);
  },

  updateLeagueStatus: (leagueId: string, status: LeagueStatus): Promise<{ success: boolean }> => {
    const league = mockAdminLeagues.find(l => l.id === leagueId);
    if (league) {
        league.status = status;
        return simulateDelay({ success: true });
    }
    return simulateDelay({ success: false });
  },

  recalculateLeaguePoints: (leagueId: string): Promise<{ success: boolean }> => {
    const league = mockAdminLeagues.find(l => l.id === leagueId);
    if (league) {
        league.members.forEach(member => {
            member.points = Math.floor(Math.random() * 100);
        });
        return simulateDelay({ success: true });
    }
    return simulateDelay({ success: false });
  },

  // Admin Finance APIs
  getAdminTransactions: (): Promise<AdminTransaction[]> => {
    return simulateDelay(mockAdminTransactions);
  },

  getFinancialSummary: (): Promise<{ totalRevenue: number; feesCollected: number; totalPayouts: number; netProfit: number; fraudAlerts: FraudAlert[] }> => {
    const totalRevenue = mockAdminTransactions.filter(t => t.type === 'entry_fee').reduce((sum, t) => sum - t.amount, 0);
    const feesCollected = totalRevenue * 0.1;
    const totalPayouts = mockAdminTransactions.filter(t => t.type === 'winnings').reduce((sum, t) => sum + t.amount, 0);
    return simulateDelay({
        totalRevenue: totalRevenue,
        feesCollected: feesCollected,
        totalPayouts: totalPayouts,
        netProfit: feesCollected - (totalPayouts * 0), // Assuming payouts are covered by entry fees
        fraudAlerts: mockFraudAlerts
    });
  },

  // Admin CMS APIs
  getHomepageContent: (): Promise<HomepageContent> => {
    return simulateDelay(mockHomepageContent);
  },
  
  updateHomepageContent: (content: HomepageContent): Promise<{ success: boolean }> => {
    mockHomepageContent = content;
    return simulateDelay({ success: true });
  },

  getAnnouncements: (): Promise<Announcement[]> => {
    return simulateDelay(mockAnnouncements);
  },

  saveAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'> & { id?: string }): Promise<Announcement> => {
    if (announcement.id) {
        const index = mockAnnouncements.findIndex(a => a.id === announcement.id);
        if (index > -1) {
            mockAnnouncements[index] = { ...mockAnnouncements[index], ...announcement };
            return simulateDelay(mockAnnouncements[index]);
        }
    }
    const newAnnouncement: Announcement = {
        id: `an${Date.now()}`,
        date: new Date().toISOString(),
        ...announcement
    };
    mockAnnouncements.unshift(newAnnouncement);
    return simulateDelay(newAnnouncement);
  },

  deleteAnnouncement: (id: string): Promise<{ success: boolean }> => {
    mockAnnouncements = mockAnnouncements.filter(a => a.id !== id);
    return simulateDelay({ success: true });
  },

  getHelpArticles: (): Promise<HelpArticle[]> => {
    return simulateDelay(mockHelpArticles);
  },

  saveHelpArticle: (article: Omit<HelpArticle, 'id' | 'lastUpdated'> & { id?: string }): Promise<HelpArticle> => {
     if (article.id) {
        const index = mockHelpArticles.findIndex(a => a.id === article.id);
        if (index > -1) {
            mockHelpArticles[index] = { ...mockHelpArticles[index], ...article, lastUpdated: new Date().toISOString() };
            return simulateDelay(mockHelpArticles[index]);
        }
    }
    const newArticle: HelpArticle = {
        id: `ha${Date.now()}`,
        lastUpdated: new Date().toISOString(),
        ...article
    };
    mockHelpArticles.unshift(newArticle);
    return simulateDelay(newArticle);
  },
  
  deleteHelpArticle: (id: string): Promise<{ success: boolean }> => {
    mockHelpArticles = mockHelpArticles.filter(a => a.id !== id);
    return simulateDelay({ success: true });
  },

  // Admin Analytics API
  getAnalyticsData: (): Promise<AnalyticsData> => {
    return simulateDelay(mockAnalyticsData);
  },

  // Admin System Settings APIs
  getSystemSettings: (): Promise<SystemSettingsData> => {
      return simulateDelay(mockSystemSettings);
  },

  updateSystemSettings: (settings: Partial<SystemSettingsData>): Promise<{ success: boolean }> => {
      if (settings.apiKeys) {
          mockSystemSettings.apiKeys = settings.apiKeys;
      }
      if (settings.branding) {
          mockSystemSettings.branding = settings.branding;
      }
      return simulateDelay({ success: true });
  },

  createBackup: (): Promise<Backup> => {
      const newBackup: Backup = {
          id: `bkp${Date.now()}`,
          timestamp: new Date().toISOString(),
          size: `${(15 + Math.random()).toFixed(1)} MB`
      };
      mockSystemSettings.backups.unshift(newBackup);
      return simulateDelay(newBackup);
  },

  deleteBackup: (id: string): Promise<{ success: boolean }> => {
      mockSystemSettings.backups = mockSystemSettings.backups.filter(b => b.id !== id);
      return simulateDelay({ success: true });
  }
};
