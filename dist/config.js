"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const fs = __importStar(require("fs"));
const YAML = __importStar(require("yaml"));
const types_1 = require("./types");
class ConfigManager {
    constructor(configPath) {
        this.config = this.loadConfig(configPath);
    }
    getConfig() {
        return this.config;
    }
    loadConfig(configPath) {
        const defaultPath = '.shai-hulud.yml';
        const finalPath = configPath || defaultPath;
        if (!fs.existsSync(finalPath)) {
            console.log(`No config file found at ${finalPath}, using defaults`);
            return { ...types_1.DEFAULT_CONFIG };
        }
        try {
            const configContent = fs.readFileSync(finalPath, 'utf8');
            const userConfig = YAML.parse(configContent);
            // Merge with defaults
            const mergedConfig = {
                ...types_1.DEFAULT_CONFIG,
                ...userConfig,
                additionalPackages: userConfig.additionalPackages || types_1.DEFAULT_CONFIG.additionalPackages,
                excludeDirectories: userConfig.excludeDirectories || types_1.DEFAULT_CONFIG.excludeDirectories
            };
            this.validateConfig(mergedConfig);
            return mergedConfig;
        }
        catch (error) {
            console.error(`Error loading config from ${finalPath}:`, error);
            console.log('Using default configuration');
            return { ...types_1.DEFAULT_CONFIG };
        }
    }
    validateConfig(config) {
        if (!['error', 'warning', 'info'].includes(config.severityLevel)) {
            throw new Error(`Invalid severity level: ${config.severityLevel}`);
        }
        try {
            new URL(config.compromisedPackagesUrl);
        }
        catch {
            throw new Error(`Invalid URL for compromised packages: ${config.compromisedPackagesUrl}`);
        }
        if (config.cacheTimeout < 0) {
            throw new Error('Cache timeout must be non-negative');
        }
    }
}
exports.ConfigManager = ConfigManager;
