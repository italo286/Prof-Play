import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

interface AdedonhaValidationResult {
    answer: string;
    isValid: boolean;
    reason?: string;
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        validations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    answer: {
                        type: Type.STRING,
                    },
                    isValid: {
                        type: Type.BOOLEAN,
                    },
                    reason: {
                        type: Type.STRING,
                    },
                },
            },
        },
    },
};

export const validateAdedonhaAnswers = async (category: string, letter: string, answers: string[]): Promise<AdedonhaValidationResult[]> => {
    if (!answers || answers.length === 0) {
        return [];
    }
    
    const systemInstruction = `Você é um juiz do jogo Adedonha (Stop) para crianças e adolescentes no Brasil. Sua tarefa é validar uma lista de palavras.
    Verifique se cada resposta:
    1. Começa com a letra fornecida (ignorando maiúsculas/minúsculas e acentos. 'E' é igual a 'É').
    2. Pertence à categoria especificada.
    3. É uma palavra real e conhecida em português do Brasil. Seja um pouco flexível com pequenos erros de digitação se a intenção for clara.
    Responda APENAS com o objeto JSON especificado no schema.`;

    const prompt = `
        Categoria: "${category}"
        Letra: "${letter}"
        Respostas para validar: ${JSON.stringify(answers)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        if (parsedJson.validations && Array.isArray(parsedJson.validations)) {
            return parsedJson.validations;
        } else {
             console.error("AI response is not in the expected format:", parsedJson);
            return answers.map(answer => ({ answer, isValid: false, reason: "Formato de resposta da IA inválido." }));
        }

    } catch (error) {
        console.error("Error calling Gemini API for Adedonha validation:", error);
        // Em caso de erro, retorna todas como inválidas para revisão manual
        return answers.map(answer => ({ answer, isValid: false, reason: "Erro na API de validação." }));
    }
};