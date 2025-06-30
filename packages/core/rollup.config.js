import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const tsOptions = {
	tsconfig: './tsconfig.rollup.json',
};

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
		plugins: [typescript(tsOptions)],
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
		plugins: [typescript(tsOptions)],
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
		plugins: [typescript(tsOptions), terser()],
	},
	// ESM Bundle, development
	{
		input: 'src/index.ts',
		treeshake: false,
		output: {
			file: 'dist/bundle/microfrontends.dev.mjs',
			format: 'esm',
			sourcemap: true,
		},
		plugins: [typescript(tsOptions)],
	},
];
