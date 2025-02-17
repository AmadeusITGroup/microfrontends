// @ts-check
import tsEslint from 'typescript-eslint';
import ngEslint from 'angular-eslint';
import rootConfig from '../../eslint.config.js';

export default tsEslint.config(...rootConfig, {
	files: ['**/*.ts'],
	extends: [ngEslint.configs.tsRecommended],
	processor: ngEslint.processInlineTemplates,
	rules: {
		'@angular-eslint/directive-selector': [
			'error',
			{
				type: 'attribute',
				prefix: 'lib',
				style: 'camelCase',
			},
		],
		'@angular-eslint/component-selector': [
			'error',
			{
				type: 'element',
				prefix: 'lib',
				style: 'kebab-case',
			},
		],
	},
});
