"use client";

import { useState, useEffect } from "react";
import { parseWordsString, type WordValidationResult } from "@/lib/wordConstraints";

interface WordInputValidatorProps {
  wordsString: string;
  onValidationChange?: (result: WordValidationResult) => void;
  showDetails?: boolean;
}

export function WordInputValidator({ 
  wordsString, 
  onValidationChange, 
  showDetails = true 
}: WordInputValidatorProps) {
  const [validationResult, setValidationResult] = useState<WordValidationResult>({
    isValid: true,
    errors: []
  });

  useEffect(() => {
    if (!wordsString.trim()) {
      const result = { isValid: true, errors: [] };
      setValidationResult(result);
      onValidationChange?.(result);
      return;
    }

    const result = parseWordsString(wordsString);
    setValidationResult(result.validation);
    onValidationChange?.(result.validation);
  }, [wordsString, onValidationChange]);

  if (!showDetails) {
    return null;
  }

  if (validationResult.isValid && wordsString.trim()) {
    return (
      <div className="validation-success">
        ✅ 단어가 유효합니다.
      </div>
    );
  }

  if (validationResult.errors.length > 0) {
    return (
      <div className="validation-errors">
        <div className="error-header">
          ❌ 단어 검증 실패:
        </div>
        <ul className="error-list">
          {validationResult.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}

// 단어 입력 필드를 위한 훅
export function useWordValidation(wordsString: string) {
  const [validationResult, setValidationResult] = useState<WordValidationResult>({
    isValid: true,
    errors: []
  });

  useEffect(() => {
    if (!wordsString.trim()) {
      setValidationResult({ isValid: true, errors: [] });
      return;
    }

    const result = parseWordsString(wordsString);
    setValidationResult(result.validation);
  }, [wordsString]);

  return {
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    hasErrors: validationResult.errors.length > 0,
    validationResult
  };
}

// 단어 개수와 통계를 보여주는 컴포넌트
interface WordStatsProps {
  wordsString: string;
}

export function WordStats({ wordsString }: WordStatsProps) {
  const { normalizedWords } = parseWordsString(wordsString);
  
  if (!wordsString.trim()) {
    return (
      <div className="word-stats">
        <span>단어를 입력해주세요.</span>
      </div>
    );
  }

  const uniqueWords = new Set(normalizedWords);
  const totalWords = normalizedWords.length;
  const uniqueCount = uniqueWords.size;
  const duplicates = totalWords - uniqueCount;

  return (
    <div className="word-stats">
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">총 단어:</span>
          <span className="stat-value">{totalWords}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">고유 단어:</span>
          <span className="stat-value">{uniqueCount}</span>
        </div>
        {duplicates > 0 && (
          <div className="stat-item error">
            <span className="stat-label">중복:</span>
            <span className="stat-value">{duplicates}</span>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .word-stats {
          margin-top: 8px;
          padding: 8px;
          background-color: #f8f9fa;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .stats-grid {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        
        .stat-item.error {
          color: #dc3545;
        }
        
        .stat-label {
          font-size: 0.8rem;
          color: #666;
        }
        
        .stat-value {
          font-weight: bold;
          font-size: 1.1rem;
        }
        
        .validation-success {
          margin-top: 8px;
          padding: 8px;
          background-color: #d4edda;
          color: #155724;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .validation-errors {
          margin-top: 8px;
          padding: 8px;
          background-color: #f8d7da;
          color: #721c24;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .error-header {
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .error-list {
          margin: 0;
          padding-left: 16px;
        }
        
        .error-list li {
          margin-bottom: 2px;
        }
      `}</style>
    </div>
  );
}
