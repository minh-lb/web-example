import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomersManager } from "./customers-manager";

describe("CustomersManager", () => {
  it("renders customer search and loading state", () => {
    const html = renderToStaticMarkup(createElement(CustomersManager));
    expect(html).toContain("Search customers");
    expect(html).toContain("Loading customers");
  });
});
