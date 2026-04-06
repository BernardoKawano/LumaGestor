export type ChapterRange = {
  startFrame: number;
  endFrame: number;
  title: string;
  subtitle?: string;
};

/**
 * Capítulo activo no frame `frame` (0-based). `endFrame` é exclusivo.
 */
export function chapterAtFrame(
  chapters: readonly ChapterRange[],
  frame: number
): ChapterRange | null {
  if (chapters.length === 0) return null;
  return (
    chapters.find((c) => frame >= c.startFrame && frame < c.endFrame) ?? null
  );
}

export function localFrameInChapter(
  chapter: ChapterRange,
  frame: number
): number {
  return Math.max(0, frame - chapter.startFrame);
}

export function chapterDuration(chapter: ChapterRange): number {
  return Math.max(1, chapter.endFrame - chapter.startFrame);
}

/** Frame é o primeiro do capítulo (início de cena). */
export function isChapterStartFrame(
  chapters: readonly ChapterRange[],
  frame: number
): boolean {
  return chapters.some((c) => frame === c.startFrame);
}

/**
 * Distância ao início do capítulo actual; `null` se fora de qualquer capítulo.
 */
export function framesSinceChapterStart(
  chapters: readonly ChapterRange[],
  frame: number
): number | null {
  const ch = chapterAtFrame(chapters, frame);
  if (!ch) return null;
  return frame - ch.startFrame;
}

/**
 * Opacidade de um “dip” escuro nos primeiros frames após o início de cada capítulo
 * (útil para transição discreta). Frame 0 do vídeo não aplica dip.
 */
export function chapterTransitionDipOpacity(
  chapters: readonly ChapterRange[],
  frame: number,
  dipFrames: number,
  maxOpacity: number
): number {
  if (frame === 0 || dipFrames <= 0) return 0;
  const since = framesSinceChapterStart(chapters, frame);
  if (since === null || since >= dipFrames) return 0;
  const denom = Math.max(1, dipFrames - 1);
  const t = since / denom;
  return maxOpacity * (1 - t);
}
