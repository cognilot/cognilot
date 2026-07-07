export default {
  '**/*.{js,jsx,ts,tsx,json,css,md}': ['prettier --write'],
  'cognilot-api/src/**/*.ts': () => 'pnpm --filter @cognilot/api lint',
  'cognilot-sdk/src/**/*.ts': () => 'pnpm --filter @cognilot/sdk lint',
  'cognilot-extension/src/**/*.{ts,tsx}': () => 'pnpm --filter @cognilot/extension lint',
  'cognilot-web/src/**/*.{ts,tsx}': () => 'pnpm --filter @cognilot/web lint',
};
