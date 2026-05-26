import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

const getCanvasContext = function getContext(contextId: string) {
  if (contextId !== "2d") {
    return null;
  }

  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
    shadowBlur: 0,
    shadowColor: "",
    stroke: vi.fn(),
    translate: vi.fn()
  } as unknown as CanvasRenderingContext2D;
};

HTMLCanvasElement.prototype.getContext = getCanvasContext as typeof HTMLCanvasElement.prototype.getContext;
