import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLISH_DIR = path.resolve(__dirname, '../.publish');

function packCore() {
	const cwd = path.resolve(__dirname, '../packages/core');
	const packageJsonPath = path.join(cwd, 'package.json');
	const backupPath = path.join(cwd, `package.json.backup`);

	try {
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
	}
}

function packAngular() {
	const cwd = path.resolve(__dirname, '../packages/angular/dist');

	try {
		// copy README.md
		fs.copySync(path.join(cwd, '..', 'README.md'), path.join(cwd, 'README.md'));

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
