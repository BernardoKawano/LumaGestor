import type { FC } from "react";
import { Composition } from "remotion";
import captureMeta from "./capture-meta.json";
import type { ChapterRange } from "./chapterUtils";
import type { CursorHintRecord } from "./cursorHints";
import { SaasCapture } from "./SaasCapture";
import { SaasShowcase } from "./SaasShowcase";

export type CaptureMetaJson = {
  frameCount: number;
  fps: number;
  compositionFps?: number;
  blackIntroFrames?: number;
  width: number;
  height: number;
  capturedAt?: string;
  sourceUrl?: string;
  chapters?: ChapterRange[];
  kenBurnsMaxScale?: number;
  cursorHints?: CursorHintRecord[];
  cursorVisibleSecondsBeforeClick?: number;
  syntheticCursor?: boolean;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  chapterDipFrames?: number;
  chapterDipMaxOpacity?: number;
};

const meta = captureMeta as CaptureMetaJson;

const frameCount = Math.max(1, meta.frameCount);
const captureFps = Math.max(1, meta.fps);
const compositionFps = Math.max(
  1,
  typeof meta.compositionFps === "number" ? meta.compositionFps : captureFps
);
const width = Math.max(1, meta.width);
const height = Math.max(1, meta.height);

const chapters: ChapterRange[] =
  meta.chapters && meta.chapters.length > 0
    ? meta.chapters
    : [{ startFrame: 0, endFrame: frameCount, title: "", subtitle: "" }];

const blackIntroFrames =
  typeof meta.blackIntroFrames === "number" && meta.blackIntroFrames >= 0
    ? meta.blackIntroFrames
    : 72;

const cursorHints: CursorHintRecord[] = Array.isArray(meta.cursorHints)
  ? meta.cursorHints
  : [];

const cursorVisibleSecondsBeforeClick =
  typeof meta.cursorVisibleSecondsBeforeClick === "number" &&
  meta.cursorVisibleSecondsBeforeClick >= 0
    ? meta.cursorVisibleSecondsBeforeClick
    : 1;

const syntheticCursor = meta.syntheticCursor !== false;
const fadeInFrames =
  typeof meta.fadeInFrames === "number" ? meta.fadeInFrames : 18;
const fadeOutFrames =
  typeof meta.fadeOutFrames === "number" ? meta.fadeOutFrames : 22;
const chapterDipFrames =
  typeof meta.chapterDipFrames === "number" ? meta.chapterDipFrames : 5;
const chapterDipMaxOpacity =
  typeof meta.chapterDipMaxOpacity === "number"
    ? meta.chapterDipMaxOpacity
    : 0.18;

const showcaseDuration = blackIntroFrames + frameCount;

export const RemotionRoot: FC = () => {
  return (
    <>
      <Composition
        id="SaasShowcase"
        component={SaasShowcase}
        durationInFrames={showcaseDuration}
        fps={compositionFps}
        width={width}
        height={height}
        defaultProps={{
          frameCount,
          width,
          height,
          chapters,
          blackIntroFrames,
          cursorHints,
          cursorVisibleSecondsBeforeClick,
          syntheticCursor,
          fadeInFrames,
          fadeOutFrames,
          chapterDipFrames,
          chapterDipMaxOpacity,
        }}
      />
      <Composition
        id="SaasCapture"
        component={SaasCapture}
        durationInFrames={frameCount}
        fps={compositionFps}
        width={width}
        height={height}
        defaultProps={{
          frameCount,
          width,
          height,
        }}
      />
    </>
  );
};
