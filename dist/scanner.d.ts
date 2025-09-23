import { ScanResult } from './types';
export declare class PackageScanner {
    private packageManagerFiles;
    scanDirectory(rootDir: string, compromisedPackages: Map<string, string[]>, excludeDirectories?: string[]): Promise<ScanResult[]>;
    private findCompromisedPackages;
    private parsePackageJson;
    private parsePackageLockJson;
    private parseYarnLock;
    private parsePnpmLock;
}
//# sourceMappingURL=scanner.d.ts.map