import { describe, it, expect } from 'vitest';
import {
  REGISTERED_SCRIPT_IDS,
  SUPPORTED_SCRIPTS,
  isSupportedScript,
  assertKnownScript,
} from '../index';

describe('REGISTERED_SCRIPT_IDS', () => {
  it('등록된 어댑터 id를 포함한다 (latin, hangul, kana)', () => {
    expect(REGISTERED_SCRIPT_IDS.has('latin')).toBe(true);
    expect(REGISTERED_SCRIPT_IDS.has('hangul')).toBe(true);
    expect(REGISTERED_SCRIPT_IDS.has('kana')).toBe(true);
  });

  it('SUPPORTED_SCRIPTS와 동일한 멤버를 가진다', () => {
    expect(REGISTERED_SCRIPT_IDS.size).toBe(SUPPORTED_SCRIPTS.length);
    for (const id of SUPPORTED_SCRIPTS) {
      expect(REGISTERED_SCRIPT_IDS.has(id)).toBe(true);
    }
  });

  it('미등록 ScriptId 타입 값은 포함하지 않는다 (cyrillic, greek, hebrew, arabic)', () => {
    expect(REGISTERED_SCRIPT_IDS.has('cyrillic')).toBe(false);
    expect(REGISTERED_SCRIPT_IDS.has('greek')).toBe(false);
    expect(REGISTERED_SCRIPT_IDS.has('hebrew')).toBe(false);
    expect(REGISTERED_SCRIPT_IDS.has('arabic')).toBe(false);
  });
});

describe('isSupportedScript', () => {
  it('등록된 id는 true를 반환하고 타입 가드로 동작한다', () => {
    expect(isSupportedScript('latin')).toBe(true);
    expect(isSupportedScript('hangul')).toBe(true);
    expect(isSupportedScript('kana')).toBe(true);
  });

  it('미등록 ScriptId 타입 값은 false를 반환한다', () => {
    expect(isSupportedScript('cyrillic')).toBe(false);
    expect(isSupportedScript('greek')).toBe(false);
    expect(isSupportedScript('hebrew')).toBe(false);
    expect(isSupportedScript('arabic')).toBe(false);
  });

  it('완전히 알 수 없는 문자열도 false를 반환한다', () => {
    expect(isSupportedScript('unknown')).toBe(false);
    expect(isSupportedScript('')).toBe(false);
    expect(isSupportedScript('LATIN')).toBe(false); // 대소문자 구분
  });
});

describe('assertKnownScript', () => {
  it('등록된 id는 throw하지 않는다', () => {
    expect(() => assertKnownScript('latin')).not.toThrow();
    expect(() => assertKnownScript('hangul')).not.toThrow();
    expect(() => assertKnownScript('kana')).not.toThrow();
  });

  it('미등록 id는 Error를 throw한다', () => {
    expect(() => assertKnownScript('cyrillic')).toThrow(Error);
    expect(() => assertKnownScript('greek')).toThrow(Error);
    expect(() => assertKnownScript('unknown')).toThrow(Error);
  });

  it('throw된 에러 메시지에 미등록 id 이름이 포함된다', () => {
    expect(() => assertKnownScript('cyrillic')).toThrow('cyrillic');
    expect(() => assertKnownScript('mystery-script')).toThrow('mystery-script');
  });

  it('throw된 에러 메시지에 등록된 script 목록이 포함된다', () => {
    try {
      assertKnownScript('unknown-id');
      // 이 줄에 도달하면 테스트 실패
      expect.fail('assertKnownScript should have thrown');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('latin');
      expect(msg).toContain('hangul');
      expect(msg).toContain('kana');
    }
  });
});
