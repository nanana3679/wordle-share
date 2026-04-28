import { latin } from './latin';
import type { ScriptAdapter, ScriptId } from './types';

const ADAPTERS: Partial<Record<ScriptId, ScriptAdapter>> = { latin };

export function getScriptAdapter(id: string): ScriptAdapter {
  return ADAPTERS[id as ScriptId] ?? latin;
}

export type { ScriptAdapter, ScriptId, KeyboardLayout } from './types';
