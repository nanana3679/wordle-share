// 단어 제약 조건 헬퍼 함수들

export interface WordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 단일 단어의 유효성을 검사합니다.
 * @param word 검사할 단어
 * @returns 유효성 검사 결과
 */
export function validateWord(word: string): WordValidationResult {
  const errors: string[] = [];
  
  // 1글자 이상인지 확인
  if (!word || word.length < 1) {
    errors.push('단어는 1글자 이상이어야 합니다.');
    return { isValid: false, errors };
  }
  
  // a-z, A-Z만 사용되는지 확인
  if (!/^[a-zA-Z]+$/.test(word)) {
    errors.push('단어는 영문자(a-z, A-Z)만 사용할 수 있습니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 단어 배열의 유효성을 검사합니다.
 * @param words 검사할 단어 배열
 * @returns 유효성 검사 결과
 */
export function validateWords(words: string[]): WordValidationResult {
  const errors: string[] = [];
  
  if (!words || words.length === 0) {
    errors.push('최소 하나의 단어가 필요합니다.');
    return { isValid: false, errors };
  }
  
  // 각 단어의 개별 유효성 검사
  const individualErrors: string[] = [];
  const processedWords = new Set<string>();
  
  words.forEach((word, index) => {
    const trimmedWord = word.trim();
    
    if (!trimmedWord) {
      individualErrors.push(`${index + 1}번째 단어가 비어있습니다.`);
      return;
    }
    
    // 중복 검사
    const lowerWord = trimmedWord.toLowerCase();
    if (processedWords.has(lowerWord)) {
      individualErrors.push(`"${trimmedWord}"는 중복된 단어입니다.`);
      return;
    }
    processedWords.add(lowerWord);
    
    // 개별 단어 유효성 검사
    const wordValidation = validateWord(trimmedWord);
    if (!wordValidation.isValid) {
      individualErrors.push(`${index + 1}번째 단어 "${trimmedWord}": ${wordValidation.errors.join(', ')}`);
    }
  });
  
  errors.push(...individualErrors);
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 단어를 정규화합니다 (공백 제거, 소문자 변환).
 * @param word 정규화할 단어
 * @returns 정규화된 단어
 */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * 단어 배열을 정규화합니다 (중복 제거, 공백 제거, 소문자 변환).
 * @param words 정규화할 단어 배열
 * @returns 정규화된 단어 배열
 */
export function normalizeWords(words: string[]): string[] {
  const normalized = words
    .map(word => word.trim())
    .filter(word => word.length > 0)
    .map(word => word.toLowerCase());
  
  // 중복 제거
  return Array.from(new Set(normalized));
}

/**
 * 단어 배열을 정규화하고 유효성을 검사합니다.
 * @param words 검사할 단어 배열
 * @returns 정규화된 단어 배열과 유효성 검사 결과
 */
export function processWords(words: string[]): {
  normalizedWords: string[];
  validation: WordValidationResult;
} {
  const normalizedWords = normalizeWords(words);
  const validation = validateWords(normalizedWords);
  
  return {
    normalizedWords,
    validation
  };
}

/**
 * CSV 형태의 문자열을 단어 배열로 변환하고 검증합니다.
 * @param wordsString 쉼표로 구분된 단어 문자열
 * @returns 정규화된 단어 배열과 유효성 검사 결과
 */
export function parseWordsString(wordsString: string): {
  normalizedWords: string[];
  validation: WordValidationResult;
} {
  if (!wordsString || wordsString.trim() === '') {
    return {
      normalizedWords: [],
      validation: { isValid: false, errors: ['단어를 입력해주세요.'] }
    };
  }
  
  const words = wordsString
    .split(',')
    .map(word => word.trim())
    .filter(word => word.length > 0);
  
  return processWords(words);
}

/**
 * 단어가 게임에 적합한지 확인합니다 (추가 게임 관련 제약 조건).
 * @param word 검사할 단어
 * @param minLength 최소 길이 (기본값: 3)
 * @param maxLength 최대 길이 (기본값: 10)
 * @returns 게임 적합성 검사 결과
 */
export function validateWordForGame(
  word: string, 
  minLength: number = 3, 
  maxLength: number = 10
): WordValidationResult {
  const errors: string[] = [];
  
  // 기본 유효성 검사
  const basicValidation = validateWord(word);
  if (!basicValidation.isValid) {
    return basicValidation;
  }
  
  // 길이 검사
  if (word.length < minLength) {
    errors.push(`단어는 최소 ${minLength}글자 이상이어야 합니다.`);
  }
  
  if (word.length > maxLength) {
    errors.push(`단어는 최대 ${maxLength}글자까지 가능합니다.`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 단어 배열이 게임에 적합한지 확인합니다.
 * @param words 검사할 단어 배열
 * @param minLength 최소 길이 (기본값: 3)
 * @param maxLength 최대 길이 (기본값: 10)
 * @returns 게임 적합성 검사 결과
 */
export function validateWordsForGame(
  words: string[], 
  minLength: number = 3, 
  maxLength: number = 10
): WordValidationResult {
  const errors: string[] = [];
  
  // 기본 유효성 검사
  const basicValidation = validateWords(words);
  if (!basicValidation.isValid) {
    return basicValidation;
  }
  
  // 각 단어의 게임 적합성 검사
  words.forEach((word, index) => {
    const gameValidation = validateWordForGame(word, minLength, maxLength);
    if (!gameValidation.isValid) {
      errors.push(`${index + 1}번째 단어 "${word}": ${gameValidation.errors.join(', ')}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
