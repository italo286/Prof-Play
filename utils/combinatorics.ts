import type { CombinacaoTotalChallengeRules } from '../types';

// Function to generate all permutations/combinations based on rules.
// This is the "engine" that calculates the total for the teacher.
export const calculateCombinations = (rules: CombinacaoTotalChallengeRules): string[] => {
    const {
        digitCount,
        allowedDigits,
        noRepetition,
        noConsecutiveDuplicates,
        specificConsecutiveDisallowed,
        firstDigitNotZero,
        lastDigitMustBeEven,
        lastDigitMustBeOdd,
        digitsInAscendingOrder,
        digitsInDescendingOrder,
        mustContainDigit,
        sumOfDigits,
    } = rules;

    if (!allowedDigits) {
        throw new Error("É necessário fornecer os algarismos permitidos.");
    }
    const digits = allowedDigits.split('');
    const results: string[] = [];

    const generate = (current: string) => {
        if (current.length === digitCount) {
            // Final validation for the completed string
            if (sumOfDigits !== undefined) {
                const sum = current.split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
                if (sum !== sumOfDigits) return;
            }
            if (mustContainDigit && !current.includes(mustContainDigit)) {
                return;
            }
            results.push(current);
            return;
        }

        for (const digit of digits) {
            const next = current + digit;

            // Rule: No repetition
            if (noRepetition && current.includes(digit)) {
                continue;
            }

            // Rule: No consecutive duplicates
            if (noConsecutiveDuplicates && current.length > 0 && current[current.length - 1] === digit) {
                continue;
            }
            
            // Rule: Specific consecutive disallowed
            if (specificConsecutiveDisallowed && next.includes(specificConsecutiveDisallowed)) {
                continue;
            }
            
            // Rule: First digit not zero
            if (firstDigitNotZero && next.length === 1 && digit === '0') {
                continue;
            }

            // Rule: Last digit must be even
            if (lastDigitMustBeEven && next.length === digitCount && parseInt(digit, 10) % 2 !== 0) {
                continue;
            }
            
            // Rule: Last digit must be odd
            if (lastDigitMustBeOdd && next.length === digitCount && parseInt(digit, 10) % 2 === 0) {
                continue;
            }

            // Rule: Digits in ascending order
            if (digitsInAscendingOrder && current.length > 0 && digit <= current[current.length - 1]) {
                continue;
            }

            // Rule: Digits in descending order
            if (digitsInDescendingOrder && current.length > 0 && digit >= current[current.length - 1]) {
                continue;
            }

            generate(next);
        }
    };

    generate('');
    return results;
};


// Function to validate a single attempt by the student.
// This provides the specific, educational feedback.
export const validateCombination = (
    attempt: string,
    rules: CombinacaoTotalChallengeRules,
    foundCombinations: string[]
): { isValid: boolean; isNew: boolean; message: string } => {

    // Check length
    if (attempt.length !== rules.digitCount) {
        return { isValid: false, isNew: false, message: `Inválido: A combinação deve ter ${rules.digitCount} dígitos.` };
    }

    const digits = attempt.split('');
    const allowed = rules.allowedDigits.split('');

    // Check if all digits are allowed
    for (const digit of digits) {
        if (!allowed.includes(digit)) {
            return { isValid: false, isNew: false, message: `Inválido: Apenas os dígitos {${rules.allowedDigits}} são permitidos.` };
        }
    }
    
    // Check no repetition
    if (rules.noRepetition) {
        const uniqueDigits = new Set(digits);
        if (uniqueDigits.size !== digits.length) {
            // Find the repeated digit to be more specific
            const counts: { [key: string]: number } = {};
            for (const digit of digits) {
                counts[digit] = (counts[digit] || 0) + 1;
                if (counts[digit] > 1) {
                    return { isValid: false, isNew: false, message: `Inválido: O dígito '${digit}' não pode ser repetido.` };
                }
            }
        }
    }

    // Check no consecutive duplicates
    if (rules.noConsecutiveDuplicates) {
        for (let i = 0; i < digits.length - 1; i++) {
            if (digits[i] === digits[i+1]) {
                 return { isValid: false, isNew: false, message: `Inválido: A regra não permite dígitos consecutivos iguais como '${digits[i]}${digits[i+1]}'.` };
            }
        }
    }
    
     // Check specific consecutive disallowed
    if (rules.specificConsecutiveDisallowed && attempt.includes(rules.specificConsecutiveDisallowed)) {
        return { isValid: false, isNew: false, message: `Inválido: A sequência '${rules.specificConsecutiveDisallowed}' não é permitida.` };
    }

    // Check first digit not zero
    if (rules.firstDigitNotZero && digits[0] === '0') {
         return { isValid: false, isNew: false, message: `Inválido: O primeiro dígito não pode ser '0'.` };
    }

    // Check last digit must be even
    if (rules.lastDigitMustBeEven && parseInt(digits[digits.length - 1], 10) % 2 !== 0) {
        return { isValid: false, isNew: false, message: `Inválido: O último dígito deve ser par.` };
    }
    
    // Check last digit must be odd
    if (rules.lastDigitMustBeOdd && parseInt(digits[digits.length - 1], 10) % 2 === 0) {
        return { isValid: false, isNew: false, message: `Inválido: O último dígito deve ser ímpar.` };
    }

    // Check sum of digits
    if (rules.sumOfDigits !== undefined) {
        const sum = digits.reduce((acc, d) => acc + parseInt(d, 10), 0);
        if (sum !== rules.sumOfDigits) {
            return { isValid: false, isNew: false, message: `Inválido: A soma dos dígitos deve ser ${rules.sumOfDigits}.` };
        }
    }
    
    // Check ascending order
    if (rules.digitsInAscendingOrder) {
        for (let i = 0; i < digits.length - 1; i++) {
            if (digits[i] >= digits[i + 1]) {
                return { isValid: false, isNew: false, message: `Inválido: Os dígitos devem estar em ordem crescente.` };
            }
        }
    }

    // Check descending order
    if (rules.digitsInDescendingOrder) {
        for (let i = 0; i < digits.length - 1; i++) {
            if (digits[i] <= digits[i + 1]) {
                return { isValid: false, isNew: false, message: `Inválido: Os dígitos devem estar em ordem decrescente.` };
            }
        }
    }

    // Check must contain digit
    if (rules.mustContainDigit && !digits.includes(rules.mustContainDigit)) {
        return { isValid: false, isNew: false, message: `Inválido: A combinação deve conter o dígito '${rules.mustContainDigit}'.` };
    }
    
    // It's a valid combination according to the rules, now check if it's new.
    if (foundCombinations.includes(attempt)) {
        return { isValid: true, isNew: false, message: "Você já encontrou esta combinação. Tente outra!" };
    }

    return { isValid: true, isNew: true, message: "Correto! 👍" };
};