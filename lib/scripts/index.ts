import { hangul } from './hangul';
import { latin } from './latin';
import type { ScriptAdapter, ScriptId } from './types';

const ADAPTERS: Partial<Record<ScriptId, ScriptAdapter>> = { latin, hangul };

// 현재 등록된 어댑터의 id 목록 (server whitelist 등에서 참조)
export const SUPPORTED_SCRIPTS: readonly ScriptId[] = Object.keys(ADAPTERS) as ScriptId[];

export function isSupportedScript(id: string): id is ScriptId {
  return (SUPPORTED_SCRIPTS as readonly string[]).includes(id);
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
