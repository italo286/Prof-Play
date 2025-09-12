export interface Point {
  x: number;
  y: number;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export type MessageType = 'success' | 'error' | 'info' | 'final';

export type SymmetryType = 'x-axis' | 'y-axis' | 'origin';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'level';
}

export interface GameStat {
  successFirstTry: number;
  successOther: number;
  errors: number;
  completionTimestamp?: any; // Firebase Timestamp
}

export type GameStats = {
  [gameId: string]: GameStat;
};

export interface CombinacaoTotalStat {
  challengeId: string;
  foundCombinations: string[];
  isComplete: boolean;
  completionTimestamp?: any;
}

export interface GarrafasStat {
  challengeId: string;
  attempts: number;
  isComplete: boolean;
  completionTimestamp?: any;
}

export interface UserProfile {
  name: string; // Used as the unique identifier/username
  password?: string; // Hashed password
  role: 'student' | 'teacher';
  avatar?: string;
  classCode?: string; // For students
  classes?: string[]; // For teachers: list of class codes they own
  xp: number;
  level: number;
  badges: string[];
  gameStats: GameStats;
  combinacaoTotalStats?: CombinacaoTotalStat[];
  garrafasStats?: GarrafasStat[];
}

export interface ClassData {
    classCode: string;
    className: string;
    teacherName: string;
}

export type NotificationItem = 
  | { type: 'level'; payload: { from: number; to: number } }
  | { type: 'badge'; payload: Badge };

export type HintType = 'line-draw-to-point' | 'line-draw-from-point' | 'point-move' | 'point-blink';

export interface HintInfo {
  type: HintType;
  point?: Point;
  fromPoint?: Point;
  fromPoints?: Point[];
  points?: Point[];
}

export interface GeoHintInfo {
    point: GeoPoint;
}

// --- PASSWORD CHALLENGE TYPES ---
export interface PasswordChallenge {
  id: string;
  creatorName: string;
  title: string;
  password: string; // The secret password
  rules: string[]; // Text hints like "All digits are odd"
  allowRepeats: boolean;
  digitCount: number;
  status: 'locked' | 'unlocked';
  unlockedTimestamp?: any; // Firebase Timestamp
  classCode: string; // To which class this challenge is assigned
}

// --- DUEL TYPES ---

export type DuelableGameMode = 'encontrar-pontos' | 'reconhecer-pontos' | 'simetria-pontos' | 'coordenadas-geograficas' | 'descubra-a-senha';

export type DuelChallenge = Point | { point: Point; type: SymmetryType } | GeoPoint;

export interface DuelInvitation {
  id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  duelId: string;
  gameMode: DuelableGameMode;
}

export interface DuelPlayer {
    name: string;
    progress: number;
    timeFinished: number | null;
}

export interface DuelPasswordPlayerState {
    password: string;
    rules: string[];
    digitCount: number;
    guesses: { guess: string; correctCount: number }[];
    ready: boolean;
}

export interface DuelPasswordState {
    [playerName: string]: DuelPasswordPlayerState;
}

export interface DuelState {
  id: string;
  players: [DuelPlayer, DuelPlayer];
  gameMode: DuelableGameMode;
  challenges: DuelChallenge[];
  passwordGameState?: DuelPasswordState;
  status: 'starting' | 'setup' | 'playing' | 'finished';
  winner: string | null;
}

// --- ADEDONHA TYPES ---
export interface AdedonhaSubmission {
  id: string;
  roundId: string;
  studentName: string;
  answer: string;
  finalScore: number;
  isValid: boolean | null; // null: not validated, true: valid, false: invalid
}

export interface AdedonhaRound {
  id: string;
  sessionId: string;
  roundNumber: number;
  theme: string;
  letter?: string; // For 'simples' mode
  status: 'playing' | 'scoring' | 'finished';
  startTime: any; // Firebase Timestamp
  duration: number; // Duration of the round in seconds
  usedLetters?: string[]; // For 'tapple' mode
}

export interface AdedonhaSession {
  id: string;
  classCode: string;
  teacherName: string;
  status: 'active' | 'finished';
  type: 'simples' | 'tapple';
  createdAt: any; // Firebase Timestamp
  scores: { [studentName: string]: number };
}

// --- COMBINAÇÃO TOTAL TYPES ---
export interface CombinacaoTotalChallengeRules {
  digitCount: number;
  allowedDigits: string;
  noRepetition: boolean;
  noConsecutiveDuplicates: boolean;
  specificConsecutiveDisallowed?: string;
  firstDigitNotZero: boolean;
  lastDigitMustBeEven: boolean;
  lastDigitMustBeOdd: boolean;
  digitsInAscendingOrder: boolean;
  digitsInDescendingOrder: boolean;
  mustContainDigit?: string;
  sumOfDigits?: number;
}

export interface CombinacaoTotalChallenge {
  id: string;
  creatorName: string;
  title: string;
  rules: CombinacaoTotalChallengeRules;
  totalCombinations: number;
  createdAt: any; // Firebase Timestamp
  classCode: string; // To which class this challenge is assigned
  status: 'locked' | 'unlocked';
  unlockedTimestamp?: any;
}

// --- JOGO DAS GARRAFAS TYPES ---
export interface GarrafasChallenge {
  id: string;
  creatorName: string;
  title: string;
  correctOrder: number[]; // Array of indices from 0-5 representing the correct sequence
  createdAt: any; // Firebase Timestamp
  classCode: string;
  status: 'locked' | 'unlocked';
  unlockedTimestamp?: any;
}