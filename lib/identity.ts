import bcrypt from "bcryptjs";

// ADR 0001: 중앙 identity table 없이 자원(deck/comment) row마다 bcrypt 해시를 저장하는
// 단일 (nick, pw) convention. 해시/검증은 반드시 서버에서만 수행한다.

const BCRYPT_ROUNDS = 10;

export const NICK_MIN_LENGTH = 1;
export const NICK_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 64;

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

// nick에 '#' 불허 — 표시 형식 {nick}#{suffix}와 충돌 방지 (ADR 0001)
export function validateNick(nick: string): boolean {
  return (
    nick.length >= NICK_MIN_LENGTH &&
    nick.length <= NICK_MAX_LENGTH &&
    !nick.includes("#")
  );
}

export function validatePasswordLength(pw: string): boolean {
  return pw.length >= PASSWORD_MIN_LENGTH && pw.length <= PASSWORD_MAX_LENGTH;
}

// 표시용 disambiguation: {nick}#{anon_id 앞 4 hex} (예: 철수#a3f9)
// nick은 전역 유일이 아니므로 UI에서만 구분자로 쓴다 (ADR 0001)
export function formatDisplayNick(nick: string, anonId: string): string {
  return `${nick}#${anonId.replaceAll("-", "").slice(0, 4).toLowerCase()}`;
}

// 운영자 시드 봇 전용 prefix (ADR 0011) — 일반 사용자는 사용 불가
export const BOT_NICK_PREFIX = "bot_";

export function isBotNick(nick: string): boolean {
  return nick.toLowerCase().startsWith(BOT_NICK_PREFIX);
}
