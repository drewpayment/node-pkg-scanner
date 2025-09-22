import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { PackageManagerFile, ScanResult, CompromisedPackage, PackageManager } from './types';

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
    compromisedPackages: Set<string>,
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
          
          if (foundCompromised.length > 0) {
            results.push({
              file: path.relative(process.cwd(), file),
              packageManager: pmFile.type,
              compromisedPackages: foundCompromised
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
    packages: string[], 
    compromisedSet: Set<string>
  ): CompromisedPackage[] {
    return packages
      .filter(pkg => compromisedSet.has(pkg))
      .map(pkg => ({
        name: pkg,
        source: 'remote' as const // Will be updated by the caller
      }));
  }

  private parsePackageJson(content: string): string[] {
    try {
      const pkg = JSON.parse(content);
      const packages: string[] = [];
      
      if (pkg.dependencies) {
        packages.push(...Object.keys(pkg.dependencies));
      }
      if (pkg.devDependencies) {
        packages.push(...Object.keys(pkg.devDependencies));
      }
      if (pkg.peerDependencies) {
        packages.push(...Object.keys(pkg.peerDependencies));
      }
      if (pkg.optionalDependencies) {
        packages.push(...Object.keys(pkg.optionalDependencies));
      }
      
      return packages;
    } catch {
      return [];
    }
  }

  private parsePackageLockJson(content: string): string[] {
    try {
      const lockFile = JSON.parse(content);
      const packages: string[] = [];
      
      // Handle npm lockfile v1 and v2/v3 formats
      if (lockFile.dependencies) {
        packages.push(...Object.keys(lockFile.dependencies));
      }
      if (lockFile.packages) {
        Object.keys(lockFile.packages).forEach(pkg => {
          if (pkg && pkg !== '' && !pkg.startsWith('node_modules/')) {
            packages.push(pkg);
          } else if (pkg.startsWith('node_modules/')) {
            packages.push(pkg.replace('node_modules/', ''));
          }
        });
      }
      
      return packages;
    } catch {
      return [];
    }
  }

  private parseYarnLock(content: string): string[] {
    const packages = new Set<string>();
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^"?([^@"]+)@/);
      if (match) {
        packages.add(match[1]);
      }
    }
    
    return Array.from(packages);
  }

  private parsePnpmLock(content: string): string[] {
    const packages = new Set<string>();
    const lines = content.split('\n');
    let inDependencies = false;
    
    for (const line of lines) {
      if (line.trim() === 'dependencies:' || line.trim() === 'devDependencies:') {
        inDependencies = true;
        continue;
      }
      
      if (inDependencies && line.startsWith('  ') && line.includes(':')) {
        const packageName = line.trim().split(':')[0];
        if (packageName && !packageName.startsWith('/')) {
          packages.add(packageName);
        }
      } else if (inDependencies && !line.startsWith('  ')) {
        inDependencies = false;
      }
    }
    
    return Array.from(packages);
  }
}