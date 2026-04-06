import type { FC } from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { staticCapturePathForFrame } from "./framePaths";

export type SaasCaptureProps = {
  frameCount: number;
  width: number;
  height: number;
};

export const SaasCapture: FC<SaasCaptureProps> = ({
  frameCount,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const idx = Math.min(Math.max(0, frame), Math.max(0, frameCount - 1));
  const src = staticFile(staticCapturePathForFrame(idx));

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <Img
        src={src}
        style={{
          width,
          height,
          objectFit: "contain",
        }}
      />
    </AbsoluteFill>
  );
};
