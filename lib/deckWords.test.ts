import { describe, it, expect } from 'vitest';
import { parseWordLines, planWordUpdate, planWordSync, type DeckWordRow } from './deckWords';

function row(id: string, text: string, active: boolean): DeckWordRow {
  return { id, text, active };
}

describe('parseWordLines', () => {
  it('정규화(NFC+lowercase) 후 dedupe한다', () => {
    const result = parseWordLines('LoL\nlol\npikachu', 'latin');
    expect(result).toEqual({ ok: true, words: ['lol', 'pikachu'] });
  });

  it('빈 줄과 공백 줄은 무시한다', () => {
    const result = parseWordLines('\n  \npikachu\n', 'latin');
    expect(result).toEqual({ ok: true, words: ['pikachu'] });
  });

  it('허용 문자 외 단어는 원본 줄을 들어 거부한다', () => {
    const result = parseWordLines('pikachu\nstar wars', 'latin');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.invalidLines).toEqual(['star wars']);
  });

  it('유효 단어 0개면 "최소 1개 단어 필요" 에러 (AC)', () => {
    const result = parseWordLines('', 'latin');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('최소 1개');
  });

  it('requireMin: false면 0개를 허용한다 (편집 시 추가 없음 케이스)', () => {
    expect(parseWordLines('', 'latin', { requireMin: false })).toEqual({ ok: true, words: [] });
  });
});

describe('planWordUpdate — reactivate via toggle (ADR 0010)', () => {
  it('비활성 row와 같은 text 추가는 insert가 아니라 reactivate다', () => {
    const existing = [row('w1', '피카츄', false), row('w2', '이상해씨', true)];
    const result = planWordUpdate(existing, ['피카츄'], []);
    expect(result).toEqual({
      ok: true,
      plan: { toInsert: [], toReactivateIds: ['w1'], toDeactivateIds: [] },
    });
  });

  it('이미 active인 text 추가는 no-op이다', () => {
    const existing = [row('w1', '피카츄', true)];
    const result = planWordUpdate(existing, ['피카츄'], []);
    expect(result).toEqual({
      ok: true,
      plan: { toInsert: [], toReactivateIds: [], toDeactivateIds: [] },
    });
  });

  it('새 text는 insert된다', () => {
    const existing = [row('w1', '피카츄', true)];
    const result = planWordUpdate(existing, ['파이리'], []);
    expect(result).toEqual({
      ok: true,
      plan: { toInsert: ['파이리'], toReactivateIds: [], toDeactivateIds: [] },
    });
  });

  it('같은 row가 추가·비활성화에 동시에 걸리면 추가가 이긴다', () => {
    const existing = [row('w1', '피카츄', true), row('w2', '이상해씨', true)];
    const result = planWordUpdate(existing, ['피카츄'], ['w1']);
    expect(result).toEqual({
      ok: true,
      plan: { toInsert: [], toReactivateIds: ['w1'], toDeactivateIds: [] },
    });
  });
});

describe('planWordUpdate — min 1 active invariant (ADR 0010)', () => {
  it('마지막 active 단어 비활성화는 reject된다 (AC)', () => {
    const existing = [row('w1', '피카츄', true), row('w2', '이상해씨', false)];
    const result = planWordUpdate(existing, [], ['w1']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('마지막 활성 단어');
  });

  it('비활성화와 동시에 새 단어를 추가하면 통과한다', () => {
    const existing = [row('w1', '피카츄', true)];
    const result = planWordUpdate(existing, ['파이리'], ['w1']);
    expect(result).toEqual({
      ok: true,
      plan: { toInsert: ['파이리'], toReactivateIds: [], toDeactivateIds: ['w1'] },
    });
  });

  it('active가 2개 이상 남으면 비활성화 가능하다', () => {
    const existing = [row('w1', '피카츄', true), row('w2', '이상해씨', true)];
    const result = planWordUpdate(existing, [], ['w2']);
    expect(result).toEqual({
      ok: true,
      plan: { toInsert: [], toReactivateIds: [], toDeactivateIds: ['w2'] },
    });
  });

  it('존재하지 않거나 이미 비활성인 id의 비활성화 요청은 무시한다', () => {
    const existing = [row('w1', '피카츄', true), row('w2', '이상해씨', false)];
    const result = planWordUpdate(existing, [], ['w2', 'unknown']);
    expect(result).toEqual({
      ok: true,
      plan: { toInsert: [], toReactivateIds: [], toDeactivateIds: [] },
    });
  });
});

describe('planWordSync — PUT 멱등 동기화 (ADR 0011, #77)', () => {
  it('desired에만 있는 단어는 insert, 사라진 단어는 deactivate', () => {
    const existing = [row('w1', '피카츄', true), row('w2', '이상해씨', true)];
    const result = planWordSync(existing, ['피카츄', '파이리']);
    expect(result).toEqual({
      ok: true,
      plan: { toInsert: ['파이리'], toReactivateIds: [], toDeactivateIds: ['w2'] },
    });
  });

  it('inactive였던 단어가 desired에 있으면 reactivate (영구 ID)', () => {
    const existing = [row('w1', '피카츄', false), row('w2', '이상해씨', true)];
    const result = planWordSync(existing, ['피카츄', '이상해씨']);
    expect(result).toEqual({
      ok: true,
      plan: { toInsert: [], toReactivateIds: ['w1'], toDeactivateIds: [] },
    });
  });

  it('멱등성: 같은 요청을 두 번 적용하면 두 번째는 전부 no-op (AC)', () => {
    const existing = [row('w1', '피카츄', true), row('w2', '이상해씨', true)];
    const desired = ['피카츄', '파이리'];
    const first = planWordSync(existing, desired);
    expect(first.ok).toBe(true);
    // 1차 적용 후 상태 시뮬레이션
    const after = [row('w1', '피카츄', true), row('w2', '이상해씨', false), row('w3', '파이리', true)];
    const second = planWordSync(after, desired);
    expect(second).toEqual({
      ok: true,
      plan: { toInsert: [], toReactivateIds: [], toDeactivateIds: [] },
    });
  });

  it('빈 desired(마지막 active 제거)는 reject — min-1-active (AC)', () => {
    const existing = [row('w1', '피카츄', true)];
    const result = planWordSync(existing, []);
    expect(result.ok).toBe(false);
  });
});
