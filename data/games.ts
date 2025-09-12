import type { GameCategory } from '../types';

export const GAME_MODES = {
    'encontrar-pontos': {
        id: 'encontrar-pontos',
        name: 'Encontrar Pontos',
        description: 'Receba uma coordenada e clique no local correto do plano.',
        icon: 'fa-search-location',
        badgePrefix: 'find_points',
        unlockLevel: 1,
    },
    'reconhecer-pontos': {
        id: 'reconhecer-pontos',
        name: 'Reconhecer Pontos',
        description: 'Um ponto é destacado. Digite as coordenadas corretas.',
        icon: 'fa-map-marker-alt',
        badgePrefix: 'recognize_points',
        unlockLevel: 1,
        previousMode: 'encontrar-pontos',
    },
    'simetria-pontos': {
        id: 'simetria-pontos',
        name: 'Simetria de Pontos',
        description: 'Encontre o ponto simétrico em relação a um eixo ou à origem.',
        icon: 'fa-clone',
        badgePrefix: 'symmetry_points',
        unlockLevel: 3,
        previousMode: 'reconhecer-pontos',
    },
    'simetria-segmentos': {
        id: 'simetria-segmentos',
        name: 'Simetria de Segmentos',
        description: 'Recrie uma forma refletida em relação a um eixo ou à origem.',
        icon: 'fa-draw-polygon',
        badgePrefix: 'segments', // The game logic will append _easy, _medium, _hard
        unlockLevel: 4,
        previousMode: 'simetria-pontos',
    },
    'coordenadas-geograficas': {
        id: 'coordenadas-geograficas',
        name: 'Coordenadas Geográficas',
        description: 'Identifique a latitude e longitude de pontos no mapa mundi.',
        icon: 'fa-globe-americas',
        badgePrefix: 'geo',
        unlockLevel: 1,
    },
    'descubra-a-senha': {
        id: 'descubra-a-senha',
        name: 'Descubra a Senha',
        description: 'Use a lógica para descobrir a senha criada pelo seu professor.',
        icon: 'fa-key',
        badgePrefix: 'password_unlock',
        unlockLevel: 1,
    },
    'combinacao-total': {
        id: 'combinacao-total',
        name: 'Combinação Total',
        description: 'Encontre todas as combinações possíveis seguindo as regras.',
        icon: 'fa-calculator',
        badgePrefix: 'combinacao_total',
        unlockLevel: 1,
    },
    'jogo-das-garrafas': {
        id: 'jogo-das-garrafas',
        name: 'Jogo das Garrafas',
        description: 'Ordene as garrafas na sequência correta com o mínimo de trocas.',
        icon: 'fa-wine-bottle',
        badgePrefix: 'garrafas',
        unlockLevel: 1,
    },
    'adedonha-tapple': {
        id: 'adedonha-tapple',
        name: 'Adedonha Tapple',
        description: 'Responda rápido antes que o tempo acabe!',
        icon: 'fa-stopwatch',
        badgePrefix: 'adedonha_tapple',
        unlockLevel: 1,
    },
     'adedonha': {
        id: 'adedonha',
        name: 'Adedonha Clássica',
        description: 'Jogo de Adedonha em tempo real com sua turma.',
        icon: 'fa-pencil-alt',
        badgePrefix: 'adedonha',
        unlockLevel: 1,
    },
    'duelo': {
        id: 'duelo',
        name: 'Duelo 1x1',
        description: 'Desafie seus colegas de turma em uma corrida contra o tempo!',
        icon: 'fa-khanda', // A sword icon
        badgePrefix: 'duelist'
    }
};

export const GAME_CATEGORIES: GameCategory[] = [
    {
        id: 'plano-cartesiano',
        name: 'Plano Cartesiano',
        description: 'Domine a localização e transformações de pontos no plano.',
        icon: 'fa-border-all',
        color: 'text-sky-400',
        games: [GAME_MODES['encontrar-pontos'], GAME_MODES['reconhecer-pontos'], GAME_MODES['simetria-pontos'], GAME_MODES['simetria-segmentos']],
    },
    {
        id: 'logica-combinatoria',
        name: 'Lógica e Combinatória',
        description: 'Resolva quebra-cabeças de lógica e análise combinatória.',
        icon: 'fa-brain',
        color: 'text-teal-400',
        games: [GAME_MODES['descubra-a-senha'], GAME_MODES['combinacao-total'], GAME_MODES['jogo-das-garrafas']],
    },
    {
        id: 'geografia',
        name: 'Geografia',
        description: 'Explore o mundo através de coordenadas e mapas.',
        icon: 'fa-map-marked-alt',
        color: 'text-green-400',
        games: [GAME_MODES['coordenadas-geograficas']],
    },
    {
        id: 'em-sala',
        name: 'Jogos em Sala',
        description: 'Atividades interativas para jogar com o professor e a turma.',
        icon: 'fa-chalkboard-teacher',
        color: 'text-indigo-400',
        games: [GAME_MODES['adedonha-tapple'], GAME_MODES['adedonha']],
    },
    {
        id: 'duelo',
        name: 'Duelo 1x1',
        description: 'Compita em tempo real com seus colegas de classe!',
        icon: 'fa-khanda',
        color: 'text-red-500',
        games: [GAME_MODES['duelo']]
    }
];

export const ALL_GAMES_MAP = new Map(Object.values(GAME_MODES).map(mode => [mode.id, mode]));
export const GARRAFAS_IMAGES = [
    'https://i.ibb.co/C1Tf9k5/garrafa-1-removebg-preview.png',
    'https://i.ibb.co/f49b8wL/garrafa-2-removebg-preview.png',
    'https://i.ibb.co/hZ2pQsw/garrafa-3-removebg-preview.png',
    'https://i.ibb.co/k3k92Vj/garrafa-4-removebg-preview.png',
    'https://i.ibb.co/1Mj28q7/garrafa-5-removebg-preview.png',
    'https://i.ibb.co/1q2N1pC/garrafa-6-removebg-preview.png'
];
