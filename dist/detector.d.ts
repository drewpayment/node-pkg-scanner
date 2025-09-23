import { ScanSummary } from './types';
export declare class NodePackageScanner {
    private config;
    private scanner;
    private fetcher;
    private github;
    constructor(configPath?: string, githubToken?: string);
    scan(rootDirectory?: string): Promise<ScanSummary>;
    private reportResults;
    private countPackageFiles;
}
//# sourceMappingURL=detector.d.ts.map