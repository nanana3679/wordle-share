import { hangul } from './hangul';
import { kana } from './kana';
import { latin } from './latin';
import type { ScriptAdapter, ScriptId } from './types';

const ADAPTERS: Partial<Record<ScriptId, ScriptAdapter>> = { latin, hangul, kana };

// 현재 등록된 어댑터의 id 목록 (server whitelist 등에서 참조)
export const SUPPORTED_SCRIPTS: readonly ScriptId[] = Object.keys(ADAPTERS) as ScriptId[];

// Set 형태 — O(1) 포함 검사용 (deck load/validate 경계에서 참조)
export const REGISTERED_SCRIPT_IDS: ReadonlySet<string> = new Set<string>(SUPPORTED_SCRIPTS);

export function isSupportedScript(id: string): id is ScriptId {
  return REGISTERED_SCRIPT_IDS.has(id);
}

/**
 * 덱 로드/검증 경계에서 사용하는 assert helper.
 * getScriptAdapter의 silent fallback과 달리 미등록 id를 hard-fail한다.
 * 게임 UI 렌더 경로에서는 사용하지 말 것 — getScriptAdapter를 그대로 쓸 것.
 */
export function assertKnownScript(id: string): asserts id is ScriptId {
  if (!REGISTERED_SCRIPT_IDS.has(id)) {
    throw new Error(
      `Unknown script id: "${id}". Registered scripts: ${[...REGISTERED_SCRIPT_IDS].join(', ')}`,
    );
  }
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
