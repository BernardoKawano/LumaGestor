/**
 * Abre um navegador real (Edge no Windows, se existir), você faz login no Luma Gestor,
 * e o script grava cookies/localStorage em playwright-auth.json para o capture.ts reutilizar.
 */
import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright";

const url = process.env.CAPTURE_URL || "http://localhost:5173";
const outPath = path.resolve(
  process.cwd(),
  process.env.CAPTURE_STORAGE_STATE || "playwright-auth.json"
);

const rawChannel = process.env.CAPTURE_CHROME_CHANNEL?.trim();
const preferredChannel =
  rawChannel && rawChannel.length > 0
    ? rawChannel
    : process.platform === "win32"
      ? "msedge"
      : undefined;

async function launchHeadedBrowser() {
  const channelFallbacks: (string | undefined)[] = [];
  if (preferredChannel) channelFallbacks.push(preferredChannel);
  if (preferredChannel !== "msedge" && process.platform === "win32") {
    channelFallbacks.push("msedge");
  }
  channelFallbacks.push(undefined);

  let lastErr: unknown;
  for (const ch of channelFallbacks) {
    try {
      const browser = await chromium.launch({ headless: false, channel: ch });
      if (ch !== preferredChannel && preferredChannel) {
        console.warn(
          `[capture:auth] Canal "${preferredChannel}" indisponível; usando ${ch ?? "Chromium embutido"}.`
        );
      }
      return browser;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function main() {
  const browser = await launchHeadedBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log("");
  console.log("→ Abrindo", url);
  console.log("→ Faça «Entrar com Google» nesta janela e aguarde aparecer o título «Início» na home.");
  console.log("→ O script grava a sessão automaticamente e fecha.");
  console.log("");

  await page.goto(url, { waitUntil: "load", timeout: 120_000 });

  await page
    .getByRole("heading", { name: /^Início$/i })
    .waitFor({ state: "visible", timeout: 600_000 });

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await context.storageState({ path: outPath });

  console.log("Sessão gravada em:", outPath);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
