import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuditLogManager } from "./audit-log-manager";

describe("AuditLogManager", () => {
  it("renders filters and loading state", () => {
    const html = renderToStaticMarkup(createElement(AuditLogManager));
    for (const text of ["Audit logs","Event source","Event name","Actor email","Outcome","From (UTC)","To (UTC)","Apply filters","Loading audit logs"]) expect(html).toContain(text);
    expect(html).toContain("disabled");
  });
});
