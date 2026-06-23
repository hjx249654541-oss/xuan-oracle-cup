import { describe, expect, it } from "vitest";
import { getPrimaryActionLabel } from "./uiCopy";

describe("getPrimaryActionLabel", () => {
  it("uses calculation language before a prediction exists", () => {
    expect(getPrimaryActionLabel("beforeResult")).toBe("开始测算");
  });

  it("uses review language after a prediction exists", () => {
    expect(getPrimaryActionLabel("afterResult")).toBe("换法复核");
  });
});
