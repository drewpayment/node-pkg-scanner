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
exports.NodePackageScanner = void 0;
const config_1 = require("./config");
const scanner_1 = require("./scanner");
const fetcher_1 = require("./fetcher");
const github_1 = require("./github");
class NodePackageScanner {
    constructor(configPath, githubToken) {
        this.config = new config_1.ConfigManager(configPath);
        this.scanner = new scanner_1.PackageScanner();
        this.fetcher = new fetcher_1.CompromisedPackagesFetcher();
        this.github = new github_1.GitHubIntegration(githubToken);
    }
    async scan(rootDirectory) {
        const config = this.config.getConfig();
        const scanDir = rootDirectory || config.rootDirectory || process.cwd();
        console.log(`🔍 Starting compromised package detection scan in: ${scanDir}`);
        console.log(`📋 Severity Level: ${config.severityLevel}`);
        // Fetch compromised packages list
        const fetchResult = await this.fetcher.fetchCompromisedPackages(config.compromisedPackagesUrl, config.cacheTimeout, config.additionalPackages);
        console.log(`📦 Scanning for compromised packages...`);
        // Scan for package manager files
        const scanResults = await this.scanner.scanDirectory(scanDir, fetchResult.packages, config.excludeDirectories);
        // Collect all unique compromised packages found
        const allCompromisedPackages = [];
        const packageKeys = new Set();
        for (const result of scanResults) {
            for (const pkg of result.compromisedPackages) {
                // Create a unique key combining name and version for deduplication
                const packageKey = `${pkg.name}@${pkg.version}`;
                if (!packageKeys.has(packageKey)) {
                    packageKeys.add(packageKey);
                    allCompromisedPackages.push({
                        name: pkg.name,
                        version: pkg.version,
                        source: config.additionalPackages.includes(pkg.name) ? 'additional' :
                            fetchResult.usingCache ? 'cached' : 'remote'
                    });
                }
            }
        }
        const summary = {
            totalFiles: await this.countPackageFiles(scanDir, config.excludeDirectories),
            compromisedFiles: scanResults.filter(result => result.compromisedPackages.length > 0).length,
            compromisedPackages: allCompromisedPackages,
            usingCachedList: fetchResult.usingCache,
            scanResults
        };
        await this.reportResults(summary);
        return summary;
    }
    async reportResults(summary) {
        const { compromisedPackages, totalFiles, compromisedFiles, usingCachedList } = summary;
        console.log('\n📊 Scan Results:');
        console.log(`   Total package files scanned: ${totalFiles}`);
        console.log(`   Files with compromised packages: ${compromisedFiles}`);
        console.log(`   Unique compromised packages found: ${compromisedPackages.length}`);
        if (usingCachedList) {
            console.log('\n⚠️  Warning: Used cached/fallback compromised packages list');
        }
        if (compromisedPackages.length > 0) {
            console.log('\n🚨 Compromised Packages Detected:');
            // Only show files that actually contain compromised packages
            for (const result of summary.scanResults) {
                if (result.compromisedPackages.length > 0) {
                    console.log(`\n   ${result.file} (${result.packageManager}):`);
                    for (const pkg of result.compromisedPackages) {
                        const versionInfo = pkg.version ? `@${pkg.version}` : '';
                        console.log(`     - ${pkg.name}${versionInfo} [${pkg.source}]`);
                    }
                }
            }
            console.log('\n⚠️  These packages are known to be compromised in the Shai Hulud supply chain attack!');
            console.log('   Please remove them immediately and review your dependency security.');
            console.log('   Reference: https://socket.dev/blog/ongoing-supply-chain-attack-targets-crowdstrike-npm-packages');
        }
        else {
            console.log('\n✅ No compromised packages detected');
        }
        // Post to GitHub if running in Actions context
        try {
            await this.github.postPRComment(summary);
            this.github.setOutputs(summary);
        }
        catch (error) {
            console.log('Note: GitHub integration not available (not running in GitHub Actions)');
        }
    }
    async countPackageFiles(rootDir, excludeDirectories) {
        const { glob } = await Promise.resolve().then(() => __importStar(require('glob')));
        const patterns = [
            '**/package.json',
            '**/package-lock.json',
            '**/yarn.lock',
            '**/pnpm-lock.yaml'
        ];
        let totalCount = 0;
        for (const pattern of patterns) {
            const files = await glob(pattern, {
                cwd: rootDir,
                ignore: excludeDirectories.map(dir => `**/${dir}/**`)
            });
            totalCount += files.length;
        }
        return totalCount;
    }
}
exports.NodePackageScanner = NodePackageScanner;
