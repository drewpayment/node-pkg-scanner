export interface Config {
  severityLevel: 'error' | 'warning' | 'info';
  compromisedPackagesUrl: string;
  rootDirectory?: string;
  additionalPackages: string[];
  excludeDirectories: string[];
  cacheTimeout: number; // minutes
}

export interface CompromisedPackage {
  name: string;
  source: 'remote' | 'cached' | 'additional';
}

export interface ScanResult {
  file: string;
  packageManager: PackageManager;
  compromisedPackages: CompromisedPackage[];
}

export interface ScanSummary {
  totalFiles: number;
  compromisedFiles: number;
  compromisedPackages: CompromisedPackage[];
  usingCachedList: boolean;
  scanResults: ScanResult[];
}

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export interface PackageManagerFile {
  pattern: string;
  type: PackageManager;
  parser: (content: string) => string[];
}

export const DEFAULT_CONFIG: Config = {
  severityLevel: 'error',
  compromisedPackagesUrl: 'https://raw.githubusercontent.com/Cobenian/shai-hulud-detect/main/compromised-packages.txt',
  additionalPackages: [],
  excludeDirectories: ['node_modules', '.git', 'dist', 'build'],
  cacheTimeout: 60 // 1 hour
};