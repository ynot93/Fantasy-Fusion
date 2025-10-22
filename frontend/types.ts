
export interface Member {
  id: string;
  name: string;
  teamName: string;
  points: number;
  isCurrentUser?: boolean;
}

export interface League {
  id: string;
  name: string;
  entryFee: number;
  maxMembers: number;
  members: Member[];
  isPrivate: boolean;
  prizePool: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  fplTeamId: string;
  avatarUrl: string;
  teamName: string;
}

export interface FplSummary {
    overallPoints: number;
    overallRank: number;
    totalPlayers: number;
}

export interface PlayerStat {
  id: string;
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  saves?: number; 
  selectionPercent: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'winnings' | 'deposit' | 'withdrawal' | 'entry_fee';
  status: 'Completed' | 'Pending' | 'Failed';
}

// Added for Admin User Management
export type UserStatus = 'Active' | 'Banned';
export type UserRole = 'Admin' | 'Moderator' | 'User';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  status: UserStatus;
  joinedDate: string;
}

// Added for Admin League Management
export type LeagueStatus = 'Open' | 'Ongoing' | 'Completed' | 'Payouts Approved';

export interface AdminLeague {
  id:string;
  name: string;
  creator: {
    id: string;
    name: string;
  };
  entryFee: number;
  participants: number;
  maxParticipants: number;
  prizePool: number;
  status: LeagueStatus;
  startDate: string;
  endDate: string;
  members: Member[];
}

// Added for Admin Transactions Page
export interface AdminTransaction extends Transaction {
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
}

export interface FraudAlert {
    id: string;
    level: 'High' | 'Medium' | 'Low';
    message: string;
    timestamp: string;
    userId: string;
}

// Added for Admin CMS
export interface HomepageContent {
  heroTitle: string;
  heroSubtitle: string;
  bannerImageUrl: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  status: 'Published' | 'Draft';
}

export interface HelpArticle {
  id: string;
  question: string;
  answer: string;
  category: string;
  lastUpdated: string;
}

// Added for Admin Reports & Analytics
export interface UserTrendDataPoint {
  period: 'DAU' | 'WAU' | 'MAU';
  value: number;
}

export interface RetentionCohort {
  cohort: string; // e.g., "Aug 1 - Aug 7"
  newUsers: number;
  weeklyRetention: (number | null)[]; // e.g., [100, 55.2, 43.1, ...] percentages
}

export interface TopLeague {
  id: string;
  name: string;
  participants: number;
  prizePool: number;
}

export interface TopPlayer {
  id: string;
  name: string;
  avatarUrl: string;
  totalWinnings: number;
}

export interface AnalyticsData {
  userTrends: UserTrendDataPoint[];
  retentionCohorts: RetentionCohort[];
  topLeagues: TopLeague[];
  topPlayers: TopPlayer[];
}

// Added for Admin System Settings
export interface MyApiKeys {
  fpl: string;
  stripePublic: string;
  stripeSecret: string;
  mpesaKey: string;
  mpesaSecret: string;
}

export interface BrandingSettings {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface Backup {
  id: string;
  timestamp: string;
  size: string;
}

export interface SystemSettingsData {
  apiKeys: MyApiKeys;
  branding: BrandingSettings;
  backups: Backup[];
}
