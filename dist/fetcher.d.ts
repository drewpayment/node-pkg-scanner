export interface FetchResult {
    packages: Map<string, string[]>;
    usingCache: boolean;
}
export declare class CompromisedPackagesFetcher {
    private cacheDir;
    private cacheFile;
    constructor();
    fetchCompromisedPackages(url: string, cacheTimeoutMinutes: number, additionalPackages?: string[]): Promise<FetchResult>;
    private parsePackageList;
    private ensureCacheDir;
    private writeCache;
    private readCache;
    private getEmbeddedPackages;
}
//# sourceMappingURL=fetcher.d.ts.map