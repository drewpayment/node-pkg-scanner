import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { Config, DEFAULT_CONFIG } from './types';

export class ConfigManager {
  private config: Config;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
  }

  getConfig(): Config {
    return this.config;
  }

  private loadConfig(configPath?: string): Config {
    const defaultPath = '.config.yml';
    const finalPath = configPath || defaultPath;

    if (!fs.existsSync(finalPath)) {
      console.log(`No config file found at ${finalPath}, using defaults`);
      return { ...DEFAULT_CONFIG };
    }

    try {
      const configContent = fs.readFileSync(finalPath, 'utf8');
      const userConfig = YAML.parse(configContent) as Partial<Config>;
      
      // Merge with defaults
      const mergedConfig: Config = {
        ...DEFAULT_CONFIG,
        ...userConfig,
        additionalPackages: userConfig.additionalPackages || DEFAULT_CONFIG.additionalPackages,
        excludeDirectories: userConfig.excludeDirectories || DEFAULT_CONFIG.excludeDirectories
      };

      this.validateConfig(mergedConfig);
      return mergedConfig;
    } catch (error) {
      console.error(`Error loading config from ${finalPath}:`, error);
      console.log('Using default configuration');
      return { ...DEFAULT_CONFIG };
    }
  }

  private validateConfig(config: Config): void {
    if (!['error', 'warning', 'info'].includes(config.severityLevel)) {
      throw new Error(`Invalid severity level: ${config.severityLevel}`);
    }

    try {
      new URL(config.compromisedPackagesUrl);
    } catch {
      throw new Error(`Invalid URL for compromised packages: ${config.compromisedPackagesUrl}`);
    }

    if (config.cacheTimeout < 0) {
      throw new Error('Cache timeout must be non-negative');
    }
  }
}