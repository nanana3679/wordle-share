import { hangul } from './hangul';
import { kana } from './kana';
import { latin } from './latin';
import type { ScriptAdapter, ScriptId } from './types';

const ADAPTERS: Partial<Record<ScriptId, ScriptAdapter>> = { latin, hangul, kana };

// 현재 등록된 어댑터의 id 목록 (server whitelist 등에서 참조)
export const SUPPORTED_SCRIPTS: readonly ScriptId[] = Object.keys(ADAPTERS) as ScriptId[];

export function isSupportedScript(id: string): id is ScriptId {
  return (SUPPORTED_SCRIPTS as readonly string[]).includes(id);
}

// OS IME(한글, 가나 등) 조합 입력이 필요한 스크립트 여부.
export function scriptUsesIme(id: ScriptId): boolean {
  return id === 'hangul' || id === 'kana';
}

export function getScriptAdapter(id: string): ScriptAdapter {
  const adapter = ADAPTERS[id as ScriptId];
  if (!adapter) {
    if (id !== 'latin') {
      console.warn(`Unknown script "${id}", falling back to latin`);
    }
    return latin;
  }
  return adapter;
}

export type { ScriptAdapter, ScriptId, KeyboardLayout } from './types';
