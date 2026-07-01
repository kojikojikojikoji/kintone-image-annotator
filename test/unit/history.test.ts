import { describe, expect, it } from "vitest";
import { HistoryStack } from "../../src/core/history";

describe("HistoryStack", () => {
  it("TC-11: keeps 50 undo steps and drops the oldest", () => {
    const h = new HistoryStack<number>(0); // present = 0
    for (let i = 1; i <= 51; i += 1) h.push(i); // push states 1..51
    let undos = 0;
    while (h.undo() !== null) undos += 1;
    expect(undos).toBe(50); // only 50 steps back
    expect(h.current()).toBe(1); // state 0 was discarded
  });

  it("TC-12: undo twice, redo once, then a new push clears redo", () => {
    const h = new HistoryStack<string>("s0");
    h.push("s1");
    h.push("s2");
    expect(h.undo()).toBe("s1");
    expect(h.undo()).toBe("s0");
    expect(h.redo()).toBe("s1");
    expect(h.canRedo()).toBe(true);
    h.push("s9"); // new work clears redo history
    expect(h.canRedo()).toBe(false);
    expect(h.current()).toBe("s9");
  });
});
