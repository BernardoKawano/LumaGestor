/**
 * Captura frames com Chromium (Playwright) — Luma Gestor (Vite :5173).
 * Jornada: início, Status (/status), Acompanhamento, assistente (/wizard).
 * Sessão Google: rode uma vez `npm run capture:auth` (grava playwright-auth.json).
 */
import fs from "fs/promises";
import path from "path";
import type { Page } from "playwright";
import { chromium } from "playwright";

const CAPTURES = path.join(process.cwd(), "public", "captures");

const envBool = (v: string | undefined) =>
  v === "1" || v?.toLowerCase() === "true";

function envNumber(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const PLACEHOLDER_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;background:#111827;color:#e5e7eb;font-family:system-ui,sans-serif;
  display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem;">
  <div><p style="font-size:clamp(1.25rem,4vw,2rem);margin:0 0 1rem;">Luma Gestor</p>
  <p style="opacity:0.85;margin:0;">Na raiz: <code>npm run dev</code>. Em <code>remotion/</code>: <code>npm run capture:auth</code> depois <code>npm run capture:app</code>.</p></div>
</body></html>`;

type ChapterMeta = {
  startFrame: number;
  endFrame: number;
  title: string;
  subtitle?: string;
};

type CursorHintMeta = {
  atFrame: number;
  xPct: number;
  yPct: number;
  label: string;
};

async function writeMeta(opts: {
  frameCount: number;
  fps: number;
  width: number;
  height: number;
  sourceUrl: string;
  chapters?: ChapterMeta[];
  kenBurnsMaxScale?: number;
  compositionFps?: number;
  blackIntroFrames?: number;
  cursorHints?: CursorHintMeta[];
}) {
  await fs.mkdir(CAPTURES, { recursive: true });
  const meta = {
    frameCount: opts.frameCount,
    fps: opts.fps,
    compositionFps: opts.compositionFps ?? opts.fps,
    blackIntroFrames: opts.blackIntroFrames ?? 72,
    width: opts.width,
    height: opts.height,
    capturedAt: new Date().toISOString(),
    sourceUrl: opts.sourceUrl,
    chapters: opts.chapters ?? [],
    kenBurnsMaxScale: opts.kenBurnsMaxScale ?? 1,
    cursorHints: opts.cursorHints ?? [],
  };
  const body = JSON.stringify(meta, null, 2);
  await fs.writeFile(path.join(CAPTURES, "meta.json"), body, "utf-8");
  await fs.writeFile(
    path.join(process.cwd(), "src", "capture-meta.json"),
    body,
    "utf-8"
  );
}

async function clearOldFrames() {
  await fs.mkdir(CAPTURES, { recursive: true });
  const names = await fs.readdir(CAPTURES);
  await Promise.all(
    names
      .filter((n) => /^frame-\d+\.png$/.test(n))
      .map((n) => fs.unlink(path.join(CAPTURES, n)))
  );
}

async function screenshotFrame(page: Page, index1Based: number) {
  const name = `frame-${String(index1Based).padStart(6, "0")}.png`;
  await page.screenshot({
    path: path.join(CAPTURES, name),
    type: "png",
    animations: "disabled",
  });
}

function shouldRunGestorJourney(rawUrl: string, placeholder: boolean): boolean {
  if (placeholder) return false;
  if (process.env.CAPTURE_JOURNEY === "0") return false;
  if (envBool(process.env.CAPTURE_JOURNEY)) return true;
  try {
    const u = new URL(rawUrl);
    const hostOk =
      u.hostname === "localhost" || u.hostname === "127.0.0.1";
    const portOk = u.port === "5173";
    return hostOk && portOk && u.protocol === "http:";
  } catch {
    return false;
  }
}

function originFromUrl(url: string): string {
  return new URL(url).origin;
}

async function runGestorJourney(
  page: Page,
  baseOrigin: string,
  opts: {
    fps: number;
    width: number;
    height: number;
    postLoadMs: number;
    gotoTimeout: number;
    /** App com `npm run dev:demo-capture` — sem OAuth real */
    demoMode?: boolean;
  }
): Promise<{
  frameCount: number;
  chapters: ChapterMeta[];
  cursorHints: CursorHintMeta[];
}> {
  const delay = (ms: number) =>
    new Promise<void>((r) => setTimeout(r, ms));
  const intervalMs = 1000 / opts.fps;
  const chapters: ChapterMeta[] = [];
  const cursorHints: CursorHintMeta[] = [];

  const sceneScale = envNumber("CAPTURE_SCENE_SCALE", 135) / 100;
  const nf = (base: number) => Math.max(8, Math.round(base * sceneScale));

  let frameCounter = 0;

  const pushCursorHint = (
    atContentFrame: number,
    box: { x: number; y: number; width: number; height: number },
    label: string
  ) => {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    cursorHints.push({
      atFrame: Math.max(0, atContentFrame),
      xPct: (cx / opts.width) * 100,
      yPct: (cy / opts.height) * 100,
      label,
    });
  };

  const tryClick = async (
    locatorFactory: () => ReturnType<Page["locator"]>,
    label: string,
    clickLabelPt: string
  ): Promise<boolean> => {
    try {
      const loc = locatorFactory();
      if ((await loc.count()) === 0) {
        console.warn(`[capture] omitido clique (${label}): elemento não encontrado.`);
        return false;
      }
      const el = loc.first();
      await el.scrollIntoViewIfNeeded();
      await delay(250);
      const box = await el.boundingBox();
      if (box !== null && frameCounter >= 1) {
        pushCursorHint(frameCounter - 1, box, clickLabelPt);
      }
      await el.click({ timeout: 12_000 });
      await delay(450);
      return true;
    } catch (e) {
      console.warn(`[capture] clique falhou (${label})`, e);
      return false;
    }
  };

  const scrollPage = async (t01: number) => {
    const vh = opts.height;
    const scrollHeight = await page.evaluate(() =>
      Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight ?? 0
      )
    );
    const maxY = Math.max(0, scrollHeight - vh);
    const y = Math.round(t01 * maxY);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
  };

  const shootScene = async (
    sceneFrames: number,
    options?: {
      before?: () => Promise<void>;
      scroll?: "page" | "none";
    }
  ) => {
    if (options?.before) await options.before();
    const mode = options?.scroll ?? "none";
    for (let i = 0; i < sceneFrames; i++) {
      if (mode === "page") {
        const t = sceneFrames <= 1 ? 0 : i / (sceneFrames - 1);
        await scrollPage(t);
      }
      frameCounter += 1;
      await screenshotFrame(page, frameCounter);
      if (i < sceneFrames - 1) await delay(intervalMs);
    }
  };

  const goto = async (pathname: string) => {
    const url = `${baseOrigin}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
    await page.goto(url, {
      waitUntil: "load",
      timeout: opts.gotoTimeout,
    });
    if (opts.postLoadMs > 0) await delay(opts.postLoadMs);
  };

  const commitChapter = (
    start: number,
    title: string,
    subtitle?: string
  ) => {
    chapters.push({
      startFrame: start,
      endFrame: frameCounter,
      title,
      subtitle,
    });
  };

  const isSignedInHomeVisible = async () =>
    page
      .getByRole("heading", { name: /^Início$/i })
      .isVisible()
      .catch(() => false);

  const ensureSignedIn = async () => {
    if (await isSignedInHomeVisible()) return;
    throw new Error(
      "[capture] App não está logado neste perfil Playwright.\n" +
        "Na pasta remotion: npm run capture:auth\n" +
        "(faça login na janela que abrir — não basta estar logado no Edge/Chrome à parte)\n" +
        "Depois: npm run capture:app"
    );
  };

  const dismissInAppTutorialIfAny = async () => {
    const btn = page.getByRole("button", { name: /^Entendi$/i });
    if ((await btn.count()) > 0) {
      await btn.first().click({ timeout: 5_000 }).catch(() => {});
      await delay(400);
    }
  };

  const openObraSelector = async () => {
    const selectorTrigger = page
      .locator("div")
      .filter({ hasText: "Selecione uma obra" })
      .first();
    if ((await selectorTrigger.count()) === 0) {
      throw new Error("[capture] seletor de obra não encontrado.");
    }
    await selectorTrigger.click({ timeout: 8_000 });
    await delay(450);
  };

  const selectObraFromClientes2026 = async () => {
    try {
      await openObraSelector();

      const clientes2026 = page.getByRole("button", { name: /2026/i }).first();
      if ((await clientes2026.count()) === 0) {
        console.warn("[capture] pasta com '2026' não encontrada.");
        return false;
      }

      await clientes2026.click({ timeout: 8_000 });
      await delay(550);

      const folderRows = page.locator("div.max-h-56 button").filter({ hasText: /\S/ });
      const firstFolderButton = folderRows.first();
      if ((await firstFolderButton.count()) === 0) {
        console.warn("[capture] nenhuma obra encontrada dentro da pasta 2026.");
        return false;
      }

      const box = await firstFolderButton.boundingBox();
      if (box !== null && frameCounter >= 1) {
        pushCursorHint(frameCounter - 1, box, "Selecionar obra");
      }

      await firstFolderButton.click({ timeout: 8_000 });
      await delay(1_400);
      return true;
    } catch (e) {
      console.warn("[capture] falha ao selecionar obra na pasta 2026.", e);
      return false;
    }
  };

  const createPaymentRequestExample = async () => {
    try {
      const selected = await selectObraFromClientes2026();
      if (!selected) return false;

      const clientesInput = page.getByLabel("Clientes");
      if ((await clientesInput.count()) > 0) {
        await clientesInput.fill("Cliente Exemplo - Clientes 2026");
      }

      const projetoInput = page.getByLabel("Projeto (endereço)");
      if ((await projetoInput.count()) > 0) {
        await projetoInput.fill("Rua Exemplo, 100 - Obra selecionada");
      }

      await page.getByRole("button", { name: /^Continuar$/i }).first().click({ timeout: 10_000 });
      await delay(700);

      const empresaInput = page.getByLabel("Empresa / Loja");
      if ((await empresaInput.count()) > 0) {
        await empresaInput.fill("Fornecedor Exemplo");
      }

      const servicoValorInput = page.getByLabel("Valor do serviço");
      if ((await servicoValorInput.count()) > 0) {
        await servicoValorInput.fill("25000");
      }

      const addAdicionalBtn = page.getByRole("button", { name: /\+ Adicional/i }).first();
      if ((await addAdicionalBtn.count()) > 0) {
        await addAdicionalBtn.click();
        await delay(250);
        const adicionalNome = page.getByPlaceholder("Nome / descrição").first();
        if ((await adicionalNome.count()) > 0) {
          await adicionalNome.fill("Material complementar");
        }
      }

      await page.getByRole("button", { name: /^Continuar$/i }).first().click({ timeout: 10_000 });
      await delay(700);

      const gerarPdfBtn = page.getByRole("button", { name: /Gerar PDF/i }).first();
      if ((await gerarPdfBtn.count()) > 0) {
        const box = await gerarPdfBtn.boundingBox();
        if (box !== null && frameCounter >= 1) {
          pushCursorHint(frameCounter - 1, box, "Gerar PDF");
        }
        await gerarPdfBtn.click({ timeout: 10_000 });
        await page
          .getByRole("heading", { name: /Solicitação gerada/i })
          .waitFor({ timeout: 90_000 });
        await delay(1200);
      }

      return true;
    } catch (e) {
      console.warn("[capture] falha ao criar solicitação de pagamento de exemplo.", e);
      return false;
    }
  };

  await goto("/");
  if (opts.demoMode) {
    const visible = await page
      .getByRole("heading", { name: /^Início$/i })
      .waitFor({ state: "visible", timeout: 90_000 })
      .then(() => true)
      .catch(() => false);
    if (!visible) {
      throw new Error(
        "[capture] DEMO: a tela «Início» não apareceu.\n" +
          "Na raiz do repositório rode `npm run dev:demo-capture` (Vite com VITE_DEMO_CAPTURE) na mesma URL de CAPTURE_URL,\n" +
          "depois `npm run capture:demo` em remotion/. O `npm run dev` normal exige login Google no Playwright."
      );
    }
  } else {
    await ensureSignedIn();
  }
  const signedInHome = await isSignedInHomeVisible();

  let cStart = frameCounter;

  if (signedInHome) {
    await shootScene(nf(52), { scroll: "page" });
    commitChapter(
      cStart,
      "Início",
      "Atalhos para nova solicitação, acompanhamento e status."
    );

    cStart = frameCounter;
    const clickedStatus = await tryClick(
      () => page.getByRole("button", { name: /^Status$/ }),
      "cartão Status",
      "Status"
    );
    if (!clickedStatus) {
      await goto("/status");
    } else {
      await page.waitForURL(/\/status$|\/status\?/, { timeout: 15_000 }).catch(() => {});
      await delay(400);
    }
    await shootScene(nf(44), { scroll: "page" });
    commitChapter(
      cStart,
      "Status",
      "Kanban das solicitações e estados de pagamento."
    );
  }

  cStart = frameCounter;
  await goto("/acompanhamento");
  await dismissInAppTutorialIfAny();
  await selectObraFromClientes2026();
  await shootScene(nf(44), { scroll: "page" });
  commitChapter(
    cStart,
    "Acompanhamento",
    "Visão financeira da obra selecionada em Clientes 2026, com funcionários e saldos."
  );

  cStart = frameCounter;
  await goto("/wizard");
  await dismissInAppTutorialIfAny();
  await createPaymentRequestExample();
  await shootScene(nf(48), { scroll: "page" });
  commitChapter(
    cStart,
    "Nova solicitação",
    "Exemplo completo de criação da solicitação de pagamento e geração de PDF."
  );

  return { frameCount: frameCounter, chapters, cursorHints };
}

async function runSimpleScroll(
  page: Page,
  totalFrames: number,
  fps: number,
  height: number
): Promise<void> {
  const delay = (ms: number) =>
    new Promise<void>((r) => setTimeout(r, ms));
  const intervalMs = 1000 / fps;
  const scrollHeight = await page.evaluate(() =>
    Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0
    )
  );
  const maxScroll = Math.max(0, scrollHeight - height);

  for (let i = 0; i < totalFrames; i++) {
    if (maxScroll > 0 && totalFrames > 1) {
      const y = Math.round((i / (totalFrames - 1)) * maxScroll);
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    }
    await screenshotFrame(page, i + 1);
    if (i < totalFrames - 1) await delay(intervalMs);
  }
}

async function main() {
  const placeholder = envBool(process.env.CAPTURE_PLACEHOLDER);
  /** DEMO: app com `npm run dev:demo-capture` na raiz — remover com src/demo/ */
  const captureDemo = envBool(process.env.CAPTURE_DEMO);
  const url = placeholder
    ? "data:text/html;charset=utf-8," + encodeURIComponent(PLACEHOLDER_HTML)
    : process.env.CAPTURE_URL || "http://localhost:5173";

  const width = envNumber("CAPTURE_WIDTH", 1920);
  const height = envNumber("CAPTURE_HEIGHT", 1080);
  const fps = envNumber("CAPTURE_FPS", 30);
  const durationSec = placeholder
    ? 1 / fps
    : envNumber("CAPTURE_DURATION_SECONDS", 5);

  const simpleFrames = Math.max(1, Math.round(durationSec * fps));

  await clearOldFrames();

  const delay = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  const rawChannel = process.env.CAPTURE_CHROME_CHANNEL?.trim();
  const preferredChannel =
    rawChannel && rawChannel.length > 0
      ? rawChannel
      : process.platform === "win32"
        ? "msedge"
        : undefined;

  const headless = process.env.CAPTURE_HEADLESS === "1";
  const channelFallbacks: (string | undefined)[] = [];
  if (preferredChannel) channelFallbacks.push(preferredChannel);
  if (preferredChannel !== "msedge" && process.platform === "win32") {
    channelFallbacks.push("msedge");
  }
  channelFallbacks.push(undefined);

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  let lastLaunchErr: unknown;
  for (const ch of channelFallbacks) {
    try {
      browser = await chromium.launch({ headless, channel: ch });
      if (ch !== preferredChannel && preferredChannel) {
        console.warn(
          `[capture] Canal "${preferredChannel}" indisponível; usando ${ch ?? "Chromium embutido"}.`
        );
      }
      break;
    } catch (e) {
      lastLaunchErr = e;
    }
  }
  if (!browser) throw lastLaunchErr;

  const deviceScale = envNumber("CAPTURE_DEVICE_SCALE", 2);

  const authPath = path.resolve(
    process.cwd(),
    process.env.CAPTURE_STORAGE_STATE || "playwright-auth.json"
  );

  let storageState: string | undefined;
  if (!placeholder && shouldRunGestorJourney(url, false) && !captureDemo) {
    try {
      await fs.access(authPath);
      storageState = authPath;
    } catch {
      console.error(
        "Falta sessão para captura com login.\n" +
          `Arquivo esperado: ${authPath}\n\n` +
          "1) Com o Vite em http://localhost:5173, na pasta remotion rode:\n" +
          "   npm run capture:auth\n" +
          "2) Na janela do Playwright, faça Entrar com Google até ver «Início».\n" +
          "3) Depois: npm run capture:app\n\n" +
          "Modo demo (sem Google): na raiz `npm run dev:demo-capture`, depois `npm run capture:demo` em remotion/.\n" +
          "(O login no navegador normal não é o mesmo perfil do Playwright.)"
      );
      await browser.close();
      process.exitCode = 1;
      return;
    }
  }

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: deviceScale,
    ...(storageState ? { storageState } : {}),
  });
  const page = await context.newPage();

  const waitUntil =
    (process.env.CAPTURE_WAIT_UNTIL as "load" | "domcontentloaded" | "networkidle") ||
    "load";
  const gotoTimeout = envNumber("CAPTURE_GOTO_TIMEOUT_MS", 120_000);
  const postLoadMs = placeholder
    ? 0
    : envNumber("CAPTURE_POST_LOAD_MS", 3000);

  let totalFrames: number;
  let metaSource: string;
  let journeyChapters: ChapterMeta[] | undefined;
  let journeyCursorHints: CursorHintMeta[] | undefined;

  try {
    if (placeholder) {
      await page.goto(url, { waitUntil, timeout: gotoTimeout });
      totalFrames = simpleFrames;
      metaSource = "placeholder:built-in-html";
      await runSimpleScroll(page, totalFrames, fps, height);
    } else if (shouldRunGestorJourney(url, false)) {
      const origin = originFromUrl(url);
      const out = await runGestorJourney(page, origin, {
        fps,
        width,
        height,
        postLoadMs,
        gotoTimeout,
        demoMode: captureDemo,
      });
      totalFrames = out.frameCount;
      journeyChapters = out.chapters;
      journeyCursorHints = out.cursorHints;
      metaSource = `${origin} (jornada Gestor: /, /status, /acompanhamento, /wizard)${
        captureDemo ? " [DEMO sem OAuth — apagar src/demo/ e CAPTURE_DEMO]" : ""
      }`;
    } else {
      await page.goto(url, { waitUntil, timeout: gotoTimeout });
      if (postLoadMs > 0) await delay(postLoadMs);
      totalFrames = simpleFrames;
      metaSource = url;
      await runSimpleScroll(page, totalFrames, fps, height);
    }
  } catch (e) {
    await browser.close();
    const hint =
      url.includes("localhost:5173") || url.includes("127.0.0.1:5173")
        ? " Confirme Vite na raiz (npm run dev) e sessão: npm run capture:auth em remotion/."
        : "";
    console.error(
      "Falha na captura. Verifique CAPTURE_URL e os serviços locais." + hint,
      e
    );
    process.exitCode = 1;
    return;
  }

  await browser.close();

  const kenBurnsMaxScale = envNumber("CAPTURE_KEN_BURNS_MAX", 1);
  const compositionFps = envNumber("CAPTURE_COMPOSITION_FPS", 12);
  const blackIntroFrames = envNumber("CAPTURE_BLACK_INTRO_FRAMES", 48);
  const fallbackChapter: ChapterMeta[] = [
    {
      startFrame: 0,
      endFrame: totalFrames,
      title: "",
      subtitle: "",
    },
  ];

  await writeMeta({
    frameCount: totalFrames,
    fps,
    width,
    height,
    sourceUrl: metaSource,
    chapters: journeyChapters ?? fallbackChapter,
    kenBurnsMaxScale,
    compositionFps,
    blackIntroFrames,
    cursorHints: journeyCursorHints ?? [],
  });

  console.log(
    `Captura concluída: ${totalFrames} frames em ${CAPTURES} (captura ${fps} fps; deviceScale=${deviceScale})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
