import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import fetch from 'node-fetch';

export interface FetchResult {
  packages: Set<string>;
  usingCache: boolean;
}

export class CompromisedPackagesFetcher {
  private cacheDir: string;
  private cacheFile: string;

  constructor() {
    this.cacheDir = path.join(os.tmpdir(), 'shai-hulud-detector');
    this.cacheFile = path.join(this.cacheDir, 'compromised-packages.txt');
    this.ensureCacheDir();
  }

  async fetchCompromisedPackages(
    url: string, 
    cacheTimeoutMinutes: number,
    additionalPackages: string[] = []
  ): Promise<FetchResult> {
    let packages: Set<string>;
    let usingCache = false;

    try {
      // Try to fetch from remote first
      console.log(`Fetching compromised packages from: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const content = await response.text();
      packages = this.parsePackageList(content);
      
      // Cache the successful fetch
      this.writeCache(content);
      console.log(`✓ Successfully fetched ${packages.size} compromised packages from remote`);
      
    } catch (error) {
      console.warn(`⚠️  Failed to fetch from remote: ${error}`);
      console.log('Attempting to use cached version...');
      
      const cachedContent = this.readCache(cacheTimeoutMinutes);
      if (cachedContent) {
        packages = this.parsePackageList(cachedContent);
        usingCache = true;
        console.log(`✓ Using cached list with ${packages.size} compromised packages`);
      } else {
        console.error('❌ No valid cache available');
        // Fall back to embedded list as last resort
        packages = this.getEmbeddedPackages();
        usingCache = true;
        console.log(`✓ Using embedded fallback list with ${packages.size} compromised packages`);
      }
    }

    // Add additional packages from config
    additionalPackages.forEach(pkg => packages.add(pkg.trim()));
    
    if (additionalPackages.length > 0) {
      console.log(`✓ Added ${additionalPackages.length} additional packages from config`);
    }

    return { packages, usingCache };
  }

  private parsePackageList(content: string): Set<string> {
    return new Set(
      content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
    );
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private writeCache(content: string): void {
    try {
      const cacheData = {
        timestamp: Date.now(),
        content
      };
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData));
    } catch (error) {
      console.warn(`Warning: Could not write cache: ${error}`);
    }
  }

  private readCache(timeoutMinutes: number): string | null {
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return null;
      }

      const cacheContent = fs.readFileSync(this.cacheFile, 'utf8');
      const cacheData = JSON.parse(cacheContent);
      
      const ageMinutes = (Date.now() - cacheData.timestamp) / (1000 * 60);
      
      if (ageMinutes > timeoutMinutes) {
        console.log(`Cache is ${Math.round(ageMinutes)} minutes old (timeout: ${timeoutMinutes})`);
        return null;
      }
      
      return cacheData.content;
    } catch (error) {
      console.warn(`Warning: Could not read cache: ${error}`);
      return null;
    }
  }

  private getEmbeddedPackages(): Set<string> {
    // Embedded fallback list based on known Shai Hulud packages
    const embeddedPackages = [
      'cr0wdstrike-fix',
      'crowdstrike-update',
      'crowdstrike-emergency-fix',
      'crowdstrike-fix-update',
      'crowdstrik-update',
      'croudstrike-fix',
      'crowdstrike-falcon-fix',
      'crowdstrikefix'
    ];
    
    return new Set(embeddedPackages);
  }
}