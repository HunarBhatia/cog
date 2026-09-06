export interface Reminder {
  id: string;
  time: string;
  title: string;
  audioPrompt: string;
  category: "walk" | "family" | "snack" | "wellness";
  iconName: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  tag: string;
  category: "memory" | "creative" | "relax";
  icon: string;
  href: string;
}

export interface GameCardItem {
  id: string;
  cardName: string;
  icon: string;
  colorClass: string;
  isMatched?: boolean;
  isRevealed?: boolean;
}

export type UserRole = "martha" | "caregiver";

export interface MascotSpeechState {
  greeting: string;
  mood: "happy" | "calm" | "encouraging" | "listening";
  audioText?: string;
}
