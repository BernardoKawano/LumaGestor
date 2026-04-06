# Remotion — vídeo do Luma Gestor (captura Chrome)

Pacote à parte na raiz do repositório: gera MP4 a partir de frames PNG capturados com **Playwright (Chromium)**. A app Vite corre em **http://localhost:5173**.

Documentação Remotion: [remotion.dev](https://www.remotion.dev/docs/).

## Logo do intro

O intro usa `public/branding/logo.png`. O repositório inclui um placeholder mínimo; substitua pelo PNG oficial (ver `public/branding/README.txt`).

## Pré-requisitos

- Node.js 18+
- Após `npm install` nesta pasta: `npx playwright install chromium`

## Fluxo típico (demo com home autenticada)

1. Na **raiz** do Luma Gestor (não em `remotion/`):

   ```bash
   # Windows PowerShell
   $env:VITE_CAPTURE_MOCK_AUTH="1"; npm run dev
   ```

   Ou com `cross-env` se preferir: `cross-env VITE_CAPTURE_MOCK_AUTH=1 npm run dev`

2. Em `remotion/`:

   ```bash
   npm install
   npx playwright install chromium
   npm run capture
   npm run render
   ```

   Saída: `out/saas-capture.mp4` (composição **SaasShowcase**).

A flag `VITE_CAPTURE_MOCK_AUTH=1` só tem efeito em **desenvolvimento** e evita OAuth real para o Playwright ver a home com atalhos.

## Composições

| ID | Descrição |
|----|-----------|
| `SaasShowcase` | Intro preta + logo, capturas com cartão “Esta tela”, cursor sintético, fades, dip entre capítulos (mesmo estilo que o projeto Luma Lector WEB). |
| `SaasCapture` | Sequência plana de PNGs (`npm run render:flat`). |

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Remotion Studio |
| `npm run capture` | Captura (URL por defeito `http://localhost:5173`; jornada automática nessa origem ou com `CAPTURE_JOURNEY=1`) |
| `npm run capture:app` | Força URL e jornada: `localhost:5173` + `CAPTURE_JOURNEY=1` |
| `npm run capture:placeholder` | Uma frame estática (sem app a correr) |
| `npm run render` | `out/saas-capture.mp4` |
| `npm run render:flat` | `out/saas-capture-flat.mp4` |
| `npm test` | Testes unitários |

## Variáveis de ambiente (captura)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `CAPTURE_URL` | `http://localhost:5173` | URL aberta no Chromium |
| `CAPTURE_JOURNEY` | — | `1` força jornada Gestor; `0` desativa (só scroll na URL) |
| `CAPTURE_DURATION_SECONDS` | `5` | Modo simples (sem jornada): duração |
| `CAPTURE_FPS` | `30` | FPS dos PNG |
| `CAPTURE_WIDTH` / `CAPTURE_HEIGHT` | `1920` / `1080` | Viewport |
| `CAPTURE_POST_LOAD_MS` | `3000` | Pausa após `goto` (hidratação Vite) |
| `CAPTURE_COMPOSITION_FPS` | `18` | FPS da composição Remotion |
| `CAPTURE_BLACK_INTRO_FRAMES` | `72` | Duração do intro com logo |
| `CAPTURE_SCENE_SCALE` | `135` | Escala % do número de frames por cena |
| `CAPTURE_PLACEHOLDER` | — | `capture:placeholder` define `1` |
| `CAPTURE_CHROME_CHANNEL` | — | Ex.: `chrome` para usar Chrome instalado |

## Changelog (pacote remotion)

- **1.0.0** — Pacote inicial: `SaasShowcase` / `SaasCapture` alinhados ao Luma Lector WEB; captura Playwright com jornada Gestor (`/`, `/status`, `/acompanhamento`, `/wizard`); integração com `VITE_CAPTURE_MOCK_AUTH` na app.
