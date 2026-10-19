
import { League, Member, UserProfile, PlayerStat, Transaction, AdminUser, UserStatus, UserRole, AdminLeague, LeagueStatus, AdminTransaction, FraudAlert, HomepageContent, Announcement, HelpArticle, AnalyticsData, SystemSettingsData, Backup, FplSummary, AuthUser, FplTeamPreview, FplVerificationStatus } from '../types';
import { apiFetch, ApiError } from './http';
import { centsToKsh, kshToCents } from './money';

interface BackendUserResponse {
  id: number;
  email: string;
  username: string;
  fpl_manager_id: number | null;
  fpl_verified: boolean;
  role: string;
}

interface BackendTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: BackendUserResponse;
}

const toAuthUser = (u: BackendUserResponse): AuthUser => ({
  id: String(u.id),
  email: u.email,
  username: u.username,
  fplManagerId: u.fpl_manager_id,
  fplVerified: u.fpl_verified,
  role: u.role as AuthUser['role'],
});

const toTokens = (res: BackendTokenResponse) => ({
  accessToken: res.access_token,
  refreshToken: res.refresh_token,
  user: toAuthUser(res.user),
});

interface BackendFplLinkResponse {
  user: BackendUserResponse;
  team: {
    manager_id: number;
    team_name: string | null;
    manager_name: string | null;
    overall_points: number | null;
  };
}

interface BackendLeagueMember {
  id: number;
  email: string;
  fpl_manager_id: number | null;
  role: string;
  name?: string | null;
  team_name?: string | null;
  points?: number | null;
}

interface BackendLeague {
  id: number;
  code: string;
  name: string;
  created_by_id: number;
  is_private: boolean;
  max_members: number | null;
  entry_fee_cents: number;
  prize_pool_cents: number;
  members: BackendLeagueMember[];
}

const toMember = (m: BackendLeagueMember): Member => ({
  id: String(m.id),
  name: m.name ?? m.email,
  teamName: m.team_name ?? '—',
  points: m.points ?? 0,
});

interface BackendTransaction {
  id: number;
  league_id: number | null;
  type: 'DEPOSIT' | 'WITHDRAW' | 'LEAGUE_CONTRIBUTION' | 'PAYOUT' | 'HOUSE_FEE' | 'ADJUSTMENT';
  provider: string | null;
  amount_cents: number;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  created_at: string;
}

const TX_TYPE_MAP: Record<BackendTransaction['type'], Transaction['type']> = {
  DEPOSIT: 'deposit',
  WITHDRAW: 'withdrawal',
  LEAGUE_CONTRIBUTION: 'entry_fee',
  PAYOUT: 'winnings',
  HOUSE_FEE: 'house_fee',
  ADJUSTMENT: 'adjustment',
};

const TX_STATUS_MAP: Record<BackendTransaction['status'], Transaction['status']> = {
  PENDING: 'Pending',
  SUCCEEDED: 'Completed',
  FAILED: 'Failed',
};

const TX_DESCRIPTIONS: Record<BackendTransaction['type'], string> = {
  DEPOSIT: 'Deposit',
  WITHDRAW: 'Withdrawal',
  LEAGUE_CONTRIBUTION: 'League Entry',
  PAYOUT: 'Winnings',
  HOUSE_FEE: 'Service Fee',
  ADJUSTMENT: 'Balance Adjustment',
};

const toTransaction = (t: BackendTransaction): Transaction => {
  // amount_cents is a positive magnitude for every type except ADJUSTMENT,
  // which already carries its own sign (see admin balance-adjustment endpoint).
  const isDebit = t.type === 'WITHDRAW' || t.type === 'LEAGUE_CONTRIBUTION' || t.type === 'HOUSE_FEE';
  const signedCents = t.type === 'ADJUSTMENT' ? t.amount_cents : (isDebit ? -t.amount_cents : t.amount_cents);
  return {
    id: String(t.id),
    date: t.created_at,
    description: `${TX_DESCRIPTIONS[t.type]}${t.provider ? ` via ${t.provider}` : ''}`,
    amount: centsToKsh(signedCents),
    type: TX_TYPE_MAP[t.type],
    status: TX_STATUS_MAP[t.status],
  };
};

interface BackendAdminUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  is_locked: boolean;
  created_at: string;
}

const avatarFor = (seed: string): string =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(seed)}&background=1e293b&color=fff`;

interface BackendAdminLeague {
  id: number;
  code: string;
  created_by_id: number;
  is_private: boolean;
  max_members: number | null;
  name: string;
  status: LeagueStatus;
  entry_fee_cents: number;
  prize_pool_cents: number;
  participant_count: number;
  official: boolean;
  creator: { id: number; username: string } | null;
  members?: BackendLeagueMember[];
}

const toAdminLeague = (l: BackendAdminLeague): AdminLeague => ({
  id: String(l.id),
  code: l.code,
  name: l.name,
  creator: l.creator ? { id: String(l.creator.id), name: l.creator.username } : null,
  entryFee: centsToKsh(l.entry_fee_cents),
  participants: l.participant_count,
  maxParticipants: l.max_members,
  prizePool: centsToKsh(l.prize_pool_cents),
  status: l.status,
  members: (l.members ?? []).map(toMember).sort((a, b) => b.points - a.points),
});

const toAdminUser = (u: BackendAdminUser): AdminUser => ({
  id: String(u.id),
  name: u.username,
  email: u.email,
  avatarUrl: avatarFor(u.username),
  role: u.role,
  status: u.status,
  joinedDate: u.created_at,
});

const toLeague = (l: BackendLeague): League => ({
  id: String(l.id),
  code: l.code,
  name: l.name,
  entryFee: centsToKsh(l.entry_fee_cents),
  maxMembers: l.max_members,
  members: l.members.map(toMember).sort((a, b) => b.points - a.points),
  isPrivate: l.is_private,
  prizePool: centsToKsh(l.prize_pool_cents),
});

const currentUser: UserProfile = {
    id: 'user_current',
    name: 'Alex Mercer',
    email: 'alex.mercer@email.com',
    fplTeamId: '1234567',
    avatarUrl: 'https://picsum.photos/seed/alex/100/100',
    teamName: 'Mercer FC',
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

// Retained only for the still-mocked admin dashboard stat (Phase 6a will replace it).
const mockTransactions: Transaction[] = [
    { id: 't1', date: new Date('2024-08-26T10:00:00Z').toISOString(), description: 'Gameweek 2 Winnings', amount: 1800, type: 'winnings', status: 'Completed' },
    { id: 't2', date: new Date('2024-08-25T15:30:00Z').toISOString(), description: 'Withdrawal to M-Pesa', amount: -2000, type: 'withdrawal', status: 'Completed' },
    { id: 't3', date: new Date('2024-08-20T11:00:00Z').toISOString(), description: 'League Entry: High Rollers', amount: -500, type: 'entry_fee', status: 'Completed' },
    { id: 't4', date: new Date('2024-08-19T09:00:00Z').toISOString(), description: 'Gameweek 1 Winnings', amount: 900, type: 'winnings', status: 'Pending' },
    { id: 't5', date: new Date('2024-08-18T14:00:00Z').toISOString(), description: 'Deposit from Card', amount: 1000, type: 'deposit', status: 'Completed' },
    { id: 't6', date: new Date('2024-08-17T18:00:00Z').toISOString(), description: 'League Entry: Weekend Warriors', amount: -200, type: 'entry_fee', status: 'Completed' },
];

// Retained only to populate the still-mocked admin transactions list (Phase 6b
// will replace it with real transactions joined to real users).
const mockAdminUsers: { id: string; name: string; avatarUrl: string }[] = [
    { id: 'au1', name: 'Admin User', avatarUrl: 'https://picsum.photos/seed/admin/100/100' },
    { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl },
    { id: 'au2', name: 'Jane Doe', avatarUrl: 'https://picsum.photos/seed/jane/100/100' },
    { id: 'au3', name: 'John Smith', avatarUrl: 'https://picsum.photos/seed/john/100/100' },
    { id: 'au4', name: 'Emily White', avatarUrl: 'https://picsum.photos/seed/emily/100/100' },
    { id: 'au5', name: 'Michael Brown', avatarUrl: 'https://picsum.photos/seed/michael/100/100' },
    { id: 'au6', name: 'Sarah Green', avatarUrl: 'https://picsum.photos/seed/sarah/100/100' },
    { id: 'au7', name: 'David Black', avatarUrl: 'https://picsum.photos/seed/david/100/100' },
    { id: 'au8', name: 'Laura Grey', avatarUrl: 'https://picsum.photos/seed/laura/100/100' },
    { id: 'au9', name: 'Chris Blue', avatarUrl: 'https://picsum.photos/seed/chris/100/100' },
    { id: 'au10', name: 'Patricia Yellow', avatarUrl: 'https://picsum.photos/seed/patricia/100/100' },
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

const joinByCode = async (code: string): Promise<{ success: boolean; message: string }> => {
  try {
    const joined = await apiFetch<BackendLeague>('/leagues/join', {
      method: 'POST',
      body: { code },
    });
    return { success: true, message: `Successfully joined ${joined.name}!` };
  } catch (err) {
    const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Could not join league.';
    return { success: false, message };
  }
};

export const fantasyApi = {
  login: async (email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> => {
    const res = await apiFetch<BackendTokenResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    return toTokens(res);
  },

  signup: async (email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> => {
    const res = await apiFetch<BackendTokenResponse>('/auth/signup', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    return toTokens(res);
  },

  // Always resolves the same way whether or not the email has an account
  requestPasswordReset: async (email: string): Promise<string> => {
    const res = await apiFetch<{ detail: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: { email },
      auth: false,
    });
    return res.detail;
  },

  confirmPasswordReset: async (token: string, password: string): Promise<string> => {
    const res = await apiFetch<{ detail: string }>('/auth/password-reset/confirm', {
      method: 'POST',
      body: { token, password },
      auth: false,
    });
    return res.detail;
  },

  getMe: async (): Promise<AuthUser> => {
    return toAuthUser(await apiFetch<BackendUserResponse>('/auth/me'));
  },

  // `team` is a bare manager ID or a pasted FPL Points-page URL; the backend parses either
  linkFplTeam: async (team: string): Promise<{ user: AuthUser; team: FplTeamPreview }> => {
    const res = await apiFetch<BackendFplLinkResponse>('/fpl/link', { method: 'POST', body: { team } });
    return {
      user: toAuthUser(res.user),
      team: {
        managerId: res.team.manager_id,
        teamName: res.team.team_name,
        managerName: res.team.manager_name,
        overallPoints: res.team.overall_points,
      },
    };
  },

  getFplVerification: async (): Promise<FplVerificationStatus> => {
    const res = await apiFetch<{ linked: boolean; verified: boolean; league_code: string | null }>('/fpl/verification');
    return { linked: res.linked, verified: res.verified, leagueCode: res.league_code };
  },

  verifyFplTeam: async (): Promise<AuthUser> => {
    return toAuthUser(await apiFetch<BackendUserResponse>('/fpl/verify', { method: 'POST' }));
  },

  getPublicLeagues: async (): Promise<League[]> => {
    const leagues = await apiFetch<BackendLeague[]>('/leagues/?is_private=false');
    return leagues.map(toLeague);
  },

  getMyLeagues: async (): Promise<League[]> => {
    const leagues = await apiFetch<BackendLeague[]>('/leagues/mine');
    return leagues.map(toLeague);
  },

  getLeagueDetails: async (leagueId: string): Promise<League | undefined> => {
    try {
      const league = await apiFetch<BackendLeague>(`/leagues/${leagueId}`);
      return toLeague(league);
    } catch {
      return undefined;
    }
  },

  joinLeague: async (leagueId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const league = await apiFetch<BackendLeague>(`/leagues/${leagueId}`);
      return await joinByCode(league.code);
    } catch (err) {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Could not join league.';
      return { success: false, message };
    }
  },

  joinLeagueByCode: (code: string): Promise<{ success: boolean; message: string }> => {
    return joinByCode(code);
  },

  createLeague: async (name: string, entryFee: number, isPrivate: boolean, maxMembers: number): Promise<{ success: true, newLeague: League } | { success: false, message: string }> => {
    try {
      const league = await apiFetch<BackendLeague>('/leagues/', {
        method: 'POST',
        body: {
          name,
          is_private: isPrivate,
          max_members: maxMembers,
          entry_fee_cents: kshToCents(entryFee),
        },
      });
      return { success: true, newLeague: toLeague(league) };
    } catch (err) {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Could not create league.';
      return { success: false, message };
    }
  },
  
  getUserProfile: (): Promise<UserProfile> => {
      return simulateDelay(currentUser);
  },
  
  getFplSummary: async (fplManagerId: number): Promise<FplSummary> => {
      const [entry, bootstrap] = await Promise.all([
        apiFetch<{ summary_overall_points: number; summary_overall_rank: number; summary_event_points: number }>(`/fpl/entry/${fplManagerId}`),
        apiFetch<{ total_players: number }>('/fpl/bootstrap'),
      ]);
      return {
        overallPoints: entry.summary_overall_points,
        overallRank: entry.summary_overall_rank,
        gameweekPoints: entry.summary_event_points,
        totalPlayers: bootstrap.total_players,
      };
  },

  updateUserProfile: (data: Partial<UserProfile>): Promise<UserProfile> => {
      Object.assign(currentUser, data);
      return simulateDelay(currentUser);
  },

  getPlayerStats: (): Promise<PlayerStat[]> => {
      return simulateDelay(mockPlayerStats);
  },

  getWalletDetails: async (): Promise<{ currentBalance: number; pendingWinnings: number; }> => {
      const [wallet, transactions] = await Promise.all([
        apiFetch<{ user_id: number; balance_cents: number }>('/payments/wallet'),
        apiFetch<BackendTransaction[]>('/payments/transactions'),
      ]);
      const pendingWinningsCents = transactions
        .filter(t => t.type === 'PAYOUT' && t.status === 'PENDING')
        .reduce((sum, t) => sum + t.amount_cents, 0);
      return {
        currentBalance: centsToKsh(wallet.balance_cents),
        pendingWinnings: centsToKsh(pendingWinningsCents),
      };
  },

  getTransactions: async (): Promise<Transaction[]> => {
      const transactions = await apiFetch<BackendTransaction[]>('/payments/transactions');
      return transactions.map(toTransaction);
  },

  deposit: async (amountKsh: number, provider: 'MPESA' = 'MPESA'): Promise<{ success: boolean; message: string }> => {
    try {
      await apiFetch('/payments/wallet/deposit', {
        method: 'POST',
        body: {
          amount_cents: kshToCents(amountKsh),
          currency: 'KES',
          provider,
          idempotency_key: crypto.randomUUID(),
        },
      });
      return { success: true, message: 'Deposit initiated — check your phone to complete it.' };
    } catch (err) {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Could not start deposit.';
      return { success: false, message };
    }
  },

  withdraw: async (amountKsh: number, destination: string, provider: 'MPESA' = 'MPESA'): Promise<{ success: boolean; message: string }> => {
    try {
      await apiFetch('/payments/wallet/withdraw', {
        method: 'POST',
        body: {
          amount_cents: kshToCents(amountKsh),
          destination,
          provider,
          idempotency_key: crypto.randomUUID(),
        },
      });
      return { success: true, message: 'Withdrawal requested.' };
    } catch (err) {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Could not start withdrawal.';
      return { success: false, message };
    }
  },

  getAdminDashboardStats: (): Promise<{ totalUsers: number; activeLeagues: number; totalRevenue: number; totalTransfers: number; }> => {
    // TODO(Phase 6a): back this with GET /admin/dashboard/stats once it exists.
    const stats = {
        totalUsers: 104,
        activeLeagues: 6,
        totalRevenue: 26640,
        totalTransfers: mockTransactions.length,
    };
    return simulateDelay(stats);
  },

  // Admin User Management APIs
  getUsers: async (): Promise<AdminUser[]> => {
    const users = await apiFetch<BackendAdminUser[]>('/admin/users');
    return users.map(toAdminUser);
  },

  updateUserStatus: async (userId: string, status: UserStatus): Promise<{ success: boolean }> => {
    try {
      await apiFetch(`/admin/users/${userId}/suspend?suspend=${status === 'suspended'}`, { method: 'PATCH' });
      return { success: true };
    } catch {
      return { success: false };
    }
  },

  updateUserRole: async (userId: string, role: UserRole): Promise<{ success: boolean }> => {
    try {
      await apiFetch(`/admin/users/${userId}/role`, { method: 'PATCH', body: { role } });
      return { success: true };
    } catch {
      return { success: false };
    }
  },

  // Admin League Management
  getAdminLeagues: async (): Promise<AdminLeague[]> => {
    const leagues = await apiFetch<BackendAdminLeague[]>('/admin/leagues');
    return leagues.map(toAdminLeague);
  },

  getAdminLeagueDetails: async (leagueId: string): Promise<AdminLeague | undefined> => {
    try {
      const league = await apiFetch<BackendAdminLeague>(`/admin/leagues/${leagueId}`);
      return toAdminLeague(league);
    } catch {
      return undefined;
    }
  },

  updateLeagueStatus: async (leagueId: string, status: LeagueStatus): Promise<{ success: boolean }> => {
    try {
      if (status === 'completed') {
        await apiFetch(`/admin/leagues/${leagueId}/close`, { method: 'POST' });
      } else {
        await apiFetch(`/admin/leagues/${leagueId}`, { method: 'PATCH', body: { status } });
      }
      return { success: true };
    } catch {
      return { success: false };
    }
  },

  approveLeaguePayout: async (leagueId: string, winnerUserId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await apiFetch<{ amount_cents: number }>(`/admin/leagues/${leagueId}/payouts`, {
        method: 'POST',
        body: { winner_user_id: Number(winnerUserId) },
      });
      return { success: true, message: `Paid out Ksh ${centsToKsh(result.amount_cents).toLocaleString()}.` };
    } catch (err) {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Could not process payout.';
      return { success: false, message };
    }
  },

  recalculateLeaguePoints: async (leagueId: string): Promise<{ success: boolean }> => {
    // Backend stub today (app/api/routes/admin/leagues.py::recalc) — no real
    // per-gameweek computation exists yet. Wired so the action is honest
    // about hitting the real endpoint rather than faking success locally.
    try {
      await apiFetch(`/admin/leagues/${leagueId}/recalculate`, { method: 'POST' });
      return { success: true };
    } catch {
      return { success: false };
    }
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
