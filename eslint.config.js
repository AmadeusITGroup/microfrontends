// @ts-check
import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
	eslint.configs.recommended,
	tsEslint.configs.recommended,
	tsEslint.configs.stylistic,
	{
		ignores: [
			'**/dist/',
			'**/bundle/',
			'**/.wireit/',
			'**/coverage/',
			'**/playwright-report/',
			'**/test-results/',
		],
	},
	{
		files: ['**/*.ts'],
		rules: {
			'@typescript-eslint/no-unused-expressions': 'off',
		},
	},
	{
		files: ['**/*.spec.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
);
