# Cursor Rules – Windows Apps by vesty

## Style & Qualité

- Toujours TypeScript pour le front Electron/React, strictNullChecks.
- Un seul bouton par tuile (classe: `unified-tile-action-button`).
- UI : glassmorphism, thèmes: Gold VIP, Violet Neon, RGB Gaming.
- Accessibilité: aria-label, focus visible, navigation clavier.
- Logs clairs pour actions système (stdout/stderr dans un panneau).

## Sécurité & Droits

- Jamais stocker de clés/API dans le code. Utiliser `.env` + `dotenv`.
- Exécutions admin: demander confirmation, journaliser la commande exact.
- Pour scripts sensibles (activation, KMS, etc.) -> wrapper séparé + disclaimer.

## Electron

- `main` isolé, `preload` sécurisé, `contextIsolation: true`.
- IPC via `contextBridge` -> `window.electronAPI`.
- Interdit: `nodeIntegration` dans le renderer.

## .NET (WinUI/WPF)

- MVVM, DI, logs (Serilog), packaging MSIX si possible.
- Multi-target x64, trimming Release.

## Python (PyQt6)

- Venv par projet, `ruff` + `black` obligatoires.
- Build avec `pyinstaller` (onefile) + icône.

## Tests & CI

- JS/TS: Vitest + Playwright (smoke UI).
- .NET: xUnit.
- Python: pytest.
- CI GitHub Actions: lint → test → build artefacts.

## Git

- Conventionnal Commits, release semver.
- Branches: `main`, `dev`, `feat/*`, `fix/*`.

> Quand je dis “fais X”, tu dois : créer/éditer le code complet, ajouter scripts npm/tasks, et fournir un guide RUN/DEBUG minimal.
