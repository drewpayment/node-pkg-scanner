# Node Package Scanner

🛡️ **Enterprise-grade GitHub Action and CLI tool to detect compromised packages from the Shai Hulud supply chain attack**

This tool scans your JavaScript projects for compromised packages identified in the ongoing Shai Hulud supply chain attack targeting npm packages that impersonate CrowdStrike fixes.

## Features

- ✅ **Dual Purpose**: Works as both GitHub Action and standalone CLI tool
- 🔍 **Multi-Package Manager Support**: Scans npm, Yarn, and pnpm lock files
- 💾 **Smart Caching**: Falls back to cached lists when remote fetch fails
- ⚙️ **Configurable**: YAML configuration with sensible defaults
- 🚨 **GitHub Integration**: Automatically comments on PRs and fails CI checks
- 🏢 **Enterprise Ready**: Suitable for air-gapped environments

## Quick Start

### GitHub Action

Add to your workflow (`.github/workflows/security-scan.yml`):

```yaml
name: Security Scan
on: [push, pull_request]

jobs:
  shai-hulud-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: drewpayment/node-pkg-scanner@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### CLI Installation
```bash
npm install -g node-pkg-scanner
```bash
npm install -g node-pkg-scanner

```bash
npm install -g node-pkg-scanner
node-pkg-scanner scan
```

## Configuration

```yaml
# Path to the configuration file
configPath: .config.yml
Create a `.config.yml` file in your repository root:

```yaml
# Severity level for compromised packages (error, warning, info)
severityLevel: error

# URL to fetch the compromised packages list from
compromisedPackagesUrl: https://raw.githubusercontent.com/Cobenian/shai-hulud-detect/main/compromised-packages.txt

# Root directory to scan (optional - defaults to current directory)
# rootDirectory: ./src

# Additional packages to check for (beyond the remote list)
additionalPackages: []
  # - suspicious-package-name

# Directories to exclude from scanning
excludeDirectories:
  - node_modules
  - .git
  - dist
  - build

# Cache timeout in minutes
cacheTimeout: 60
```

## GitHub Action Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `config-path` | Path to configuration file | `.config.yml` |
| `fail-on-error` | Fail the action when compromised packages found | `true` |
| `github-token` | GitHub token for API access | `${{ github.token }}` |

## GitHub Action Outputs

| Output | Description |
|--------|-------------|
| `compromised-found` | Whether any compromised packages were found (true/false) |
| `compromised-count` | Number of compromised packages found |
| `compromised-packages` | JSON array of compromised packages found |

## CLI Usage

### Scan Command

```bash
# Basic scan
node-pkg-scanner scan

# Scan with custom config
node-pkg-scanner scan --config ./custom-config.yml

# Scan specific directory
node-pkg-scanner scan --directory ./my-project

# Scan without failing on detection (for reporting only)
node-pkg-scanner scan --no-fail

# Quiet mode (minimal output)
node-pkg-scanner scan --quiet
```

### Initialize Configuration

```bash
# Create default config file
node-pkg-scanner init

# Overwrite existing config
node-pkg-scanner init --force
```

## Advanced Usage

### Custom Package Lists

You can provide your own compromised packages list by setting a custom URL in the configuration:

```yaml
compromisedPackagesUrl: https://your-domain.com/compromised-packages.txt
```

The file should be a simple text file with one package name per line:

```
malicious-package-1
suspicious-package-2
fake-crowdstrike-fix
```

### Branch Protection Rules

To block PRs automatically, configure branch protection rules in your GitHub repository:
```yaml

1. Go to Settings → Branches
2. Add or edit a branch protection rule
3. Check "Require status checks to pass before merging"
4. Add "Node Package Scanner" to required status checks

### Azure DevOps / Other CI Platforms

Use the CLI tool in any CI/CD platform:

```yaml
# Azure DevOps example
- script: |
    npm install -g node-pkg-scanner
    node-pkg-scanner scan
  displayName: 'Scan for compromised packages'
```

```yaml
# GitLab CI example
security-scan:
  image: node:18
  script:
    - npm install -g node-pkg-scanner
    - node-pkg-scanner scan
```

## Package Manager Support

| Package Manager | Files Scanned |
|----------------|---------------|
| npm | `package.json`, `package-lock.json` |
| Yarn | `package.json`, `yarn.lock` |
| pnpm | `package.json`, `pnpm-lock.yaml` |

## Caching Behavior

1. **Primary**: Attempts to fetch latest compromised packages from remote URL
2. **Fallback**: Uses cached version if remote fetch fails and cache is valid
3. **Last Resort**: Uses embedded fallback list if no cache available

Cache is stored in system temp directory and respects the `cacheTimeout` configuration.

## Security Considerations

- **No Credentials Required**: Uses public package registries and GitHub APIs
- **Minimal Permissions**: Only requires basic repository read access
- **Offline Capable**: Works in air-gapped environments with cached lists
- **Audit Trail**: All actions are logged and trackable

## Troubleshooting

### Common Issues

**"Failed to fetch compromised packages list"**
- Check internet connectivity
- Verify the URL is accessible
- Check if cached version exists and is valid

**"No package files found"**
- Verify you're in the correct directory
- Check `excludeDirectories` configuration
- Ensure package manager files exist

**"GitHub API rate limiting"**
- Provide a GitHub token with appropriate permissions
- Use the tool less frequently or implement caching

### Debug Mode

Enable verbose logging by setting the `DEBUG` environment variable:

```bash
DEBUG=node-pkg-scanner* node-pkg-scanner scan
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Security Disclosure

If you discover a security vulnerability, please send an email to security@your-org.com instead of using the issue tracker.

## References

- [Socket.dev Blog: Ongoing Supply Chain Attack](https://socket.dev/blog/ongoing-supply-chain-attack-targets-crowdstrike-npm-packages)
- [Compromised Packages List](https://github.com/Cobenian/shai-hulud-detect)
- [Supply Chain Security Best Practices](https://github.com/ossf/wg-best-practices-os-developers)

---

**⚠️ Important**: This tool helps detect known compromised packages but should be part of a comprehensive security strategy. Always keep your dependencies updated and monitor security advisories.