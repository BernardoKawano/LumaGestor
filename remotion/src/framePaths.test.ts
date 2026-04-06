import { describe, expect, it } from "vitest";
import {
  countFramePngs,
  frameFileNameForFrame,
  parseFrameIndexFromFileName,
  staticCapturePathForFrame,
} from "./framePaths";

describe("frameFileNameForFrame", () => {
  it("gera frame-000001.png para o índice 0", () => {
    expect(frameFileNameForFrame(0)).toBe("frame-000001.png");
  });

  it("gera padding de 6 dígitos", () => {
    expect(frameFileNameForFrame(41)).toBe("frame-000042.png");
  });

  it("rejeita índices inválidos", () => {
    expect(() => frameFileNameForFrame(-1)).toThrow(RangeError);
    expect(() => frameFileNameForFrame(1.5)).toThrow(RangeError);
  });
});

describe("staticCapturePathForFrame", () => {
  it("prefixa captures/", () => {
    expect(staticCapturePathForFrame(0)).toBe("captures/frame-000001.png");
  });
});

describe("parseFrameIndexFromFileName", () => {
  it("extrai o índice 0-based", () => {
    expect(parseFrameIndexFromFileName("frame-000001.png")).toBe(0);
    expect(parseFrameIndexFromFileName("frame-000012.png")).toBe(11);
  });

  it("devolve -1 para nomes inválidos", () => {
    expect(parseFrameIndexFromFileName("other.png")).toBe(-1);
    expect(parseFrameIndexFromFileName("frame-.png")).toBe(-1);
  });
});

describe("countFramePngs", () => {
  it("conta apenas nomes no padrão frame-NNNNNN.png", () => {
    expect(
      countFramePngs([
        "frame-000001.png",
        "meta.json",
        "frame-000002.png",
        "readme.txt",
      ])
    ).toBe(2);
  });
});
