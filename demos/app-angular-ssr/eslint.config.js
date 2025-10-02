// @ts-check
import tsEslint from 'typescript-eslint';
import ngEslint from 'angular-eslint';
import rootConfig from '../../eslint.config.js';

export default tsEslint.config(...rootConfig, {
	files: ['**/*.ts'],
	extends: [ngEslint.configs.tsRecommended],
	processor: ngEslint.processInlineTemplates,
	rules: {},
});
