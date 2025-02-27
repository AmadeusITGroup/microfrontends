import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

export default [
	// ESM
	{
		input: 'src/index.ts',
		treeshake: false,
		output: {
			file: 'dist/index.js',
			format: 'esm',
			sourcemap: true,
		},
		plugins: [typescript()],
	},
	// CJS
	{
		input: 'src/index.ts',
		treeshake: false,
		output: {
			file: 'dist/index.cjs',
			format: 'cjs',
			sourcemap: true,
		},
		plugins: [typescript()],
	},
	// Declaration
	{
		input: 'src/index.ts',
		output: [{ file: 'dist/index.d.ts', format: 'esm' }],
		plugins: [dts()],
	},
	// ESM Bundle, minified
	{
		input: 'src/index.ts',
		output: {
			file: 'dist/bundle/microfrontends.min.mjs',
			format: 'esm',
			sourcemap: true,
		},
		plugins: [typescript(), terser()],
	},
];
