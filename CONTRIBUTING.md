# Contributing to Clinical Extractor

Thank you for your interest in contributing to Clinical Extractor! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, collaborative, and constructive in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [GitHub Issues](https://github.com/matheus-rech/clinical-extractor/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment details (OS, Node version, browser)
   - Screenshots if applicable

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Potential implementation approach (optional)

### Pull Requests

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/clinical-extractor.git
   cd clinical-extractor
   npm install
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation
   - Ensure all tests pass: `npm test && npm run test:e2e`
   - Run type checking: `npm run lint`

4. **Commit Changes**
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: Add new extraction method"
   git commit -m "fix: Resolve PDF rendering issue"
   git commit -m "docs: Update API documentation"
   ```

5. **Push & Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a Pull Request on GitHub with:
   - Description of changes
   - Related issue number (if applicable)
   - Screenshots/demos for UI changes

## Development Setup

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed development workflow.

### Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# Start dev server
npm run dev

# Run tests
npm test
npm run test:e2e
```

## Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Follow existing patterns
- **Naming**: Descriptive variable/function names
- **Comments**: JSDoc for public APIs
- **Testing**: Unit tests for utilities, E2E tests for features

## Testing Requirements

- All new features must include tests
- Maintain or improve code coverage
- E2E tests for user-facing features
- Unit tests for utilities and services

## Documentation

- Update README.md for user-facing changes
- Update docs/ for architecture changes
- Add JSDoc comments for new APIs
- Update CLAUDE.md for AI assistant guidance

## Questions?

- Open a [Discussion](https://github.com/matheus-rech/clinical-extractor/discussions)
- Check [docs/](docs/) for detailed guides
- Contact: matheus.rech@example.com

Thank you for contributing! 🎉
