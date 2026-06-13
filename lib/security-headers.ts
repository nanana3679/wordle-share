// 보안 베이스라인 헤더 (T11 / #56). raw pw localStorage 저장(ADR 0001) 채택으로
// XSS가 사실상 인증 방어선 → script-src를 nonce + strict-dynamic로 잠근다.
// 정책 근거·운영 룰은 docs/platform/SECURITY.md 참고.

export interface CspOptions {
  /** 요청별 1회용 nonce (base64). Next.js가 자체 스크립트에 자동 주입한다. */
  nonce: string;
  /** dev 모드 여부. Turbopack HMR이 eval을 쓰므로 dev에서만 'unsafe-eval' 허용. */
  isDev: boolean;
  /** connect-src에 추가 허용할 오리진 (Supabase REST/Realtime 등). */
  connectSrc?: string[];
}

/**
 * Content-Security-Policy 헤더 문자열을 생성한다.
 *
 * - script-src: 'self' + nonce + 'strict-dynamic' → inline/외부 무허가 스크립트 차단.
 *   unsafe-inline 미사용 (Next.js 하이드레이션 스크립트는 nonce로 통과).
 * - object-src 'none', base-uri 'self', frame-ancestors 'none' → 클릭재킹/인젝션 차단.
 */
export function buildContentSecurityPolicy({ nonce, isDev, connectSrc = [] }: CspOptions): string {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDev) {
    // Turbopack/React Refresh가 eval 기반 HMR을 사용한다 (dev 한정).
    scriptSrc.push("'unsafe-eval'");
  }

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    // Tailwind/next-themes/폰트 변수 등 inline style은 광범위하게 쓰여 nonce화가 비현실적.
    // style은 스크립트와 달리 인증 방어선이 아니므로 'unsafe-inline' 허용.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...connectSrc],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const parts = Object.entries(directives).map(
    ([key, values]) => `${key} ${values.join(" ")}`
  );
  if (!isDev) {
    // prod에서는 http→https 자동 승격. dev(localhost http)에서는 제외.
    parts.push("upgrade-insecure-requests");
  }

  return parts.join("; ");
}

/**
 * CSP 외 정적 보안 헤더. 모든 응답에 동일하게 적용된다.
 */
export const STATIC_SECURITY_HEADERS: Record<string, string> = {
  // MIME 스니핑 차단.
  "X-Content-Type-Options": "nosniff",
  // frame-ancestors의 레거시 폴백 (구형 브라우저).
  "X-Frame-Options": "DENY",
  // referrer 최소 노출.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // 브라우저 기능 기본 차단 (필요 시 개별 허용).
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * JSON-LD를 <script> inline 삽입용으로 안전하게 직렬화한다.
 * 사용자 입력(덱 이름·닉네임 등)에 `</script>`가 섞여도 태그를 깨고 나오지 못하도록
 * `<`를 유니코드 이스케이프한다. JSON 의미는 보존된다.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Supabase REST/Realtime 오리진을 connect-src 항목으로 변환한다.
 * `https://xxxx.supabase.co` → `['https://xxxx.supabase.co', 'wss://xxxx.supabase.co']`.
 */
export function supabaseConnectSrc(supabaseUrl: string | undefined): string[] {
  if (!supabaseUrl) return [];
  try {
    const { origin, host } = new URL(supabaseUrl);
    return [origin, `wss://${host}`];
  } catch {
    return [];
  }
}
