import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLISH_DIR = path.resolve(__dirname, '../.publish');

function packPackage(cwd, { cleanPackageJson } = { cleanPackageJson: true }) {
	const packageJsonPath = path.join(cwd, 'package.json');
	const backupPath = path.join(cwd, `package.json.backup`);

	try {
		// `npm pkg delete`
		if (cleanPackageJson) {
			fs.copySync(packageJsonPath, backupPath);
			console.log(`Cleaning package.json in ${cwd}...`);
			execSync('npm pkg delete wireit scripts devDependencies', { cwd, encoding: 'utf8' });
		}

		// `npm pack`
		execSync(`npm pack --pack-destination "${PUBLISH_DIR}"`, { cwd, encoding: 'utf8' });
	} catch (err) {
		console.error(`Error packing ${cwd}:`, err);
	} finally {
		if (cleanPackageJson) {
			fs.moveSync(backupPath, packageJsonPath, { overwrite: true });
		}
	}
}

fs.removeSync(PUBLISH_DIR);
fs.ensureDirSync(PUBLISH_DIR);

packPackage(path.resolve(__dirname, '../packages/core'));
packPackage(path.resolve(__dirname, '../packages/angular/dist'), {
	cleanPackageJson: false,
});
