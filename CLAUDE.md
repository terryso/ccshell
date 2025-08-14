# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ccshell is a natural language interface for macOS shell commands that supports multiple AI providers (Claude Code CLI and Gemini CLI) to transform user descriptions into executable shell commands. The tool uses a three-tier strategy: prioritize local commands, install missing tools, and generate shell scripts as fallback.

## Development Commands

### Testing and Quality Assurance
```bash
# Run all tests (56 tests across all test files)
npm test

# Run unit tests only (26 tests from index.test.js)
npm run test:unit

# Run all tests with coverage report (88.78% coverage)
npm run test:coverage

# Run linting (currently placeholder) 
npm run lint

# Run both tests and lint
npm run ci

# Pre-publish validation
npm run prepublish-check
```

### Release Management
```bash
# Create patch release (0.1.6 -> 0.1.7)
npm run release:patch

# Create minor release (0.1.6 -> 0.2.0)
npm run release:minor  

# Create major release (0.1.6 -> 1.0.0)
npm run release:major

# Default release (patch)
npm run release
```

### Development Testing
```bash
# Test locally without global install (default: Claude)
node index.js "your task description"

# Test with specific AI provider
node index.js --provider gemini "your task description"

# Test with debug output
DEBUG=1 node index.js "your task description"

# Test configuration
node index.js --config
node index.js --set-default gemini

# Test after global install
npm install -g .
ccshell "your task description"
ccshell --provider gemini "your task description"
```

## Architecture

### Core Components

1. **AIProvider Class** - Abstraction layer supporting multiple AI CLI providers (Claude Code, Gemini CLI)
2. **Configuration System** - JSON-based config in `~/.ccshell.json` for provider selection and settings
3. **Prompt Construction** - AI-specific prompt templates optimized for each provider
4. **Stream Processing** - Handles different output formats (Claude's JSON streaming, Gemini's text output)
5. **CLI Interface** - Enhanced argument parsing with provider selection and configuration management
6. **Release Automation** - `scripts/release.js` handles version bumping, git operations, and publishing
7. **Quality Gates** - `scripts/pre-publish-check.js` validates package before release

### Key Design Principles

- **Provider Agnostic**: Support multiple AI CLI providers through abstraction layer
- **Extreme Simplicity**: ccshell focuses solely on prompt engineering and AI CLI integration
- **No Direct Command Execution**: All shell commands are executed through AI providers for safety
- **Flexible UX**: Adapts to different AI provider output formats (streaming JSON, plain text)
- **Security-First**: Uses provider-specific safety features (Claude's `--dangerously-skip-permissions`)

### Prompt Engineering Strategy

The core prompt template encourages:
1. Prioritizing locally available macOS commands
2. Installing missing tools via package managers (brew, npm, etc.)  
3. Writing custom shell scripts only as last resort

## Key Files

- `index.js` - Main CLI executable with multi-provider support
- `~/.ccshell.json` - User configuration file (auto-created)
- `package.json` - NPM package configuration with binary definition
- `scripts/release.js` - Automated release workflow
- `scripts/pre-publish-check.js` - Pre-publish validation
- `docs/brief.md` - Comprehensive project requirements and architecture analysis

## Configuration Management

### Default Configuration Structure
```json
{
  "defaultProvider": "claude",
  "providers": {
    "claude": {
      "command": "claude",
      "args": ["-p", "--output-format", "stream-json", "--verbose", "--dangerously-skip-permissions"],
      "streamFormat": "claude"
    },
    "gemini": {
      "command": "gemini",
      "args": ["chat"],
      "streamFormat": "gemini"
    }
  }
}
```

### Configuration Commands
```bash
# View current configuration
ccshell --config

# Set default provider
ccshell --set-default gemini
ccshell --set-default claude

# Use specific provider for one command
ccshell --provider gemini "your task"
```

## Development Notes

### Dependencies
- **Required**: Claude Code CLI must be installed and available in PATH (default provider)
- **Optional**: Gemini CLI as alternative provider with YOLO mode
- Uses Node.js built-in modules only (no external dependencies)  
- Distributed as global npm package via `bin` field
- Configuration stored in `~/.ccshell.json`

### Error Handling
- Graceful handling of Claude Code CLI not found (index.js:203-213)
- Stream parsing with JSON error tolerance (index.js:145-148)  
- Process exit codes and stderr forwarding

### Debug Mode
Set `DEBUG=1` environment variable or use `--debug` flag for detailed execution logging including:
- Selected AI provider
- Command execution details
- Provider-specific settings (proxy for Claude, etc.)
- Stream data (JSON for Claude, plain text for Gemini)

### Security Considerations
- **Claude Provider**: Uses `--dangerously-skip-permissions` by default for smooth UX
- **Gemini Provider**: Relies on Gemini CLI's built-in safety features
- Both providers focus on safe file operations and avoid destructive system commands
- Prominent security warnings included in documentation