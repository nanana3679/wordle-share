import { describe, it, expect } from 'vitest';
import { hashIp, parseForwardedFor } from './ip';

describe('hashIp — 결정성 (AC)', () => {
  it('같은 (ip, salt)면 항상 같은 해시', () => {
    expect(hashIp('203.0.113.7', 'salt-a')).toBe(hashIp('203.0.113.7', 'salt-a'));
  });

  it('ip 또는 salt가 다르면 다른 해시', () => {
    const base = hashIp('203.0.113.7', 'salt-a');
    expect(hashIp('203.0.113.8', 'salt-a')).not.toBe(base);
    expect(hashIp('203.0.113.7', 'salt-b')).not.toBe(base);
  });

  it('SHA-256 hex 형식 (DB CHECK 제약과 일치)', () => {
    expect(hashIp('::1', 'salt')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('parseForwardedFor', () => {
  it('첫 항목(원 클라이언트)을 반환한다', () => {
    expect(parseForwardedFor('203.0.113.7, 10.0.0.1, 10.0.0.2')).toBe('203.0.113.7');
  });

  it('단일 값과 공백을 처리한다', () => {
    expect(parseForwardedFor(' 203.0.113.7 ')).toBe('203.0.113.7');
  });

  it('없거나 비어있으면 null', () => {
    expect(parseForwardedFor(null)).toBeNull();
    expect(parseForwardedFor('')).toBeNull();
  });
});
