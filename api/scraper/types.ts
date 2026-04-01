export interface PlayerSearchResult {
  id: string;
  name: string;
  rating: string;
  lastPlayed: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  rating: string;
  country?: string;
  primaryClub?: string;
  city?: string;
  province?: string;
  sex?: string;
  deceased?: string;
}

export interface RatingHistoryEntry {
  date: string;
  eventName: string;
  eventId: string;
  initialRating: string;
  change: string;
  finalRating: string;
}

export interface MatchResult {
  date: string;
  eventId: string;
  eventName?: string;
  opponent: string;
  opponentId: string;
  opponentRating: string;
  result: string;
  rating: string;
  pointChange: string;
  score: string;
}

export interface HeadToHeadEntry {
  name: string;
  id: string;
  wins: number;
  losses: number;
  winPct: string;
}

export interface MatchesData {
  matches: MatchResult[];
  headToHead: HeadToHeadEntry[];
}

export interface RatingChange {
  initial: string;
  change: string;
  final: string;
}

export interface EventPlayer {
  id: string;
  name: string;
  initial: string;
  change: string;
  final: string;
}

export interface EventPlayerMatch {
  result: 'W' | 'L';
  pointChange: string;
  oppRating: string;
  opponentName: string;
  opponentId: string;
  score: string;
}

export interface EventDetailWithPlayer {
  id: string;
  name: string;
  date: string;
  player: EventPlayer;
  matches: EventPlayerMatch[];
}

export interface EventPlayerSummary {
  name: string;
  id: string;
  initial: string;
  change: string;
  final: string;
}

export interface EventDetailWithoutPlayer {
  id: string;
  name: string;
  date: string;
  players: EventPlayerSummary[];
}

export type EventDetail = EventDetailWithPlayer | EventDetailWithoutPlayer;
