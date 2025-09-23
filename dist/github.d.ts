import { ScanSummary } from './types';
export declare class GitHubIntegration {
    private octokit;
    private context;
    private hasValidToken;
    constructor(token?: string);
    postPRComment(summary: ScanSummary): Promise<void>;
    private generateComment;
    setOutputs(summary: ScanSummary): void;
}
//# sourceMappingURL=github.d.ts.map