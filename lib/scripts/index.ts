import { hangul } from './hangul';
import { latin } from './latin';
import type { ScriptAdapter, ScriptId } from './types';

const ADAPTERS: Partial<Record<ScriptId, ScriptAdapter>> = { latin, hangul };

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
