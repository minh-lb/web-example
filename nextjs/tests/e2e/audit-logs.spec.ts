import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test("admin can inspect and filter persisted audit events", async ({page}) => {
  await loginAs(page,"admin");
  const created = await page.request.post("/api/queue",{data:{scenario:"success"}});
  expect(created.status()).toBe(201);
  const job = await created.json();
  await expect.poll(async()=>{
    const response = await page.request.get('/api/audit-logs?eventName=EnqueueJob');
    if (!response.ok()) return false;
    const data = await response.json();
    return data.items.some((event:{resourceId:number})=>event.resourceId===job.id);
  }).toBe(true);
  await page.getByRole("link",{name:"Audit logs"}).click();
  await expect(page).toHaveURL(/\/audit-logs/);
  await page.getByLabel("Event name").fill("EnqueueJob");
  await page.getByLabel("Outcome").selectOption("SUCCESS");
  await page.getByRole("button",{name:"Apply filters"}).click();
  const row = page.getByRole("row").filter({hasText:"EnqueueJob"}).filter({has:page.getByRole("cell",{name:String(job.id),exact:true})});
  await expect(row).toHaveCount(1);
  await row.getByRole("button",{name:/View event/}).click();
  await expect(page.getByRole("region",{name:"Event details"})).toContainText('"eventName": "EnqueueJob"');
});
test("staff cannot access the audit page or API",async ({page})=>{
  await loginAs(page,"staff");
  await expect(page.getByRole("link",{name:"Audit logs"})).toHaveCount(0);
  expect((await page.request.get("/api/audit-logs")).status()).toBe(403);
  await page.goto("/audit-logs");
  await expect(page).toHaveURL(/\/dashboard/);
});
