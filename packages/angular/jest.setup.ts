import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv();

/**
 * structured clone polyfill required in the JSDOM environment
 */
import 'core-js/stable/structured-clone.js';
import 'core-js/stable/url';
