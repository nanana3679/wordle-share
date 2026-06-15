import { createHash } from "node:crypto";

// ADR 0002: ip_hash = SHA-256(req.ip + 고정 salt)
// salt는 환경변수 IP_HASH_SALT — 회전 시 기존 좋아요가 전부 무효화되므로 영구 고정.

export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}

// x-forwarded-for는 "client, proxy1, proxy2" 형태 — 첫 항목이 원 클라이언트
export function parseForwardedFor(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const first = headerValue.split(",")[0]?.trim();
  return first || null;
}

type HeaderReader = {
  get(name: string): string | null;
};

export function requestIpFromHeaders(headers: HeaderReader): string | null {
  return (
    parseForwardedFor(headers.get("x-forwarded-for")) ??
    headers.get("x-real-ip") ??
    headers.get("x-vercel-forwarded-for") ??
    headers.get("cf-connecting-ip") ??
    headers.get("true-client-ip")
  );
}
