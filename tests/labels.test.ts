import { expect, it } from "vitest";
import { stepLabel } from "../src/domain/labels";

it("画面表示用のステップ名", () => {
  expect(stepLabel({ atSec: 0, action: "switchClose", waterG: 150 })).toBe("スイッチを閉じる → 150g");
  expect(stepLabel({ atSec: 0, action: "switchOpen" })).toBe("スイッチを開ける");
  expect(stepLabel({ atSec: 0, action: "finish" })).toBe("完了待ち");
});
