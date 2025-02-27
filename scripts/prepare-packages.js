import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLISH_DIR = path.resolve(__dirname, '../.publish');
const ROOT_DIR = path.resolve(__dirname, '..');

function packCore() {
	const cwd = path.resolve(__dirname, '../packages/core');
	const packageJsonPath = path.join(cwd, 'package.json');
	const backupPath = path.join(cwd, `package.json.backup`);

	try {
		// copy LICENSE
		fs.copySync(path.join(ROOT_DIR, 'LICENSE'), path.join(cwd, 'LICENSE'));

		// `npm pkg delete`
		fs.copySync(packageJsonPath, backupPath);
		console.log(`Cleaning package.json in ${cwd}...`);
		execSync('npm pkg delete wireit scripts devDependencies', { cwd, encoding: 'utf8' });

		// `npm pack`
		execSync(`npm pack --pack-destination "${PUBLISH_DIR}"`, { cwd, encoding: 'utf8' });
	} catch (err) {
		console.error(`Error packing ${cwd}:`, err);
	} finally {
		fs.moveSync(backupPath, packageJsonPath, { overwrite: true });
		fs.removeSync(path.join(cwd, 'LICENSE'));
	}
}

function packAngular() {
	const cwd = path.resolve(__dirname, '../packages/angular/dist');

	try {
		// copy README.md and LICENSE
		fs.copySync(path.join(cwd, '..', 'README.md'), path.join(cwd, 'README.md'));
		fs.copySync(path.join(ROOT_DIR, 'LICENSE'), path.join(cwd, 'LICENSE'));

		// `npm pack`
		execSync(`npm pack --pack-destination "${PUBLISH_DIR}"`, { cwd, encoding: 'utf8' });
	} catch (err) {
		console.error(`Error packing ${cwd}:`, err);
	}
}

fs.removeSync(PUBLISH_DIR);
fs.ensureDirSync(PUBLISH_DIR);

packCore();
packAngular();
