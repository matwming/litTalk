/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {esbuildPlugin} from '@web/dev-server-esbuild';
import {playwrightLauncher} from '@web/test-runner-playwright';

export default {
  rootDir: '.',
  files: ['test/**/*.test.ts'],
  nodeResolve: {exportConditions: ['development']},
  // pnpm symlinks node_modules — the resolver must follow symlinks.
  preserveSymlinks: false,
  browsers: [playwrightLauncher({product: 'chromium'})],
  testFramework: {
    config: {ui: 'tdd', timeout: '5000'},
  },
  plugins: [
    esbuildPlugin({
      ts: true,
      target: 'es2021',
      tsconfig: 'tsconfig.json',
    }),
  ],
  coverage: true,
  coverageConfig: {
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.styles.ts', 'src/lib/navigate.ts'],
    threshold: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    report: true,
    reporters: ['lcov', 'text-summary'],
  },
};
