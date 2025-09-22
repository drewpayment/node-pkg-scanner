# Local Testing Guide for Shai Hulud Detector

## 🧪 Testing Approaches

### 1. Test CLI Functionality Directly

**Setup:**
```bash
# Clone/create your project directory
mkdir shai-hulud-detector && cd shai-hulud-detector

# Copy all the source files from the artifacts
# Install dependencies
npm install

# Build the project
npm run build
```

**Test the CLI:**
```bash
# Test CLI directly
node dist/cli.js scan --help
node dist/cli.js init
node dist/cli.js scan

# Test with custom config
node dist/cli.js scan --config .shai-hulud.yml --directory ./test-project
```

### 2. Create Test Projects with Sample Package Files

Create test directories with different package manager setups:

**Test Project 1: npm with compromised packages**
```bash
mkdir test-npm && cd test-npm
```

Create `package.json`:
```json
{
  "name": "test-project",
  "dependencies": {
    "express": "^4.18.2",
    "cr0wdstrike-fix": "^1.0.0",
    "crowdstrike-update": "^2.1.0"
  }
}
```

**Test Project 2: Yarn with mixed packages**
```bash
mkdir test-yarn && cd test-yarn
```

Create `yarn.lock`:
```
cr0wdstrike-fix@^1.0.0:
  version "1.0.0"
  resolved "https://registry.npmjs.org/cr0wdstrike-fix/-/cr0wdstrike-fix-1.0.0.tgz"

express@^4.18.2:
  version "4.18.2"
  resolved "https://registry.npmjs.org/express/-/express-4.18.2.tgz"
```

**Test Project 3: Clean project (no compromised packages)**
```bash
mkdir test-clean && cd test-clean
```

Create `package.json`:
```json
{
  "name": "clean-project",
  "dependencies": {
    "lodash": "^4.17.21",
    "express": "^4.18.2"
  }
}
```

### 3. Test with GitHub Actions using `act`

Install `act` to run GitHub Actions locally:

```bash
# Install act (GitHub Actions local runner)
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows
choco install act-cli
```

**Test the GitHub Action:**
```bash
# Test with act
act -j shai-hulud-scan

# Test with specific event
act pull_request

# Test with secrets
act -s GITHUB_TOKEN=your_token_here

# Test with custom workflow
act -W .github/workflows/security-scan.yml
```

### 4. Unit Testing Individual Components

Create test files to verify each component:

**Create `test/scanner.test.js`:**
```javascript
const { PackageScanner } = require('../dist/scanner');
const fs = require('fs');

async function testScanner() {
  const scanner = new PackageScanner();
  const compromisedSet = new Set(['cr0wdstrike-fix', 'crowdstrike-update']);
  
  // Test package.json parsing
  const results = await scanner.scanDirectory('./test-npm', compromisedSet);
  console.log('Scanner results:', results);
  
  if (results.length > 0) {
    console.log('✅ Scanner correctly detected compromised packages');
  } else {
    console.log('❌ Scanner failed to detect compromised packages');
  }
}

testScanner();
```

**Create `test/fetcher.test.js`:**
```javascript
const { CompromisedPackagesFetcher } = require('../dist/fetcher');

async function testFetcher() {
  const fetcher = new CompromisedPackagesFetcher();
  
  // Test with real URL
  try {
    const result = await fetcher.fetchCompromisedPackages(
      'https://raw.githubusercontent.com/Cobenian/shai-hulud-detect/main/compromised-packages.txt',
      60,
      ['additional-test-package']
    );
    
    console.log('✅ Fetcher working:', result.packages.size, 'packages');
    console.log('Using cache:', result.usingCache);
  } catch (error) {
    console.log('❌ Fetcher failed:', error.message);
  }
}

testFetcher();
```

### 5. Test Configuration Loading

**Create `test/config.test.js`:**
```javascript
const { ConfigManager } = require('../dist/config');

function testConfig() {
  // Test with default config
  const config1 = new ConfigManager();
  console.log('Default config:', config1.getConfig());
  
  // Test with custom config file
  const config2 = new ConfigManager('.shai-hulud.yml');
  console.log('Custom config:', config2.getConfig());
}

testConfig();
```

### 6. Test End-to-End Workflow

**Create `test/e2e.test.js`:**
```javascript
const { ShaiHuludDetector } = require('../dist/detector');

async function testE2E() {
  console.log('🧪 Running end-to-end test...');
  
  const detector = new ShaiHuludDetector('.shai-hulud.yml');
  
  // Test with compromised project
  console.log('\n📦 Testing compromised project...');
  const summary1 = await detector.scan('./test-npm');
  console.log('Result:', summary1.compromisedPackages.length, 'compromised packages found');
  
  // Test with clean project
  console.log('\n📦 Testing clean project...');
  const summary2 = await detector.scan('./test-clean');
  console.log('Result:', summary2.compromisedPackages.length, 'compromised packages found');
}

testE2E();
```

### 7. Test Network Scenarios

**Test offline mode:**
```bash
# Disable internet connection or use airplane mode
# Then test if cached/fallback functionality works
node dist/cli.js scan
```

**Test with invalid URL:**
```yaml
# In .shai-hulud.yml
compromisedPackagesUrl: https://invalid-url-that-does-not-exist.com/packages.txt
```

### 8. Debug Mode Testing

**Enable debug logging:**
```bash
DEBUG=shai-hulud* node dist/cli.js scan
NODE_DEBUG=* node dist/cli.js scan
```

## 🏃‍♂️ Quick Test Script

Create `test-all.sh`:
```bash
#!/bin/bash

echo "🧪 Starting Shai Hulud Detector Tests"

# Build the project
echo "📦 Building project..."
npm run build

# Test CLI help
echo "📋 Testing CLI help..."
node dist/cli.js --help

# Initialize config
echo "⚙️ Testing config initialization..."
node dist/cli.js init --force

# Test scan on current directory
echo "🔍 Testing scan..."
node dist/cli.js scan --directory .

# Test with compromised packages
echo "🚨 Testing with compromised packages..."
mkdir -p test-compromised
echo '{"dependencies": {"cr0wdstrike-fix": "1.0.0"}}' > test-compromised/package.json
node dist/cli.js scan --directory test-compromised

echo "✅ All tests completed!"
```

Make executable and run:
```bash
chmod +x test-all.sh
./test-all.sh
```

## 🐛 Debugging Tips

**Common Issues:**
1. **TypeScript compilation errors**: Run `npm run build` and check for type errors
2. **Missing dependencies**: Ensure all imports are properly installed
3. **File not found**: Check that test files are in the correct locations
4. **Network timeouts**: Test with shorter timeout values for faster feedback

**VS Code Debugging:**
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug CLI",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/cli.js",
      "args": ["scan", "--directory", "./test-npm"],
      "console": "integratedTerminal",
      "sourceMaps": true
    }
  ]
}
```

## 📊 Validation Checklist

Before publishing, verify:

- [ ] CLI tool runs without errors
- [ ] Configuration file loads correctly  
- [ ] Detects compromised packages in test projects
- [ ] Handles network failures gracefully
- [ ] Cache functionality works
- [ ] GitHub Action runs with `act`
- [ ] Output formats are correct
- [ ] Exit codes are appropriate (0 for clean, 1 for compromised)
- [ ] Documentation matches actual behavior