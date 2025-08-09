import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/generated/**/*.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
});
