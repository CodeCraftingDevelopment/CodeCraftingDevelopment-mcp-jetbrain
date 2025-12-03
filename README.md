# JetBrains MCP Bridge

Bridge MCP permettant d'utiliser les outils JetBrains IDE depuis Cascade (Windsurf) ou tout autre client MCP.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Cascade/       │────▶│  MCP Bridge      │────▶│  JetBrains IDE  │
│  Windsurf       │     │  (stdio)         │     │  (SSE :64342)   │
│                 │◀────│                  │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Prérequis

1. **JetBrains IDE** (IntelliJ, WebStorm, PyCharm, etc.) avec le plugin MCP activé
2. **Node.js** >= 18
3. **Windsurf** avec Cascade

## Installation

```bash
npm install
npm run build:mcp
```

## Configuration Windsurf/Cascade

Ajoutez cette configuration dans les paramètres MCP de Windsurf (`~/.codeium/windsurf/mcp_config.json`) :

```json
{
  "mcpServers": {
    "jetbrains": {
      "command": "node",
      "args": ["C:/Users/chris/IdeaProjects/test/dist/mcp-server.js"],
      "env": {
        "JETBRAINS_MCP_HOST": "127.0.0.1",
        "JETBRAINS_MCP_PORT": "64342"
      }
    }
  }
}
```

> **Note**: Adaptez le chemin `args` selon l'emplacement de votre projet.

## Utilisation

1. **Ouvrez votre IDE JetBrains** avec un projet
2. **Vérifiez que le proxy MCP est actif** (port 64342 par défaut)
3. **Redémarrez Windsurf** pour charger la configuration MCP
4. **Utilisez Cascade** - les outils JetBrains seront disponibles

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `JETBRAINS_MCP_HOST` | `127.0.0.1` | Hôte du proxy MCP JetBrains |
| `JETBRAINS_MCP_PORT` | `64342` | Port du proxy MCP JetBrains |

## Test manuel

```bash
npm run start:mcp
```

## Interface Web (optionnel)

Une interface React est également disponible pour tester la connexion :

```bash
npm run dev
```

Ouvrez http://localhost:5173 pour voir les outils MCP disponibles.

---

## React + TypeScript + Vite (Documentation originale)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
