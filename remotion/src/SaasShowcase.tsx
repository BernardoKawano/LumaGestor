import type { FC } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  chapterAtFrame,
  chapterTransitionDipOpacity,
  localFrameInChapter,
  type ChapterRange,
} from "./chapterUtils";
import {
  syntheticCursorNearClickState,
  type CursorHintRecord,
} from "./cursorHints";
import { staticCapturePathForFrame } from "./framePaths";

export type SaasShowcaseProps = {
  frameCount: number;
  width: number;
  height: number;
  chapters: ChapterRange[];
  /** Legado (meta); ignorado — sem zoom na imagem. */
  kenBurnsMaxScale?: number;
  /** Intro: fundo + logo centrada (frames absolutos antes do conteúdo). */
  blackIntroFrames?: number;
  /** Hints de cursor/legenda vindos da captura Playwright. */
  cursorHints?: CursorHintRecord[];
  /** Segundos antes do `atFrame` em que o cursor aparece (ex.: 1). */
  cursorVisibleSecondsBeforeClick?: number;
  syntheticCursor?: boolean;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  chapterDipFrames?: number;
  chapterDipMaxOpacity?: number;
};

const LOGO_PATH = "branding/logo.png";

const LogoIntroLayer: FC<{
  absFrame: number;
  blackIntroFrames: number;
  fps: number;
  compositionWidth: number;
}> = ({ absFrame, blackIntroFrames, fps, compositionWidth }) => {
  if (absFrame >= blackIntroFrames) return null;

  const logoIn = spring({
    frame: Math.min(absFrame, 36),
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.5 },
  });
  const scale = 0.82 + logoIn * 0.18;
  const fadeUp = interpolate(absFrame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeEnd = interpolate(
    absFrame,
    [blackIntroFrames - 16, blackIntroFrames - 2],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = fadeUp * fadeEnd;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={staticFile(LOGO_PATH)}
          style={{
            width: Math.min(560, compositionWidth * 0.42),
            height: "auto",
            display: "block",
            imageRendering: "high-quality",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const FlowGuideLayer: FC<{
  chapter?: ChapterRange;
  chapterIndex: number;
  chapters: ChapterRange[];
}> = ({ chapter, chapterIndex, chapters }) => {
  if (!chapter) return null;

  const steps = chapters.filter((item) => Boolean(item.title?.trim()));
  const currentStep =
    steps.length > 0
      ? Math.min(
          steps.length,
          Math.max(
            1,
            steps.findIndex((item) => item === chapter) + 1
          )
        )
      : 1;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 44,
          width: 520,
          padding: "24px 26px",
          borderRadius: 18,
          backgroundColor: "rgba(2,6,23,0.74)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 20px 46px rgba(0,0,0,0.45)",
          backdropFilter: "blur(8px)",
          color: "#e2e8f0",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(251,191,36,0.94)",
          }}
        >
          Fluxo do usuario
        </p>
        <h3
          style={{
            margin: "8px 0 0",
            fontSize: 34,
            lineHeight: 1.12,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#ffffff",
          }}
        >
          Passo {currentStep}
          {steps.length > 0 ? ` de ${steps.length}` : ""}
        </h3>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 24,
            lineHeight: 1.35,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: "rgba(241,245,249,0.95)",
          }}
        >
          {chapter.title || "Navegacao do sistema"}
        </p>
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 20,
            lineHeight: 1.42,
            color: "rgba(226,232,240,0.9)",
          }}
        >
          {chapter.subtitle ||
            "A tela exibe a etapa atual do processo para o usuario."}
        </p>
        {steps.length > 1 ? (
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            Proximo:{" "}
            {steps[Math.min(steps.length - 1, chapterIndex + 1)]?.title ??
              "Encerramento da jornada"}
          </p>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const SyntheticCursorLayer: FC<{
  contentFrame: number;
  width: number;
  height: number;
  fps: number;
  cursorHints?: CursorHintRecord[];
  cursorVisibleSecondsBeforeClick: number;
}> = ({
  contentFrame,
  width,
  height,
  fps,
  cursorHints,
  cursorVisibleSecondsBeforeClick,
}) => {
  const {
    visible,
    xPct,
    yPct,
    labelOpacity: labelOp,
    labelText,
  } = syntheticCursorNearClickState(
    cursorHints,
    contentFrame,
    fps,
    cursorVisibleSecondsBeforeClick
  );

  if (!visible) return null;

  const left = (xPct / 100) * width;
  const top = (yPct / 100) * height;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={28}
        height={28}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left,
          top,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
        }}
      >
        <path
          d="M4 2 L4 18 L9 14 L13 22 L15 21 L11 13 L18 13 Z"
          fill="white"
          stroke="#1f2937"
          strokeWidth={1.2}
        />
      </svg>
      {labelOp > 0.04 && labelText ? (
        <div
          style={{
            position: "absolute",
            left: left + 22,
            top: top + 18,
            maxWidth: 440,
            padding: "10px 14px",
            borderRadius: 12,
            backgroundColor: "rgba(15,23,42,0.92)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
            opacity: labelOp,
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
            fontSize: 20,
            fontWeight: 600,
            color: "#f8fafc",
            letterSpacing: "-0.02em",
          }}
        >
          Clicar: {labelText}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Showcase: intro branca + logo, captura sem zoom, card de fluxo no canto superior direito,
 * cursor só perto dos cliques, fades e dip entre capítulos.
 */
export const SaasShowcase: FC<SaasShowcaseProps> = ({
  frameCount,
  width,
  height,
  chapters,
  blackIntroFrames = 72,
  cursorHints,
  cursorVisibleSecondsBeforeClick = 1,
  syntheticCursor = true,
  fadeInFrames = 18,
  fadeOutFrames = 22,
  chapterDipFrames = 5,
  chapterDipMaxOpacity = 0.18,
}) => {
  const absFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inIntro = absFrame < blackIntroFrames;
  const cf = inIntro ? 0 : absFrame - blackIntroFrames;
  const idx = Math.min(Math.max(0, cf), Math.max(0, frameCount - 1));
  const src = staticFile(staticCapturePathForFrame(idx));

  const ch = chapterAtFrame(chapters, cf);
  const chapterIndex = ch ? Math.max(0, chapters.findIndex((item) => item === ch)) : 0;

  const fadeInEnd = Math.max(1, fadeInFrames - 1);
  const globalFadeIn = interpolate(cf, [0, fadeInEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lastContentFrame = Math.max(0, frameCount - 1);
  const fadeOutStart = Math.max(0, frameCount - fadeOutFrames);
  const globalFadeOut =
    lastContentFrame > fadeOutStart
      ? interpolate(
          cf,
          [fadeOutStart, lastContentFrame],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        )
      : 0;
  const globalFadeOpacity =
    !inIntro && cf < fadeInFrames
      ? globalFadeIn
      : !inIntro && cf >= frameCount - fadeOutFrames
        ? globalFadeOut
        : 0;

  const dipOpacity = inIntro
    ? 0
    : chapterTransitionDipOpacity(chapters, cf, chapterDipFrames, chapterDipMaxOpacity);

  return (
    <AbsoluteFill style={{ backgroundColor: inIntro ? "#ffffff" : "#000000" }}>
      {inIntro ? (
        <LogoIntroLayer
          absFrame={absFrame}
          blackIntroFrames={blackIntroFrames}
          fps={fps}
          compositionWidth={width}
        />
      ) : null}

      {!inIntro ? (
        <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#030712" }}>
          <Img
            src={src}
            style={{
              width,
              height,
              objectFit: "cover",
              objectPosition: "50% 50%",
              imageRendering: "high-quality",
            }}
          />
        </AbsoluteFill>
      ) : null}

      {dipOpacity > 0.005 && !inIntro ? (
        <AbsoluteFill
          style={{
            backgroundColor: `rgba(0,0,0,${dipOpacity})`,
            pointerEvents: "none",
          }}
        />
      ) : null}

      {!inIntro ? (
        <FlowGuideLayer chapter={ch} chapterIndex={chapterIndex} chapters={chapters} />
      ) : null}

      {!inIntro && syntheticCursor ? (
        <SyntheticCursorLayer
          contentFrame={cf}
          width={width}
          height={height}
          fps={fps}
          cursorHints={cursorHints}
          cursorVisibleSecondsBeforeClick={cursorVisibleSecondsBeforeClick}
        />
      ) : null}

      {!inIntro && globalFadeOpacity > 0.005 ? (
        <AbsoluteFill
          style={{
            backgroundColor: "black",
            opacity: globalFadeOpacity,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
