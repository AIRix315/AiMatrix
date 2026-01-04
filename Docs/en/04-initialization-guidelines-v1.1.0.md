# Initialization Guidelines v1.1.0

## Version History

| Version | Date | Type | Changes |
|---------|------|------|---------|
| 1.1.0 | 2026-01-04 | Major | Updated tech stack, removed redundant sections |
| 1.0.0 | 2025-12-22 | Initial | Created initialization guidelines |

---

## System Requirements

- **OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **RAM**: Min 8GB, recommended 16GB
- **Storage**: ≥10GB available
- **Network**: Stable internet connection

---

## Development Tools

### Installation

```bash
# Node.js 20+ (verify)
node --version  # v20.x.x
npm --version   # 9.x.x

# Git 2.30+
git --version
```

### Tech Stack

- Node.js 20+
- Electron 39+
- React 18+
- TypeScript 5+
- Webpack 5+
- Vitest (testing)

---

## Project Setup

```bash
# Clone repository
git clone <repository-url>
cd matrix

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### Environment Variables

```env
NODE_ENV=development
ELECTRON_IS_DEV=true

# API endpoints (if using external services)
COMFYUI_API_URL=http://localhost:8188
```

---

## Development Commands

```bash
# Development mode (with hot reload)
npm run dev

# Build all processes
npm run build

# Run tests
npm test                 # All tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:watch       # Watch mode

# Code quality
npm run lint
npm run lint:fix
npm run format
```

---

## Common Issues

### Dependencies Installation Failed

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Electron Fails to Start

```bash
npm rebuild electron
```

### Port Already in Use

Default dev server port: 3000. Change in `webpack.renderer.config.js` if needed.

---

## Performance Benchmarks

- **Cold start**: <5s
- **Hot start**: <2s
- **Memory (idle)**: <200MB
- **Memory (active)**: <500MB

---

**中文版本**: `docs/04-initialization-guidelines-v1.1.0.md`
