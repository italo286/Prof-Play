import React from 'react';
import type { Point, GeoPoint, SymmetryType, HintInfo, GeoHintInfo } from '../types';
import { calculateSymmetricPoint } from '../components/SimetriaPontosGame';

interface HintContent {
    title: string;
    steps: React.ReactElement[];
    simulation: () => HintInfo | GeoHintInfo | null;
}

const Step: React.FC<{ number: number, children?: React.ReactNode }> = ({ number, children }) => (
    React.createElement('div', { className: "flex items-start mt-2" },
        React.createElement('div', { className: "flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-white font-bold text-sm mr-3" }, number),
        React.createElement('p', { className: "text-slate-200" }, children)
    )
);

export const hintsData: { [key: string]: HintContent } = {
    'encontrar-pontos': {
        title: "Como Encontrar um Ponto",
        steps: [
            React.createElement(Step, { number: 1 }, "A coordenada é sempre no formato ", React.createElement("strong", null, "(X, Y)"), "."),
            React.createElement(Step, { number: 2 }, "Encontre o número ", React.createElement("strong", null, "X"), " no eixo horizontal (deitado)."),
            React.createElement(Step, { number: 3 }, "Encontre o número ", React.createElement("strong", null, "Y"), " no eixo vertical (em pé)."),
            React.createElement(Step, { number: 4 }, "O ponto correto está no cruzamento da linha de X com a linha de Y.")
        ],
        simulation: () => ({ type: 'line-draw-to-point', point: { x: 2, y: -3 } })
    },
    'reconhecer-pontos': {
        title: "Como Reconhecer as Coordenadas",
        steps: [
            React.createElement(Step, { number: 1 }, "Olhe para o ponto amarelo no plano."),
            React.createElement(Step, { number: 2 }, "Siga a linha vertical do ponto até o ", React.createElement("strong", null, "eixo X"), " (deitado) para encontrar a primeira coordenada."),
            React.createElement(Step, { number: 3 }, "Siga a linha horizontal do ponto até o ", React.createElement("strong", null, "eixo Y"), " (em pé) para encontrar a segunda coordenada."),
            React.createElement(Step, { number: 4 }, "Digite os números na ordem (X, Y).")
        ],
        simulation: () => ({ type: 'line-draw-from-point', point: { x: -3, y: 4 } })
    },
     'coordenadas-geograficas': {
        title: "Como Ler Coordenadas Geográficas",
        steps: [
            React.createElement(Step, { number: 1 }, "As coordenadas geográficas usam ", React.createElement("strong", null, "Latitude (Lat)"), " para Norte/Sul e ", React.createElement("strong", null, "Longitude (Lon)"), " para Leste/Oeste."),
            React.createElement(Step, { number: 2 }, React.createElement("strong", null, "Latitude:"), " Olhe a linha horizontal do ponto. Se estiver acima da Linha do Equador (0°), é Norte (N). Se estiver abaixo, é Sul (S)."),
            React.createElement(Step, { number: 3 }, React.createElement("strong", null, "Longitude:"), " Olhe a linha vertical do ponto. Se estiver à direita do Meridiano de Greenwich (0°), é Leste (L). Se estiver à esquerda, é Oeste (O)."),
            React.createElement(Step, { number: 4 }, "Digite o valor numérico de cada um e selecione a direção correta (N/S e L/O).")
        ],
        simulation: () => ({ point: { lat: -30, lon: -60 } })
    },
    'simetria-pontos': {
        title: "Como Encontrar um Ponto Simétrico",
        steps: [
            React.createElement(Step, { number: 1 }, "A ", React.createElement("strong", null, "simetria"), " é como um espelho."),
            React.createElement(Step, { number: 2 }, React.createElement("strong", null, "Em relação ao eixo X:"), " a coordenada X fica igual e a Y inverte o sinal (ex: (2, 3) vira (2, -3))."),
            React.createElement(Step, { number: 3 }, React.createElement("strong", null, "Em relação ao eixo Y:"), " a coordenada Y fica igual e a X inverte o sinal (ex: (2, 3) vira (-2, 3))."),
            React.createElement(Step, { number: 4 }, React.createElement("strong", null, "Em relação à Origem:"), " as duas coordenadas invertem o sinal (ex: (2, 3) vira (-2, -3)).")
        ],
        simulation: () => {
            const fromPoint = { x: 3, y: 2 };
            return {
                type: 'point-move',
                fromPoint: fromPoint,
                point: calculateSymmetricPoint(fromPoint, 'x-axis')
            };
        }
    },
     'simetria-segmentos': {
        title: "Como Desenhar uma Forma Simétrica",
        steps: [
            React.createElement(Step, { number: 1 }, "Para criar a forma simétrica, você precisa encontrar o simétrico de ", React.createElement("strong", null, "cada um dos seus pontos"), " (vértices)."),
            React.createElement(Step, { number: 2 }, "Imagine onde cada ponto da forma original iria parar do outro lado do \"espelho\" (eixo ou origem)."),
            React.createElement(Step, { number: 3 }, "Use as mesmas regras de simetria de pontos para cada vértice da forma."),
            React.createElement(Step, { number: 4 }, "Clique nos locais corretos para recriar a forma simétrica.")
        ],
        simulation: () => {
             const fromPoints = [{x: 1, y: 1}, {x: 3, y: 4}];
             return {
                type: 'point-blink',
                fromPoints: fromPoints,
                points: fromPoints.map(p => calculateSymmetricPoint(p, 'y-axis'))
            };
        }
    },
};