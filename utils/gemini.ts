// A funcionalidade de validação com IA foi removida a pedido do usuário.
// O Gemini não será mais usado para corrigir as respostas da Adedonha.
// A correção agora é 100% manual pelo professor.

interface AdedonhaValidationResult {
    answer: string;
    isValid: boolean;
    reason?: string;
}


export const validateAdedonhaAnswers = async (category: string, letter: string, answers: string[]): Promise<AdedonhaValidationResult[]> => {
    console.warn("A funcionalidade de validação por IA foi desativada.");
    // Retorna um array vazio para não quebrar qualquer lógica remanescente que possa chamar esta função.
    return [];
};
