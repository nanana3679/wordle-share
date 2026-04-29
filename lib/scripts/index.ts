import { cyrillic } from './cyrillic';
import { greek } from './greek';
import { latin } from './latin';
import type { ScriptAdapter, ScriptId } from './types';

const ADAPTERS: Partial<Record<ScriptId, ScriptAdapter>> = {
  latin,
  cyrillic,
  greek,
};

export const SUPPORTED_SCRIPTS = Object.keys(ADAPTERS) as ScriptId[];

export function isSupportedScript(id: unknown): id is ScriptId {
  return typeof id === 'string' && (SUPPORTED_SCRIPTS as string[]).includes(id);
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

