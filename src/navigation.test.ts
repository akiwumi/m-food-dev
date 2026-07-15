import { describe, expect, it } from "vitest";
import { CORE_NAV_ITEMS } from "./components/AppChrome";
import { MENU_GROUPS } from "./components/MainMenu";

describe("navigation hierarchy", () => {
  it("protects the concept-core nav order", () => {
    expect(CORE_NAV_ITEMS.map(([id]) => id)).toEqual(["home", "search", "community", "favorites", "grocery"]);
  });

  it("moves tool-shed destinations into the More / maturity tier", () => {
    const maturity = MENU_GROUPS.find(group => group.title === "MORE / MATURITY");
    expect(maturity?.items.map(([id]) => id)).toEqual(expect.arrayContaining([
      "planner", "pantry", "import", "health", "insights", "diners", "admin",
    ]));

    const core = MENU_GROUPS.find(group => group.title === "CORE");
    expect(core?.items.map(([id]) => id)).toEqual(["home", "search", "community", "favorites", "grocery"]);
  });
});
