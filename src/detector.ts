import { ConfigManager } from './config';
import { PackageScanner } from './scanner';
import { CompromisedPackagesFetcher } from './fetcher';
import { GitHubIntegration } from './github';
import { ScanSummary, CompromisedPackage } from './types';

export class NodePackageScanner {
  private config;
  private scanner;
  private fetcher;
  private github;

  constructor(configPath?: string, githubToken?: string) {
    this.config = new ConfigManager(configPath);
    this.scanner = new PackageScanner();
    this.fetcher = new CompromisedPackagesFetcher();
    this.github = new GitHubIntegration(githubToken);
  }

  async scan(rootDirectory?: string): Promise<ScanSummary> {
    const config = this.config.getConfig();
    const scanDir = rootDirectory || config.rootDirectory || process.cwd();
    
    console.log(`🔍 Starting compromised package detection scan in: ${scanDir}`);
    console.log(`📋 Severity Level: ${config.severityLevel}`);
    
    // Fetch compromised packages list
    const fetchResult = await this.fetcher.fetchCompromisedPackages(
      config.compromisedPackagesUrl,
      config.cacheTimeout,
      config.additionalPackages
    );

    console.log(`📦 Scanning for compromised packages...`);
    
    // Scan for package manager files
    const scanResults = await this.scanner.scanDirectory(
      scanDir,
      fetchResult.packages,
      config.excludeDirectories
    );

    // Collect all unique compromised packages found
    const allCompromisedPackages: CompromisedPackage[] = [];
    const packageNames = new Set<string>();
    
    for (const result of scanResults) {
      for (const pkg of result.compromisedPackages) {
        if (!packageNames.has(pkg.name)) {
          packageNames.add(pkg.name);
          allCompromisedPackages.push({
            name: pkg.name,
            source: config.additionalPackages.includes(pkg.name) ? 'additional' : 
                   fetchResult.usingCache ? 'cached' : 'remote'
          });
        }
      }
    }

    const summary: ScanSummary = {
      totalFiles: await this.countPackageFiles(scanDir, config.excludeDirectories),
      compromisedFiles: scanResults.length,
      compromisedPackages: allCompromisedPackages,
      usingCachedList: fetchResult.usingCache,
      scanResults
    };

    await this.reportResults(summary);
    return summary;
  }

  private async reportResults(summary: ScanSummary): Promise<void> {
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
      
      for (const result of summary.scanResults) {
        console.log(`\n   ${result.file} (${result.packageManager}):`);
        for (const pkg of result.compromisedPackages) {
          console.log(`     - ${pkg.name} [${pkg.source}]`);
        }
      }
      
      console.log('\n⚠️  These packages are known to be compromised in the Shai Hulud supply chain attack!');
      console.log('   Please remove them immediately and review your dependency security.');
      console.log('   Reference: https://socket.dev/blog/ongoing-supply-chain-attack-targets-crowdstrike-npm-packages');
    } else {
      console.log('\n✅ No compromised packages detected');
    }

    // Post to GitHub if running in Actions context
    try {
      await this.github.postPRComment(summary);
      this.github.setOutputs(summary);
    } catch (error) {
      console.log('Note: GitHub integration not available (not running in GitHub Actions)');
    }
  }

  private async countPackageFiles(rootDir: string, excludeDirectories: string[]): Promise<number> {
    const { glob } = await import('glob');
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