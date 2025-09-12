// types.ts

export interface Point {
  x: number;
  y: number;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export type MessageType = 'info' | 'success' | 'error' | 'final';

export type HintType = 'line-draw-to-point' | 'line-draw-from-point' | 'point-move' | 'point-blink';

export interface HintInfo {
    type: HintType;
    point?: Point;
    fromPoint?: Point;
    points?: Point[];
}

export interface GeoHintInfo {
    point: GeoPoint;
}

export type SymmetryType = 'x-axis' | 'y-axis' | 'origin';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: 'gold' | 'silver' | 'bronze' | 'level';
}

export interface GameStat {
    successFirstTry: number;
    successOther: number;
    errors: number;
    completionTimestamp?: any; // firebase.firestore.Timestamp
}

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
    name: string;
    password?: string; // Should not be exposed on client, but seems to be part of the data model
    role: 'student' | 'teacher';
    classCode?: string;
    avatar?: string;
    classes?: string[];
    xp: number;
    level: number;
    badges: string[];
    gameStats: { [gameId: string]: GameStat };
    combinacaoTotalStats?: CombinacaoTotalStat[];
    garrafasStats?: GarrafasStat[];
}

export interface GameMode {
    id: string;
    name: string;
    description: string;
    icon: string;
    badgePrefix: string;
    unlockLevel?: number;
    previousMode?: string;
}

export interface GameCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    games: GameMode[];
}

export interface NotificationItem {
    type: 'level' | 'badge';
    payload: any;
}

export type DuelableGameMode = 'encontrar-pontos' | 'reconhecer-pontos' | 'simetria-pontos' | 'coordenadas-geograficas' | 'descubra-a-senha';
export type DuelChallenge = Point | GeoPoint | { point: Point; type: SymmetryType };

export interface DuelPlayer {
    name: string;
    progress: number;
    timeFinished: number | null;
}

export interface DuelPasswordPlayerState {
    password: string;
    rules: string[];
    digitCount: number;
    guesses: { guess: string, correctCount: number }[];
    ready: boolean;
}

export interface DuelState {
    id: string;
    players: DuelPlayer[];
    gameMode: DuelableGameMode;
    challenges: DuelChallenge[];
    status: 'starting' | 'setup' | 'playing' | 'finished';
    winner: string | null;
    passwordGameState?: {
        [playerName: string]: DuelPasswordPlayerState
    };
}

export interface DuelInvitation {
    id: string;
    from: string;
    to: string;
    status: 'pending' | 'accepted' | 'declined';
    duelId: string;
    gameMode: DuelableGameMode;
}

export interface PasswordChallenge {
    id: string;
    classCode: string;
    creatorName: string;
    title: string;
    password: string;
    rules: string[];
    digitCount: number;
    allowRepeats: boolean;
    status: 'locked' | 'unlocked';
    unlockedTimestamp?: any; // firebase.firestore.Timestamp
}

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
    classCode: string;
    creatorName: string;
    title: string;
    rules: CombinacaoTotalChallengeRules;
    totalCombinations: number;
    status: 'locked' | 'unlocked';
}

export interface GarrafasChallenge {
    id: string;
    classCode: string;
    creatorName: string;
    title: string;
    correctOrder: number[];
    status: 'locked' | 'unlocked';
}


export interface ClassData {
    id: string;
    className: string;
    classCode: string;
    teacherName: string;
}

export interface AdedonhaSession {
    id: string;
    classCode: string;
    teacherName: string;
    status: 'lobby' | 'playing' | 'finished';
    scores: { [studentName: string]: number };
}

export interface AdedonhaRound {
    id: string;
    sessionId: string;
    roundNumber: number;
    status: 'playing' | 'scoring' | 'finished';
    theme: string;
    letter: string;
    startTime: any; // firebase.firestore.Timestamp
    duration: number; // in seconds
}

export interface AdedonhaSubmission {
    id: string;
    roundId: string;
    studentName: string;
    answer: string;
    isValid?: boolean | null;
    finalScore: number;
}
