import tseslint from "typescript-eslint";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import boundaries from "eslint-plugin-boundaries";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "public/**",
      "prisma/**",
      "data/**",
      "next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // FSD 레이어 경계 규칙
  {
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**", mode: "full" },
        { type: "components", pattern: "src/components/**", mode: "full" },
        { type: "features", pattern: "src/features/**", mode: "full" },
        { type: "lib", pattern: "src/lib/**", mode: "full" },
        { type: "hooks", pattern: "src/hooks/**", mode: "full" },
        { type: "shared", pattern: "src/shared/**", mode: "full" },
        { type: "types", pattern: "src/types/**", mode: "full" },
        { type: "i18n", pattern: "src/i18n/**", mode: "full" },
        { type: "data", pattern: "src/data/**", mode: "full" },
        { type: "messages", pattern: "src/messages/**", mode: "full" },
      ],
      "boundaries/ignore": [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
      ],
    },
    rules: {
      // 레이어 의존성 방향 제한 (위반 시 경고)
      "boundaries/element-types": [
        "warn",
        {
          default: "allow",
          rules: [
            // components는 app 레이어를 import할 수 없음
            {
              from: "components",
              disallow: ["app"],
              message: "components → app import 금지 (FSD 위반). lib/actions/ 또는 features/를 사용하세요.",
            },
            // features는 app, components를 import할 수 없음
            {
              from: "features",
              disallow: ["app", "components"],
              message: "features → app/components import 금지 (FSD 위반). lib/ 또는 shared/를 사용하세요.",
            },
            // lib는 app, components, features를 import할 수 없음
            {
              from: "lib",
              disallow: ["app", "components"],
              message: "lib → app/components import 금지 (FSD 위반).",
            },
            // shared, types, hooks는 최하위 레이어
            {
              from: "shared",
              disallow: ["app", "components", "features"],
              message: "shared → 상위 레이어 import 금지 (FSD 위반).",
            },
            {
              from: "types",
              disallow: ["app", "components", "features"],
              message: "types → 상위 레이어 import 금지 (FSD 위반).",
            },
          ],
        },
      ],
    },
  },
);
