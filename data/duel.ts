import type { Point, GeoPoint, SymmetryType, DuelChallenge, DuelableGameMode } from '../types';

export const MIN_COORD = -4;
export const MAX_COORD = 4;
export const TOTAL_CHALLENGES = 10;
const SYMMETRY_TYPES: SymmetryType[] = ['x-axis', 'y-axis', 'origin'];
const GEO_LATS = [-60, -30, 0, 30, 60];
const GEO_LONS = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const generatePoints = (count: number): Point[] => {
    const points: Point[] = [];
    const existing = new Set<string>();
    while(points.length < count) {
        const x = Math.floor(Math.random() * (MAX_COORD - MIN_COORD + 1)) + MIN_COORD;
        const y = Math.floor(Math.random() * (MAX_COORD - MIN_COORD + 1)) + MIN_COORD;
        const key = `${x},${y}`;
        if (!existing.has(key)) {
            points.push({ x, y });
            existing.add(key);
        }
    }
    return points;
}

const generateSymmetryChallenges = (count: number): Array<{ point: Point; type: SymmetryType }> => {
    const challenges: Array<{ point: Point; type: SymmetryType }> = [];
    const existing = new Set<string>();
    while(challenges.length < count) {
        let x, y;
        do {
            x = Math.floor(Math.random() * (MAX_COORD - MIN_COORD + 1)) + MIN_COORD;
            y = Math.floor(Math.random() * (MAX_COORD - MIN_COORD + 1)) + MIN_COORD;
        } while (x === 0 || y === 0)
        
        const type = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
        const key = `${x},${y},${type}`;
        if (!existing.has(key)) {
            challenges.push({ point: { x, y }, type });
            existing.add(key);
        }
    }
    return challenges;
}

const generateGeoChallenges = (count: number): GeoPoint[] => {
    const allPossible: GeoPoint[] = [];
    GEO_LATS.forEach(lat => {
        GEO_LONS.forEach(lon => {
            if(lat !== 0 && lon !== 0) allPossible.push({ lat, lon });
        })
    });
    return shuffleArray(allPossible).slice(0, count);
}


export const generateDuelChallenges = (gameMode: DuelableGameMode): DuelChallenge[] => {
    switch(gameMode) {
        case 'encontrar-pontos':
        case 'reconhecer-pontos':
            return generatePoints(TOTAL_CHALLENGES);
        case 'simetria-pontos':
            return generateSymmetryChallenges(TOTAL_CHALLENGES);
        case 'coordenadas-geograficas':
            return generateGeoChallenges(TOTAL_CHALLENGES);
        default:
            return generatePoints(TOTAL_CHALLENGES);
    }
}

export const DUEL_CHALLENGES: Point[] = generatePoints(TOTAL_CHALLENGES);