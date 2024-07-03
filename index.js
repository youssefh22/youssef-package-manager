#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const tar = require('tar');

const PACKAGE_JSON_PATH = path.resolve(process.cwd(), 'package.json');
const NODE_MODULES_PATH = path.resolve(process.cwd(), 'node_modules');

/**
 * Adds a package to the dependencies in package.json
 * @param {string} packageName - The name of the package to add, e.g., "is-thirteen@1.0.0"
 */
async function addPackage(packageName) {
    const [name, version] = packageName.split('@');
    const packageVersion = version || 'latest';

    // Read package.json
    let packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

    // Add package to dependencies
    if (!packageJson.dependencies) {
        packageJson.dependencies = {};
    }
    packageJson.dependencies[name] = packageVersion;

    // Write updated package.json
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));
    console.log(`Added ${name}@${packageVersion} to dependencies.`);
}

/**
 * Installs all packages listed in the dependencies of package.json
 */
async function installPackages() {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    const dependencies = packageJson.dependencies || {};

    for (const [name, version] of Object.entries(dependencies)) {
        await installPackage(name, version);
    }
    console.log('All packages installed.');
}

/**
 * Installs a specific package and its dependencies
 * @param {string} name - The name of the package
 * @param {string} version - The version of the package
 */
async function installPackage(name, version) {
    const registryUrl = `https://registry.npmjs.org/${name}`;
    const packageInfo = await axios.get(registryUrl);

    const distTags = packageInfo.data['dist-tags'];
    const packageVersion = version === 'latest' ? distTags.latest : version;
    const versionInfo = packageInfo.data.versions[packageVersion];

    // Check if the specified version exists
    if (!versionInfo) {
        console.error(`Version ${packageVersion} of package ${name} not found.`);
        return;
    }

    const tarballUrl = versionInfo.dist.tarball;

    const packagePath = path.join(NODE_MODULES_PATH, name);
    if (!fs.existsSync(NODE_MODULES_PATH)) {
        fs.mkdirSync(NODE_MODULES_PATH);
    }
    if (!fs.existsSync(packagePath)) {
        fs.mkdirSync(packagePath);
    }

    // Download and extract tarball
    const response = await axios.get(tarballUrl, { responseType: 'stream' });
    const extractStream = response.data.pipe(tar.x({ C: packagePath, strip: 1 }));
    await new Promise((resolve, reject) => {
        extractStream.on('finish', resolve);
        extractStream.on('error', reject);
    });

    // Install dependencies of the current package
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = packageJson.dependencies || {};
        for (const [depName, depVersion] of Object.entries(dependencies)) {
            await installPackage(depName, depVersion);
        }
    }

    console.log(`Installed ${name}@${packageVersion}`);
}

/**
 * Deletes a package from the dependencies in package.json and node_modules
 * @param {string} packageName - The name of the package to delete
 */
function deletePackage(packageName) {
    // Read package.json
    let packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

    if (packageJson.dependencies && packageJson.dependencies[packageName]) {
        // Remove package from dependencies
        delete packageJson.dependencies[packageName];

        // Write updated package.json
        fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));
        console.log(`Removed ${packageName} from dependencies.`);

        // Remove package from node_modules
        const packagePath = path.join(NODE_MODULES_PATH, packageName);
        if (fs.existsSync(packagePath)) {
            fs.rmSync(packagePath, { recursive: true, force: true });
            console.log(`Deleted ${packageName} from node_modules.`);
        } else {
            console.log(`${packageName} is not found in node_modules.`);
        }
    } else {
        console.log(`${packageName} is not listed as a dependency.`);
    }
}

// Parse command line arguments
const [command, arg] = process.argv.slice(2);

// Execute the appropriate function based on the command
switch (command) {
    case 'add':
        addPackage(arg);
        break;
    case 'install':
        installPackages();
        break;
    case 'delete':
        deletePackage(arg);
        break;  
    default:
        console.log('Unknown command');
        break;
}
