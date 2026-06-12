// 운영자 시드 파이프라인 공통 유틸 (#78)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const DEFAULT_MODEL = "claude-opus-4-8";

export function newRunId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

export function writeArtifact(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`[artifact] ${path}`);
}

// 응답 텍스트에서 첫 JSON 블록을 추출한다 (```json 펜스 또는 bare JSON)
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf("{"));
  return JSON.parse(candidate.trim());
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`환경변수 ${name}이(가) 필요합니다.`);
    process.exit(1);
  }
  return value;
}
