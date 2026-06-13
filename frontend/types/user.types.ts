export interface UserStats {
  gamesPlayed: number;
  correctGuesses: number;
  timesAsFooled: number;
  highestStreak: number;
  currentStreak: number;
  totalMessages: number;
  currentScore: number;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  bio?: string;
  avatarSeed: string;
  status: 'online' | 'offline' | 'away';
  stats: UserStats;
  createdAt?: string;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  status: 'online' | 'offline' | 'away';
}
