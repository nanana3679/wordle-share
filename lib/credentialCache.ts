// ADR 0001: raw (nick, pw) + my_decks를 localStorage에 캐시해 폼 자동 채움.
// 마찰 최소화 우선 — XSS 방어는 T11(#56) 보안 베이스라인 트랙에서 다룬다.

const CREDENTIALS_KEY = "wordledecks.credentials";
const MY_DECKS_KEY = "wordledecks.my_decks";

export interface CachedCredentials {
  nick: string;
  password: string;
}

export interface MyDeckEntry {
  id: string;
  name: string;
}

export function loadCachedCredentials(): CachedCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.nick === "string" && typeof parsed?.password === "string") {
      return { nick: parsed.nick, password: parsed.password };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCachedCredentials(credentials: CachedCredentials): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch {
    // 저장 실패는 무시 (private mode 등)
  }
}

export function loadMyDecks(): MyDeckEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MY_DECKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendMyDeck(entry: MyDeckEntry): void {
  if (typeof window === "undefined") return;
  try {
    const decks = loadMyDecks().filter((d) => d.id !== entry.id);
    decks.unshift(entry);
    window.localStorage.setItem(MY_DECKS_KEY, JSON.stringify(decks));
  } catch {
    // 저장 실패는 무시
  }
}
