import { describe, expect, it } from "vitest";
import {
  chapterAtFrame,
  chapterDuration,
  chapterTransitionDipOpacity,
  framesSinceChapterStart,
  isChapterStartFrame,
  localFrameInChapter,
  type ChapterRange,
} from "./chapterUtils";

const sample: ChapterRange[] = [
  { startFrame: 0, endFrame: 10, title: "A" },
  { startFrame: 10, endFrame: 25, title: "B", subtitle: "b" },
];

describe("chapterAtFrame", () => {
  it("resolve o primeiro capítulo", () => {
    expect(chapterAtFrame(sample, 0)?.title).toBe("A");
    expect(chapterAtFrame(sample, 9)?.title).toBe("A");
  });

  it("resolve o segundo no limite", () => {
    expect(chapterAtFrame(sample, 10)?.title).toBe("B");
    expect(chapterAtFrame(sample, 24)?.title).toBe("B");
  });

  it("devolve null fora dos intervalos", () => {
    expect(chapterAtFrame(sample, 25)).toBeNull();
    expect(chapterAtFrame(sample, -1)).toBeNull();
  });
});

describe("localFrameInChapter", () => {
  it("calcula offset dentro do capítulo", () => {
    const ch = sample[1]!;
    expect(localFrameInChapter(ch, 10)).toBe(0);
    expect(localFrameInChapter(ch, 12)).toBe(2);
  });
});

describe("chapterDuration", () => {
  it("duração mínima 1", () => {
    expect(chapterDuration({ startFrame: 0, endFrame: 0, title: "x" })).toBe(
      1
    );
  });
});

describe("isChapterStartFrame", () => {
  it("detecta inícios de capítulo", () => {
    expect(isChapterStartFrame(sample, 0)).toBe(true);
    expect(isChapterStartFrame(sample, 10)).toBe(true);
    expect(isChapterStartFrame(sample, 5)).toBe(false);
  });
});

describe("framesSinceChapterStart", () => {
  it("devolve offset desde o início do capítulo", () => {
    expect(framesSinceChapterStart(sample, 0)).toBe(0);
    expect(framesSinceChapterStart(sample, 11)).toBe(1);
    expect(framesSinceChapterStart(sample, 25)).toBeNull();
  });
});

describe("chapterTransitionDipOpacity", () => {
  it("não escurece no frame 0", () => {
    expect(chapterTransitionDipOpacity(sample, 0, 4, 0.4)).toBe(0);
  });

  it("máximo no primeiro frame após corte e decai", () => {
    expect(chapterTransitionDipOpacity(sample, 10, 4, 0.4)).toBeCloseTo(0.4);
    expect(chapterTransitionDipOpacity(sample, 11, 4, 0.4)).toBeCloseTo(
      0.4 * (2 / 3)
    );
    expect(chapterTransitionDipOpacity(sample, 12, 4, 0.4)).toBeCloseTo(
      0.4 * (1 / 3)
    );
    expect(chapterTransitionDipOpacity(sample, 13, 4, 0.4)).toBe(0);
  });
});
