// import type { PublicUser } from './user.types';

// export type RoomCategory =
//   | 'tech' | 'gaming' | 'random' | 'science' | 'music' | 'sports' | 'general';

// export type RoomMood =
//   | 'chill' | 'serious' | 'funny' | 'tech' | 'creative' | 'debate';

// export interface Room {
//   id: string;
//   name: string;
//   description: string;
//   category: RoomCategory;
//   mood: RoomMood;
//   icon: string;
//   isPinned?: boolean;
//   activeUsers: number;
//   memberCount: number;
// }

// export interface Reaction {
//   emoji: string;
//   users: string[];
// }

// export type SenderType = 'human' | 'ai' | 'bot' | 'system';

// export interface Message {
//   id: string;
//   roomId: string;
//   senderId: string | null;
//   senderType: SenderType;
//   senderName: string;
//   senderAvatarSeed: string;
//   content: string;
//   type: 'text' | 'system' | 'ai';
//   reactions?: Reaction[];
//   createdAt: string;
// }

// export interface TypingUser {
//   userId: string;
//   displayName: string;
// }

// export interface RoomMembersState {
//   online: PublicUser[];
// }



import type { PublicUser } from './user.types';

export type RoomCategory =
  | 'tech' | 'gaming' | 'random' | 'science' | 'music' | 'sports' | 'general';

export type RoomMood =
  | 'chill' | 'serious' | 'funny' | 'tech' | 'creative' | 'debate';

export interface Room {
  id: string;
  name: string;
  description: string;
  category: RoomCategory;
  mood: RoomMood;
  icon: string;
  isPinned?: boolean;
  activeUsers: number;
  memberCount: number;
  messageCount?: number;
}

export interface DMSummary {
  id: string;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarSeed: string;
  };
  lastMessage: string;
  lastMessageAt: string;
}

export interface DMMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatarSeed: string;
  content: string;
  createdAt: string;
}

export interface Reaction {
  emoji: string;
  users: string[];
}

export type SenderType = 'human' | 'ai' | 'bot' | 'system';

export interface Message {
  id: string;
  roomId: string;
  senderId: string | null;
  senderType: SenderType;
  senderName: string;
  senderAvatarSeed: string;
  content: string;
  type: 'text' | 'system' | 'ai';
  reactions?: Reaction[];
  createdAt: string;
}

export interface TypingUser {
  userId: string;
  displayName: string;
}

export interface RoomMembersState {
  online: PublicUser[];
}