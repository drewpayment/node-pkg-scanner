"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageScanner = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
class PackageScanner {
    constructor() {
        this.packageManagerFiles = [
            {
                pattern: '**/package.json',
                type: 'npm',
                parser: this.parsePackageJson.bind(this)
            },
            {
                pattern: '**/package-lock.json',
                type: 'npm',
                parser: this.parsePackageLockJson.bind(this)
            },
            {
                pattern: '**/yarn.lock',
                type: 'yarn',
                parser: this.parseYarnLock.bind(this)
            },
            {
                pattern: '**/pnpm-lock.yaml',
                type: 'pnpm',
                parser: this.parsePnpmLock.bind(this)
            }
        ];
    }
    async scanDirectory(rootDir, compromisedPackages, excludeDirectories = []) {
        const results = [];
        for (const pmFile of this.packageManagerFiles) {
            const pattern = path.join(rootDir, pmFile.pattern);
            const files = await (0, glob_1.glob)(pattern, {
                ignore: excludeDirectories.map(dir => `**/${dir}/**`)
            });
            for (const file of files) {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    const packages = pmFile.parser(content);
                    const foundCompromised = this.findCompromisedPackages(packages, compromisedPackages);
                    if (foundCompromised.length > 0 || packages.length > 0) {
                        results.push({
                            file: path.relative(process.cwd(), file),
                            packageManager: pmFile.type,
                            compromisedPackages: foundCompromised,
                            installedPackages: packages
                        });
                    }
                }
                catch (error) {
                    console.warn(`Warning: Could not parse ${file}: ${error}`);
                }
            }
        }
        return results;
    }
    findCompromisedPackages(packages, compromisedMap) {
        const compromised = [];
        for (const pkg of packages) {
            const compromisedVersions = compromisedMap.get(pkg.name);
            if (compromisedVersions) {
                // If no specific versions are listed, consider any version compromised
                if (compromisedVersions.length === 0) {
                    compromised.push({
                        name: pkg.name,
                        version: pkg.version,
                        source: 'remote' // Will be updated by the caller
                    });
                }
                else {
                    // Check if the installed version matches any compromised version
                    if (compromisedVersions.includes(pkg.version)) {
                        compromised.push({
                            name: pkg.name,
                            version: pkg.version,
                            source: 'remote' // Will be updated by the caller
                        });
                    }
                }
            }
        }
        return compromised;
    }
    parsePackageJson(content) {
        try {
            const pkg = JSON.parse(content);
            const packages = [];
            if (pkg.dependencies) {
                for (const [name, version] of Object.entries(pkg.dependencies)) {
                    packages.push({
                        name,
                        version: version,
                        source: 'dependencies'
                    });
                }
            }
            if (pkg.devDependencies) {
                for (const [name, version] of Object.entries(pkg.devDependencies)) {
                    packages.push({
                        name,
                        version: version,
                        source: 'devDependencies'
                    });
                }
            }
            if (pkg.peerDependencies) {
                for (const [name, version] of Object.entries(pkg.peerDependencies)) {
                    packages.push({
                        name,
                        version: version,
                        source: 'peerDependencies'
                    });
                }
            }
            if (pkg.optionalDependencies) {
                for (const [name, version] of Object.entries(pkg.optionalDependencies)) {
                    packages.push({
                        name,
                        version: version,
                        source: 'optionalDependencies'
                    });
                }
            }
            return packages;
        }
        catch {
            return [];
        }
    }
    parsePackageLockJson(content) {
        try {
            const lockFile = JSON.parse(content);
            const packages = [];
            const packageNames = new Set();
            // Handle npm lockfile v2/v3 format first (preferred)
            if (lockFile.packages) {
                for (const [packagePath, info] of Object.entries(lockFile.packages)) {
                    const packageInfo = info;
                    if (packagePath && packagePath !== '' && !packagePath.startsWith('node_modules/')) {
                        // Root package - skip
                        continue;
                    }
                    else if (packagePath.startsWith('node_modules/')) {
                        const name = packagePath.replace('node_modules/', '');
                        if (!packageNames.has(name)) {
                            packageNames.add(name);
                            packages.push({
                                name,
                                version: packageInfo.version || 'unknown',
                                source: 'package-lock.json'
                            });
                        }
                    }
                }
            }
            // Handle npm lockfile v1 format (only if v2/v3 didn't find packages)
            if (packages.length === 0 && lockFile.dependencies) {
                for (const [name, info] of Object.entries(lockFile.dependencies)) {
                    const packageInfo = info;
                    if (!packageNames.has(name)) {
                        packageNames.add(name);
                        packages.push({
                            name,
                            version: packageInfo.version || 'unknown',
                            source: 'package-lock.json'
                        });
                    }
                }
            }
            return packages;
        }
        catch {
            return [];
        }
    }
    parseYarnLock(content) {
        const packages = [];
        const lines = content.split('\n');
        let currentPackage = null;
        let currentVersion = null;
        for (const line of lines) {
            // Match package declaration line like: "package@version:", "@scope/package@version:"
            const packageMatch = line.match(/^"?([^@"]+)@([^"]+)"?:/);
            if (packageMatch) {
                currentPackage = packageMatch[1];
                // Don't use the version from the key, as it might be a range
                currentVersion = null;
                continue;
            }
            // Match version line like: "  version "1.2.3""
            const versionMatch = line.match(/^\s+version\s+"([^"]+)"/);
            if (versionMatch && currentPackage) {
                currentVersion = versionMatch[1];
                packages.push({
                    name: currentPackage,
                    version: currentVersion,
                    source: 'yarn.lock'
                });
                currentPackage = null;
                currentVersion = null;
            }
        }
        return packages;
    }
    parsePnpmLock(content) {
        const packages = [];
        const lines = content.split('\n');
        let inDependencies = false;
        for (const line of lines) {
            if (line.trim() === 'dependencies:' || line.trim() === 'devDependencies:') {
                inDependencies = true;
                continue;
            }
            if (inDependencies && line.startsWith('  ') && line.includes(':')) {
                const parts = line.trim().split(':');
                const packageName = parts[0].trim();
                const versionInfo = parts[1]?.trim();
                if (packageName && !packageName.startsWith('/') && versionInfo) {
                    // Extract version from pnpm format like "1.2.3" or "registry.npmjs.org/package/1.2.3"
                    let version = versionInfo;
                    const versionMatch = versionInfo.match(/(\d+\.\d+\.\d+(?:[-.]\w+)*)/);
                    if (versionMatch) {
                        version = versionMatch[1];
                    }
                    packages.push({
                        name: packageName,
                        version: version,
                        source: 'pnpm-lock.yaml'
                    });
                }
            }
            else if (inDependencies && !line.startsWith('  ')) {
                inDependencies = false;
            }
        }
        return packages;
    }
}
exports.PackageScanner = PackageScanner;
//# sourceMappingURL=scanner.js.map