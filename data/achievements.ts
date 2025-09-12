import type { Badge } from '../types';

const gameMedals = (prefix: string, name: string): Badge[] => [
    { id: `${prefix}_bronze`, name: `Bronze em ${name}`, description: `Concluiu o modo ${name}.`, icon: 'fa-medal', tier: 'bronze' },
    { id: `${prefix}_silver`, name: `Prata em ${name}`, description: `Ótimo desempenho no modo ${name}.`, icon: 'fa-medal', tier: 'silver' },
    { id: `${prefix}_gold`, name: `Ouro em ${name}`, description: `Maestria total no modo ${name}!`, icon: 'fa-medal', tier: 'gold' },
];

export const ALL_BADGES: Badge[] = [
    // Game Medals
    ...gameMedals('find_points', 'Encontrar Pontos'),
    ...gameMedals('recognize_points', 'Reconhecer Pontos'),
    ...gameMedals('symmetry_points', 'Simetria de Pontos'),
    ...gameMedals('geo', 'Coords. Geográficas'),
    ...gameMedals('segments_easy', 'Segmentos (Fácil)'),
    ...gameMedals('segments_medium', 'Segmentos (Médio)'),
    ...gameMedals('segments_hard', 'Segmentos (Difícil)'),
    ...gameMedals('password_unlock', 'Descubra a Senha'),
    ...gameMedals('adedonha_simples', 'Adedonha Simples'),
    ...gameMedals('adedonha_tapple', 'Adedonha Tapple'),

    // Duel Badge
    {
        id: 'duelist',
        name: 'Duelista',
        description: 'Venceu seu primeiro duelo 1x1.',
        icon: 'fa-khanda',
        tier: 'bronze',
    },

    // Level Badges
    {
        id: 'level_5',
        name: 'Estudante Dedicado',
        description: 'Alcançou o Nível 5.',
        icon: 'fa-book-reader',
        tier: 'level',
    },
    {
        id: 'level_10',
        name: 'Sábio do Plano',
        description: 'Alcançou o Nível 10.',
        icon: 'fa-graduation-cap',
        tier: 'level',
    },
];

export const ALL_BADGES_MAP = new Map<string, Badge>(ALL_BADGES.map(badge => [badge.id, badge]));

export const getMedalForScore = (prefix: string, successes: number, total: number): Badge | null => {
    const percentage = (successes / total) * 100;

    if (percentage >= 100) return ALL_BADGES_MAP.get(`${prefix}_gold`) || null;
    if (percentage >= 70) return ALL_BADGES_MAP.get(`${prefix}_silver`) || null;
    if (percentage > 0 || successes > 0) return ALL_BADGES_MAP.get(`${prefix}_bronze`) || null; // Award bronze for completion
    
    return null;
}

export const getTieredBadgesForGame = (prefix: string): Badge[] => {
    return [
        ALL_BADGES_MAP.get(`${prefix}_bronze`),
        ALL_BADGES_MAP.get(`${prefix}_silver`),
        ALL_BADGES_MAP.get(`${prefix}_gold`),
    ].filter((b): b is Badge => !!b);
};