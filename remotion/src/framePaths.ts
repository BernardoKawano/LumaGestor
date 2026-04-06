/** Largura do zero-padding no nome do ficheiro (ex.: frame-000042.png). */
export const FRAME_FILENAME_PAD = 6;

const FILENAME_RE = /^frame-(\d+)\.png$/;

/**
 * Nome do ficheiro PNG para o frame de vídeo no índice `frameIndex` (0-based).
 * Frame 0 → frame-000001.png
 */
export function frameFileNameForFrame(
  frameIndex: number,
  pad: number = FRAME_FILENAME_PAD
): string {
  if (!Number.isInteger(frameIndex) || frameIndex < 0) {
    throw new RangeError(`frameIndex must be a non-negative integer, got ${frameIndex}`);
  }
  const n = frameIndex + 1;
  return `frame-${String(n).padStart(pad, "0")}.png`;
}

/**
 * Caminho relativo à pasta `public/` para usar com `staticFile()`.
 */
export function staticCapturePathForFrame(frameIndex: number): string {
  return `captures/${frameFileNameForFrame(frameIndex)}`;
}

/**
 * Extrai o índice numérico de nomes como "frame-000012.png"; -1 se inválido.
 */
export function parseFrameIndexFromFileName(fileName: string): number {
  const m = fileName.match(FILENAME_RE);
  if (!m) return -1;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1) return -1;
  return n - 1;
}

/**
 * Conta quantos PNGs de frame existem numa lista de nomes de ficheiro.
 */
export function countFramePngs(fileNames: string[]): number {
  return fileNames.filter((f) => FILENAME_RE.test(f)).length;
}
