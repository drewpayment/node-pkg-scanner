#!/usr/bin/env node
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
const core = __importStar(require("@actions/core"));
const detector_1 = require("./detector");
async function main() {
    try {
        const configPath = core.getInput('config-path') || undefined;
        const githubToken = core.getInput('github-token') || undefined;
        console.log('🛡️  Node Package Scanner - GitHub Action');
        console.log('   Scanning for compromised packages from supply chain attack');
        const detector = new detector_1.NodePackageScanner(configPath, githubToken);
        const summary = await detector.scan();
        console.log('\n✅ Scan completed successfully');
        // Exit with error code if compromised packages found and fail-on-error is true
        const failOnError = core.getInput('fail-on-error') !== 'false';
        if (failOnError && summary.compromisedPackages.length > 0) {
            process.exit(1);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('❌ Scan failed:', message);
        core.setFailed(message);
        process.exit(1);
    }
}
// Only run if this file is executed directly (not imported)
if (require.main === module) {
    main();
}
