import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // This app doesn't use the React Compiler, and this rule flags the
      // standard "fetch on mount / setState from a realtime subscription"
      // pattern used throughout — not an actual bug in that context.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
