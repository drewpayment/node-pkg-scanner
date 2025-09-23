import { Config } from './types';
export declare class ConfigManager {
    private config;
    constructor(configPath?: string);
    getConfig(): Config;
    private loadConfig;
    private validateConfig;
}
//# sourceMappingURL=config.d.ts.map