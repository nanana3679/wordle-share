import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // 보안 베이스라인 (T11 / #56): XSS 방어선. dangerouslySetInnerHTML는 기본 금지하고,
    // sanitizer를 거친 경우에만 라인 단위 eslint-disable로 허용한다. docs/platform/SECURITY.md 참고.
    rules: {
      "react/no-danger": "error",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
