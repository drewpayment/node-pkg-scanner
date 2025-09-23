export interface Config {
    severityLevel: 'error' | 'warning' | 'info';
    compromisedPackagesUrl: string;
    rootDirectory?: string;
    additionalPackages: string[];
    excludeDirectories: string[];
    cacheTimeout: number;
}
export interface CompromisedPackage {
    name: string;
    version?: string;
    source: 'remote' | 'cached' | 'additional';
}
export interface InstalledPackage {
    name: string;
    version: string;
    source: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies' | 'package-lock.json' | 'yarn.lock' | 'pnpm-lock.yaml';
}
export interface ScanResult {
    file: string;
    packageManager: PackageManager;
    compromisedPackages: CompromisedPackage[];
    installedPackages: InstalledPackage[];
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
    parser: (content: string) => InstalledPackage[];
}
export declare const DEFAULT_CONFIG: Config;
//# sourceMappingURL=types.d.ts.map