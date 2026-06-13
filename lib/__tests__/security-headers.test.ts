import { describe, it, expect } from "vitest";
import {
  buildContentSecurityPolicy,
  serializeJsonLd,
  supabaseConnectSrc,
  STATIC_SECURITY_HEADERS,
} from "../security-headers";

function parse(csp: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of csp.split(";").map((p) => p.trim()).filter(Boolean)) {
    const [name, ...values] = part.split(/\s+/);
    map.set(name, values);
  }
  return map;
}

describe("buildContentSecurityPolicy", () => {
  it("locks script-src to self + nonce + strict-dynamic without unsafe-inline", () => {
    const csp = parse(buildContentSecurityPolicy({ nonce: "abc123", isDev: false }));
    const scriptSrc = csp.get("script-src")!;
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("allows unsafe-eval only in dev (Turbopack HMR)", () => {
    expect(parse(buildContentSecurityPolicy({ nonce: "n", isDev: true })).get("script-src")).toContain(
      "'unsafe-eval'"
    );
    expect(
      parse(buildContentSecurityPolicy({ nonce: "n", isDev: false })).get("script-src")
    ).not.toContain("'unsafe-eval'");
  });

  it("sets clickjacking/injection baseline directives", () => {
    const csp = parse(buildContentSecurityPolicy({ nonce: "n", isDev: false }));
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("base-uri")).toEqual(["'self'"]);
    expect(csp.get("form-action")).toEqual(["'self'"]);
    expect(csp.get("default-src")).toEqual(["'self'"]);
  });

  it("adds upgrade-insecure-requests in prod only", () => {
    expect(buildContentSecurityPolicy({ nonce: "n", isDev: false })).toContain(
      "upgrade-insecure-requests"
    );
    expect(buildContentSecurityPolicy({ nonce: "n", isDev: true })).not.toContain(
      "upgrade-insecure-requests"
    );
  });

  it("merges extra connect-src origins (Supabase)", () => {
    const csp = parse(
      buildContentSecurityPolicy({
        nonce: "n",
        isDev: false,
        connectSrc: ["https://proj.supabase.co", "wss://proj.supabase.co"],
      })
    );
    expect(csp.get("connect-src")).toEqual([
      "'self'",
      "https://proj.supabase.co",
      "wss://proj.supabase.co",
    ]);
  });
});

describe("supabaseConnectSrc", () => {
  it("derives https + wss origins from the Supabase URL", () => {
    expect(supabaseConnectSrc("https://proj.supabase.co")).toEqual([
      "https://proj.supabase.co",
      "wss://proj.supabase.co",
    ]);
  });

  it("returns empty for missing or malformed URLs", () => {
    expect(supabaseConnectSrc(undefined)).toEqual([]);
    expect(supabaseConnectSrc("not-a-url")).toEqual([]);
  });
});

describe("serializeJsonLd", () => {
  it("escapes < to block </script> breakout from user input", () => {
    const out = serializeJsonLd({ name: "</script><img src=x onerror=alert(1)>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
    // 여전히 유효한 JSON.
    expect(JSON.parse(out)).toEqual({ name: "</script><img src=x onerror=alert(1)>" });
  });
});

describe("STATIC_SECURITY_HEADERS", () => {
  it("includes nosniff, frame deny, and referrer policy", () => {
    expect(STATIC_SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(STATIC_SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
    expect(STATIC_SECURITY_HEADERS["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });
});
