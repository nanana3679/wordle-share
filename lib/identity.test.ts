import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validateNick,
  validatePasswordLength,
  formatDisplayNick,
  NICK_MAX_LENGTH,
} from './identity';

describe('hashPassword / verifyPassword', () => {
  it('bcrypt 형식 해시를 생성한다 (DB CHECK 제약과 일치)', async () => {
    const hash = await hashPassword('test-pw-1234');
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
  });

  it('올바른 비밀번호는 검증을 통과한다', async () => {
    const hash = await hashPassword('correct-pw');
    await expect(verifyPassword('correct-pw', hash)).resolves.toBe(true);
  });

  it('틀린 비밀번호는 검증에 실패한다', async () => {
    const hash = await hashPassword('correct-pw');
    await expect(verifyPassword('wrong-pw', hash)).resolves.toBe(false);
  });

  it('같은 비밀번호도 매번 다른 해시가 나온다 (salt)', async () => {
    const [a, b] = await Promise.all([hashPassword('same-pw'), hashPassword('same-pw')]);
    expect(a).not.toBe(b);
    await expect(verifyPassword('same-pw', a)).resolves.toBe(true);
    await expect(verifyPassword('same-pw', b)).resolves.toBe(true);
  });

  it('유니코드 비밀번호 round-trip', async () => {
    const hash = await hashPassword('한글비밀번호123');
    await expect(verifyPassword('한글비밀번호123', hash)).resolves.toBe(true);
  });
});

describe('validateNick', () => {
  it('한글/로마자 닉을 허용한다', () => {
    expect(validateNick('철수')).toBe(true);
    expect(validateNick('pikachu-fan')).toBe(true);
  });

  it("'#'이 포함된 닉을 거부한다 (표시 형식과 충돌)", () => {
    expect(validateNick('철수#a3f9')).toBe(false);
    expect(validateNick('#')).toBe(false);
  });

  it('빈 닉과 길이 초과 닉을 거부한다', () => {
    expect(validateNick('')).toBe(false);
    expect(validateNick('a'.repeat(NICK_MAX_LENGTH + 1))).toBe(false);
    expect(validateNick('a'.repeat(NICK_MAX_LENGTH))).toBe(true);
  });
});

describe('validatePasswordLength', () => {
  it('4~64자 범위를 강제한다', () => {
    expect(validatePasswordLength('123')).toBe(false);
    expect(validatePasswordLength('1234')).toBe(true);
    expect(validatePasswordLength('a'.repeat(64))).toBe(true);
    expect(validatePasswordLength('a'.repeat(65))).toBe(false);
  });
});

describe('formatDisplayNick', () => {
  it('{nick}#{anon_id 앞 4 hex} 형식으로 만든다', () => {
    expect(formatDisplayNick('철수', 'a3f9c2d1-0000-4000-8000-000000000000')).toBe('철수#a3f9');
  });

  it('uuid 대시를 무시하고 hex만 사용하며 소문자로 통일한다', () => {
    expect(formatDisplayNick('kim', 'AB-CDEF1234')).toBe('kim#abcd');
  });
});
