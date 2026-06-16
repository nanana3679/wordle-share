import { describe, expect, it } from "vitest";
import { formatGameUnit } from "./game-display";

describe("formatGameUnit", () => {
  it("latin unit은 대문자로 표시한다", () => {
    expect(formatGameUnit("a", "latin")).toBe("A");
  });

  it("latin이 아닌 script는 원문 그대로 표시한다", () => {
    expect(formatGameUnit("ㅏ", "hangul")).toBe("ㅏ");
    expect(formatGameUnit("あ", "kana")).toBe("あ");
  });
});
