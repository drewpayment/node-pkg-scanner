import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { PackageManagerFile, ScanResult, CompromisedPackage, PackageManager, InstalledPackage } from './types';

export class PackageScanner {
  private packageManagerFiles: PackageManagerFile[] = [
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

  async scanDirectory(
    rootDir: string, 
    compromisedPackages: Map<string, string[]>,
    excludeDirectories: string[] = []
  ): Promise<ScanResult[]> {
    const results: ScanResult[] = [];
    
    for (const pmFile of this.packageManagerFiles) {
      const pattern = path.join(rootDir, pmFile.pattern);
      const files = await glob(pattern, {
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
        } catch (error) {
          console.warn(`Warning: Could not parse ${file}: ${error}`);
        }
      }
    }

    return results;
  }

  private findCompromisedPackages(
    packages: InstalledPackage[], 
    compromisedMap: Map<string, string[]>
  ): CompromisedPackage[] {
    const compromised: CompromisedPackage[] = [];
    
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
        } else {
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

  private parsePackageJson(content: string): InstalledPackage[] {
    try {
      const pkg = JSON.parse(content);
      const packages: InstalledPackage[] = [];
      
      if (pkg.dependencies) {
        for (const [name, version] of Object.entries(pkg.dependencies)) {
          packages.push({
            name,
            version: version as string,
            source: 'dependencies'
          });
        }
      }
      if (pkg.devDependencies) {
        for (const [name, version] of Object.entries(pkg.devDependencies)) {
          packages.push({
            name,
            version: version as string,
            source: 'devDependencies'
          });
        }
      }
      if (pkg.peerDependencies) {
        for (const [name, version] of Object.entries(pkg.peerDependencies)) {
          packages.push({
            name,
            version: version as string,
            source: 'peerDependencies'
          });
        }
      }
      if (pkg.optionalDependencies) {
        for (const [name, version] of Object.entries(pkg.optionalDependencies)) {
          packages.push({
            name,
            version: version as string,
            source: 'optionalDependencies'
          });
        }
      }
      
      return packages;
    } catch {
      return [];
    }
  }

  private parsePackageLockJson(content: string): InstalledPackage[] {
    try {
      const lockFile = JSON.parse(content);
      const packages: InstalledPackage[] = [];
      const packageNames = new Set<string>();
      
      // Handle npm lockfile v2/v3 format first (preferred)
      if (lockFile.packages) {
        for (const [packagePath, info] of Object.entries(lockFile.packages)) {
          const packageInfo = info as any;
          if (packagePath && packagePath !== '' && !packagePath.startsWith('node_modules/')) {
            // Root package - skip
            continue;
          } else if (packagePath.startsWith('node_modules/')) {
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
          const packageInfo = info as any;
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
    } catch {
      return [];
    }
  }

  private parseYarnLock(content: string): InstalledPackage[] {
    const packages: InstalledPackage[] = [];
    const lines = content.split('\n');
    let currentPackage: string | null = null;
    let currentVersion: string | null = null;
    
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

  private parsePnpmLock(content: string): InstalledPackage[] {
    const packages: InstalledPackage[] = [];
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
      } else if (inDependencies && !line.startsWith('  ')) {
        inDependencies = false;
      }
    }
    
    return packages;
  }
}