export type CursorHintRecord = {
  /** Frame de conteúdo (0-based), alinhado ao índice do PNG `frame-(n+1)`. */
  atFrame: number;
  xPct: number;
  yPct: number;
  label: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function smoothstep01(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

type Key = { f: number; x: number; y: number };

/** Frames para viajar do ponto inicial até o primeiro alvo. */
const LEAD_FRAMES = 24;

/**
 * Posição do cursor (%) e legenda activa a partir de hints gravados na captura.
 * Sem hints, usa trajetória genérica legível.
 */
export function computeSyntheticCursorPosition(
  hints: readonly CursorHintRecord[] | undefined,
  contentFrame: number,
  contentFrameCount: number
): { xPct: number; yPct: number } {
  const sorted = [...(hints ?? [])].sort((a, b) => a.atFrame - b.atFrame);
  if (sorted.length === 0) {
    const u =
      contentFrameCount > 1 ? contentFrame / (contentFrameCount - 1) : 0;
    return {
      xPct: 8 + u * 82,
      yPct: 36 + Math.sin(u * Math.PI) * 24,
    };
  }

  const keys: Key[] = [];
  const first = sorted[0]!;
  if (first.atFrame > 0) {
    keys.push({
      f: Math.max(0, first.atFrame - LEAD_FRAMES),
      x: clamp(first.xPct - 14, 5, 95),
      y: clamp(first.yPct - 10, 6, 94),
    });
  }
  for (const h of sorted) {
    keys.push({ f: h.atFrame, x: h.xPct, y: h.yPct });
  }

  const last = keys[keys.length - 1]!;
  if (contentFrame <= keys[0]!.f) {
    return { xPct: keys[0]!.x, yPct: keys[0]!.y };
  }
  if (contentFrame >= last.f) {
    return { xPct: last.x, yPct: last.y };
  }

  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!;
    const b = keys[i + 1]!;
    if (contentFrame < a.f || contentFrame >= b.f) continue;
    const denom = Math.max(1, b.f - a.f);
    const t = smoothstep01((contentFrame - a.f) / denom);
    return {
      xPct: a.x + (b.x - a.x) * t,
      yPct: a.y + (b.y - a.y) * t,
    };
  }

  for (let i = 0; i < keys.length - 1; i++) {
    const b = keys[i + 1]!;
    if (contentFrame < b.f) {
      const a = keys[i]!;
      return { xPct: a.x, yPct: a.y };
    }
  }
  return { xPct: last.x, yPct: last.y };
}

/**
 * Opacidade da etiqueta do clique no frame actual (0..1).
 */
/** Frames após o alvo em que o cursor/legenda ainda aparecem. */
const CURSOR_TAIL_AFTER = 18;

/**
 * Cursor e legenda só perto do clique: ~`secondsBeforeClick` antes de `atFrame`
 * até pouco depois. Sem hints → invisível.
 */
export function syntheticCursorNearClickState(
  hints: readonly CursorHintRecord[] | undefined,
  contentFrame: number,
  fps: number,
  secondsBeforeClick: number
): {
  visible: boolean;
  xPct: number;
  yPct: number;
  labelOpacity: number;
  labelText: string;
} {
  if (!hints?.length) {
    return {
      visible: false,
      xPct: 0,
      yPct: 0,
      labelOpacity: 0,
      labelText: "",
    };
  }
  const lead = Math.max(1, Math.ceil(fps * secondsBeforeClick));
  const candidates = hints.filter(
    (h) =>
      contentFrame >= h.atFrame - lead &&
      contentFrame <= h.atFrame + CURSOR_TAIL_AFTER
  );
  if (candidates.length === 0) {
    return {
      visible: false,
      xPct: 0,
      yPct: 0,
      labelOpacity: 0,
      labelText: "",
    };
  }
  const h = candidates.reduce((a, b) =>
    Math.abs(contentFrame - a.atFrame) <= Math.abs(contentFrame - b.atFrame)
      ? a
      : b
  );
  const entryX = clamp(h.xPct - 14, 5, 95);
  const entryY = clamp(h.yPct - 10, 6, 94);
  let xPct: number;
  let yPct: number;
  if (contentFrame <= h.atFrame) {
    const t = smoothstep01(
      (contentFrame - (h.atFrame - lead)) / Math.max(1, lead)
    );
    xPct = entryX + (h.xPct - entryX) * t;
    yPct = entryY + (h.yPct - entryY) * t;
  } else {
    xPct = h.xPct;
    yPct = h.yPct;
  }
  const d = contentFrame - h.atFrame;
  let labelOp = 0;
  if (d < -lead) labelOp = 0;
  else if (d < 0) labelOp = (d + lead) / lead;
  else if (d <= 6) labelOp = 1;
  else if (d <= CURSOR_TAIL_AFTER) {
    labelOp = 1 - (d - 6) / Math.max(1, CURSOR_TAIL_AFTER - 6);
  }
  return {
    visible: true,
    xPct,
    yPct,
    labelOpacity: labelOp,
    labelText: h.label,
  };
}

export function activeClickLabelOpacity(
  hints: readonly CursorHintRecord[] | undefined,
  contentFrame: number
): { opacity: number; text: string } {
  const sorted = [...(hints ?? [])].sort((a, b) => a.atFrame - b.atFrame);
  let best = { opacity: 0, text: "" };
  for (const h of sorted) {
    const d = contentFrame - h.atFrame;
    if (d < 0) continue;
    let o = 0;
    if (d <= 4) o = Math.min(1, (d + 1) / 4);
    else if (d <= 22) o = 1;
    else if (d <= 32) o = 1 - (d - 22) / 10;
    else continue;
    if (o > best.opacity) best = { opacity: o, text: h.label };
  }
  return best;
}
