#!/usr/bin/env node

import * as core from '@actions/core';
import { NodePackageScanner } from './detector';

async function main(): Promise<void> {
  try {
    const configPath = core.getInput('config-path') || undefined;
    const githubToken = core.getInput('github-token') || undefined;
    
    console.log('🛡️  Node Package Scanner - GitHub Action');
    console.log('   Scanning for compromised packages from supply chain attack');
    
    const detector = new NodePackageScanner(configPath, githubToken);
    const summary = await detector.scan();
    
    console.log('\n✅ Scan completed successfully');
    
    // Exit with error code if compromised packages found and fail-on-error is true
    const failOnError = core.getInput('fail-on-error') !== 'false';
    if (failOnError && summary.compromisedPackages.length > 0) {
      process.exit(1);
    }
    
  } catch (error) {
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