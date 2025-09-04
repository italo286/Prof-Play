import React from 'react';

interface BnccInfo {
    title: string;
    content: React.ReactElement;
}

const BnccContent: React.FC<{ title: string; text: string }> = ({ title, text }) => (
    React.createElement('div', { className: "mt-2" },
        React.createElement('h4', { className: "font-bold text-sky-300" }, title),
        React.createElement('p', { className: "text-sm text-slate-300 pl-2 border-l-2 border-sky-700" }, text)
    )
);

export const BNCC_DATA: { [key: string]: BnccInfo } = {
    'encontrar-pontos': {
        title: 'Modo: Encontrar Pontos',
        content: React.createElement('div', null,
            React.createElement('p', { className: "text-base text-slate-200 mb-2" }, "Este modo foca no desenvolvimento da habilidade fundamental de plotar pontos no plano."),
            React.createElement(BnccContent, {
                title: "Habilidade Principal (6º Ano): (EF06MA16)",
                text: "Associar pares ordenados de números a pontos do plano cartesiano do 1º quadrante, em situações como a localização dos vértices de um polígono. O aplicativo expande essa noção para os quatro quadrantes, aprofundando o aprendizado."
            }),
            React.createElement(BnccContent, {
                title: "Habilidade de Suporte (5º Ano): (EF05MA15)",
                text: "Interpretar, descrever e representar a localização ou movimentação de objetos no plano cartesiano (1º quadrante), utilizando coordenadas cartesianas [...]. O jogo trabalha a parte de 'representar a localização'."
            })
        )
    },
    'reconhecer-pontos': {
        title: 'Modo: Reconhecer Pontos',
        content: React.createElement('div', null,
            React.createElement('p', { className: "text-base text-slate-200 mb-2" }, "Este modo trabalha a habilidade inversa da anterior: a leitura de informações de um gráfico."),
            React.createElement(BnccContent, {
                title: "Habilidade Principal (6º Ano): (EF06MA16)",
                text: "Associar pares ordenados de números a pontos do plano cartesiano [...]. Este modo foca no caminho 'ponto -> par ordenado', complementando perfeitamente o Modo 1."
            }),
            React.createElement(BnccContent, {
                title: "Habilidade de Suporte (5º Ano): (EF05MA15)",
                text: "Interpretar, descrever e representar a localização ou movimentação de objetos no plano cartesiano [...]. O modo foca em 'interpretar' a posição visual e 'descrever' com a linguagem matemática das coordenadas."
            })
        )
    },
    'simetria-pontos': {
        title: 'Modo: Simetria de Pontos',
        content: React.createElement('div', null,
            React.createElement('p', { className: "text-base text-slate-200 mb-2" }, "Aqui, o aplicativo avança da localização para a transformação geométrica, um salto cognitivo importante."),
            React.createElement(BnccContent, {
                title: "Habilidade Principal (7º Ano): (EF07MA20)",
                text: "Reconhecer e representar, no plano cartesiano, o simétrico de figuras em relação aos eixos e à origem. Esta é a materialização exata da habilidade, aplicando as regras de reflexão."
            })
        )
    },
    'simetria-segmentos': {
        title: 'Modo: Simetria de Segmentos',
        content: React.createElement('div', null,
            React.createElement('p', { className: "text-base text-slate-200 mb-2" }, "Esta etapa aprofunda e generaliza o conceito de simetria."),
            React.createElement(BnccContent, {
                title: "Habilidade Principal (7º Ano): (EF07MA20)",
                text: "Reconhecer e representar, no plano cartesiano, o simétrico de figuras em relação aos eixos e à origem. Ao passar de um ponto para um segmento (figura), o aplicativo exige que o aluno generalize a regra de reflexão para os pontos-chave (vértices)."
            })
        )
    },
    'coordenadas-geograficas': {
        title: 'Modo: Coordenadas Geográficas',
        content: React.createElement('div', null,
            React.createElement('p', { className: "text-base text-slate-200 mb-2" }, "Este modo conecta o conceito abstrato do plano cartesiano a uma aplicação prática e interdisciplinar."),
            React.createElement(BnccContent, {
                title: "Habilidade Principal (5º Ano): (EF05MA14)",
                text: "Utilizar e compreender diferentes representações para a localização de objetos no plano, como mapas, células em planilhas eletrônicas e coordenadas geográficas, a fim de desenvolver as primeiras noções de coordenadas cartesianas. O jogo é a aplicação perfeita desta habilidade em cartografia."
            })
        )
    }
};