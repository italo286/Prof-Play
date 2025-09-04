export interface GameInfo {
    id: 'coordenadas-geograficas' | 'encontrar-pontos' | 'reconhecer-pontos' | 'simetria-pontos' | 'simetria-segmentos' | 'descubra-a-senha' | 'combinacao-total' | 'adedonha' | 'duelo';
    name: string;
    description: string;
    icon: string;
    badgePrefix: string;
}

export interface GameCategory {
    id: 'plano-cartesiano' | 'analise-combinatoria' | 'palavras' | 'duelo';
    name: string;
    description: string;
    icon: string;
    color: string;
    games: GameInfo[];
}

export const GAME_CATEGORIES: GameCategory[] = [
    {
        id: 'plano-cartesiano',
        name: 'Plano Cartesiano',
        description: 'Domine os eixos X e Y, encontre pontos e explore a simetria.',
        icon: 'fa-border-all',
        color: 'text-sky-400',
        games: [
            { id: 'coordenadas-geograficas', name: 'Coordenadas Geográficas', description: 'Identifique a latitude e longitude de pontos no mapa.', icon: 'fa-globe-americas', badgePrefix: 'geo' },
            { id: 'encontrar-pontos', name: 'Encontrar Pontos', description: 'Localize o par ordenado exibido no plano.', icon: 'fa-search-location', badgePrefix: 'find_points' },
            { id: 'reconhecer-pontos', name: 'Reconhecer Pontos', description: 'Identifique as coordenadas de um ponto destacado.', icon: 'fa-map-marker-alt', badgePrefix: 'recognize_points' },
            { id: 'simetria-pontos', name: 'Simetria de Pontos', description: 'Encontre o ponto simétrico em relação a um eixo.', icon: 'fa-exchange-alt', badgePrefix: 'symmetry_points' },
            { id: 'simetria-segmentos', name: 'Simetria de Segmentos', description: 'Desenhe o segmento de reta simétrico.', icon: 'fa-ruler-combined', badgePrefix: 'segments' },
        ]
    },
    {
        id: 'analise-combinatoria',
        name: 'Análise Combinatória',
        description: 'Use a lógica para encontrar combinações e senhas secretas.',
        icon: 'fa-calculator',
        color: 'text-amber-400',
        games: [
            { id: 'descubra-a-senha', name: 'Descubra a Senha', description: 'Use a lógica para deduzir a senha secreta.', icon: 'fa-key', badgePrefix: 'password_unlock' },
            { id: 'combinacao-total', name: 'Combinação Total', description: 'Encontre todas as combinações possíveis seguindo as regras.', icon: 'fa-calculator', badgePrefix: 'combinacao_total' },
        ]
    },
    {
        id: 'palavras',
        name: 'Palavras',
        description: 'Teste seu vocabulário e agilidade em jogos de palavras.',
        icon: 'fa-font',
        color: 'text-green-400',
        games: [
            { id: 'adedonha', name: 'Adedonha', description: 'Jogo de palavras em tempo real com a turma.', icon: 'fa-pen-alt', badgePrefix: 'adedonha' },
        ]
    },
    {
        id: 'duelo',
        name: 'Duelo 1x1',
        description: 'Desafie um colega e veja quem é o mais rápido nos jogos!',
        icon: 'fa-khanda',
        color: 'text-red-500',
        games: [
            { id: 'duelo', name: 'Duelo 1x1', description: 'Desafie outro aluno para ver quem é mais rápido!', icon: 'fa-user-friends', badgePrefix: 'duelist' },
        ]
    }
];

export const ALL_GAMES_MAP = new Map<string, GameInfo>(
  GAME_CATEGORIES.flatMap(category => category.games).map(game => [game.id, game])
);
