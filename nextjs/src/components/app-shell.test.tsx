import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("next-auth/react", () => ({ signOut: () => Promise.resolve() }));
import { AppShell } from "./app-shell";
describe("AppShell", () => {
  it("renders a staff navigation without admin links", () => {
    const html = renderToStaticMarkup(createElement(AppShell, {
      user: { email: "staff@bookly.local", role: "staff", name: "Staff Example" },
      children: createElement("span", null, "Workspace"),
    }));
    expect(html).toContain("Workspace");
    expect(html).toContain("Dashboard");
    expect(html).not.toContain("Job queue");
    expect(html).not.toContain("Customers");
    expect(html).not.toContain("Audit logs");
  });
  it("renders customer navigation for admins", () => {
    const html = renderToStaticMarkup(createElement(AppShell, {
      user: { email: "admin@bookly.local", role: "admin", name: "Admin Example" },
      children: createElement("span", null, "Workspace"),
    }));
    expect(html).toContain('href="/customers"');
    expect(html).toContain('href="/audit-logs"');
  });
});
