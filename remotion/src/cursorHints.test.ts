import { describe, expect, it } from "vitest";
import {
  activeClickLabelOpacity,
  computeSyntheticCursorPosition,
  smoothstep01,
  syntheticCursorNearClickState,
} from "./cursorHints";

describe("smoothstep01", () => {
  it("interpola entre 0 e 1", () => {
    expect(smoothstep01(0)).toBe(0);
    expect(smoothstep01(1)).toBe(1);
    expect(smoothstep01(0.5)).toBe(0.5);
  });
});

describe("computeSyntheticCursorPosition", () => {
  it("sem hints usa trajetória sinusoidal", () => {
    const p0 = computeSyntheticCursorPosition(undefined, 0, 100);
    const p1 = computeSyntheticCursorPosition([], 50, 100);
    expect(p0.xPct).toBeGreaterThanOrEqual(0);
    expect(p1.yPct).toBeGreaterThanOrEqual(0);
  });

  it("interpola em direcção aos alvos por ordem de atFrame", () => {
    const hints = [
      { atFrame: 10, xPct: 20, yPct: 30, label: "A" },
      { atFrame: 20, xPct: 80, yPct: 60, label: "B" },
    ];
    const mid = computeSyntheticCursorPosition(hints, 15, 50);
    expect(mid.xPct).toBeGreaterThan(20);
    expect(mid.xPct).toBeLessThan(80);
  });

  it("mantém posição do último alvo após o último frame", () => {
    const hints = [{ atFrame: 5, xPct: 42, yPct: 55, label: "X" }];
    const late = computeSyntheticCursorPosition(hints, 999, 1000);
    expect(late.xPct).toBe(42);
    expect(late.yPct).toBe(55);
  });
});

describe("syntheticCursorNearClickState", () => {
  it("sem hints fica invisível", () => {
    expect(syntheticCursorNearClickState(undefined, 0, 18, 1).visible).toBe(
      false
    );
  });

  it("fora da janela (1s antes × fps) fica invisível", () => {
    const hints = [{ atFrame: 50, xPct: 50, yPct: 50, label: "Botão" }];
    expect(syntheticCursorNearClickState(hints, 10, 18, 1).visible).toBe(
      false
    );
  });

  it("visível ~1s antes do atFrame a 18 fps", () => {
    const hints = [{ atFrame: 50, xPct: 50, yPct: 50, label: "Botão" }];
    const edge = syntheticCursorNearClickState(hints, 32, 18, 1);
    expect(edge.visible).toBe(true);
    expect(edge.xPct).toBeGreaterThan(0);
    const mid = syntheticCursorNearClickState(hints, 40, 18, 1);
    expect(mid.labelOpacity).toBeGreaterThan(0);
  });

  it("no atFrame a posição coincide com o alvo", () => {
    const hints = [{ atFrame: 40, xPct: 60, yPct: 40, label: "X" }];
    const st = syntheticCursorNearClickState(hints, 40, 18, 1);
    expect(st.visible).toBe(true);
    expect(st.xPct).toBeCloseTo(60, 5);
    expect(st.yPct).toBeCloseTo(40, 5);
  });
});

describe("activeClickLabelOpacity", () => {
  it("mostra legenda após atFrame e desvanece", () => {
    const hints = [{ atFrame: 10, xPct: 0, yPct: 0, label: "Clicar" }];
    expect(activeClickLabelOpacity(hints, 9).opacity).toBe(0);
    expect(activeClickLabelOpacity(hints, 10).opacity).toBeGreaterThan(0);
    expect(activeClickLabelOpacity(hints, 14).opacity).toBe(1);
    expect(activeClickLabelOpacity(hints, 43).opacity).toBe(0);
  });
});
