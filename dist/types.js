"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    severityLevel: 'error',
    compromisedPackagesUrl: 'https://raw.githubusercontent.com/Cobenian/shai-hulud-detect/main/compromised-packages.txt',
    additionalPackages: [],
    excludeDirectories: ['node_modules', '.git', 'dist', 'build'],
    cacheTimeout: 60 // 1 hour
};
//# sourceMappingURL=types.js.map