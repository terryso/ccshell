# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ccshell is a natural language interface for macOS shell commands that supports multiple AI providers (Claude Code CLI and Gemini CLI) to transform user descriptions into executable shell commands. The tool uses an enhanced four-tier strategy: 
1. Check local script library for similar solutions
2. Prioritize local commands
3. Install missing tools
4. Generate and save new shell scripts as fallback

The built-in script library automatically saves and reuses AI-generated scripts, making the tool more efficient for repeated similar tasks.

## Development Commands

### Testing and Quality Assurance
```bash
# Run all tests (66 tests across all test files including script library)
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

# Test script library features
node index.js --scripts
node index.js --clean-scripts
node index.js --disable-library "task description"

# Test after global install
npm install -g .
ccshell "your task description"
ccshell --provider gemini "your task description"
ccshell --scripts
```

## Architecture

### Core Components

1. **AIProvider Class** - Abstraction layer supporting multiple AI CLI providers (Claude Code, Gemini CLI)
2. **ScriptLibrary Class** - Local script storage and retrieval system with similarity matching
3. **Configuration System** - JSON-based config in `~/.ccshell.json` for provider selection and script library settings
4. **Prompt Construction** - AI-specific prompt templates optimized for each provider with script library integration
5. **Stream Processing** - Handles different output formats (Claude's JSON streaming, Gemini's text output)
6. **CLI Interface** - Enhanced argument parsing with provider selection, configuration, and script library management
7. **Release Automation** - `scripts/release.js` handles version bumping, git operations, and publishing
8. **Quality Gates** - `scripts/pre-publish-check.js` validates package before release

### Key Design Principles

- **Provider Agnostic**: Support multiple AI CLI providers through abstraction layer
- **Extreme Simplicity**: ccshell focuses solely on prompt engineering and AI CLI integration
- **No Direct Command Execution**: All shell commands are executed through AI providers for safety
- **Flexible UX**: Adapts to different AI provider output formats (streaming JSON, plain text)
- **Security-First**: Uses provider-specific safety features (Claude's `--dangerously-skip-permissions`)

### Prompt Engineering Strategy

The enhanced prompt template encourages:
1. Checking local script library for similar solutions first
2. Prioritizing locally available macOS commands
3. Installing missing tools via package managers (brew, npm, etc.)  
4. Writing and saving custom shell scripts as last resort

The AI is provided with relevant scripts from the local library when available, allowing it to reuse or adapt existing solutions for better efficiency and consistency.

## Key Files

- `index.js` - Main CLI executable with multi-provider support and script library
- `~/.ccshell.json` - User configuration file (auto-created)
- `~/.ccshell/scripts/` - Local script library directory (auto-created)
- `~/.ccshell/scripts/index.json` - Script metadata index file
- `package.json` - NPM package configuration with binary definition
- `scripts/release.js` - Automated release workflow
- `scripts/pre-publish-check.js` - Pre-publish validation
- `docs/brief.md` - Comprehensive project requirements and architecture analysis
- `test/script-library.test.js` - Comprehensive tests for script library functionality

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
      "args": ["-p", "--yolo"],
      "streamFormat": "gemini"
    }
  },
  "scriptLibrary": {
    "enabled": true,
    "maxScripts": 100,
    "cleanupDays": 30,
    "scriptDir": "~/.ccshell/scripts"
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

# Script library management
ccshell --scripts                    # List all saved scripts
ccshell --clean-scripts             # Remove old scripts
ccshell --disable-library "task"    # Disable script library for this run
```

## Script Library System

### Overview

The script library automatically saves AI-generated scripts for future reuse, implementing an intelligent caching system that:

- **Automatically detects and saves** shell scripts generated by AI providers
- **Searches for similar tasks** using keyword matching algorithm  
- **Provides relevant scripts** to AI providers during prompt construction
- **Manages script lifecycle** with configurable cleanup and limits

### Features

- **Smart Detection**: Identifies scripts from tool outputs (Write tool) and text parsing (code blocks, command sequences)
- **Similarity Matching**: Uses keyword-based scoring to find relevant scripts for new tasks
- **Metadata Tracking**: Records task description, creation/update time, usage count
- **Storage Management**: Configurable cleanup (default: 30 days) and limits (default: 100 scripts)
- **Deduplication**: Prevents saving identical scripts multiple times

### Storage Structure

```
~/.ccshell/
├── scripts/           # Script files directory
│   ├── abc123def456.sh    # Script files (12-char hash IDs)
│   ├── fed654cba321.sh
│   └── index.json         # Metadata index
└── .ccshell.json      # Configuration file
```

### Script Metadata Format

```json
[
  {
    "id": "abc123def456",
    "task": "批量压缩jpg图片文件",
    "file": "/Users/name/.ccshell/scripts/abc123def456.sh",
    "created": "2024-01-01T10:30:00.000Z",
    "updated": "2024-01-01T10:30:00.000Z",
    "usage": 1,
    "type": "text",
    "filePath": null
  }
]
```

### Configuration Options

- `enabled`: Enable/disable script library (default: true)
- `maxScripts`: Maximum number of scripts to keep (default: 100)
- `cleanupDays`: Days after which unused scripts are cleaned up (default: 30)
- `scriptDir`: Directory path for script storage (default: ~/.ccshell/scripts)

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