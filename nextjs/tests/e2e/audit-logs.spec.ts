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
  const message = `Queued job #${job.id}`;
  const row = page.getByRole("row").filter({has:page.getByText(message,{exact:true})});
  await expect(row.getByRole("cell",{name:/^success$/i})).toBeVisible();
  const view = row.getByRole("button",{name:`View event details: ${message}`});
  await view.click();
  const dialog = page.getByRole("dialog",{name:"Event details"});
  await expect(dialog.getByText(message,{exact:true})).toBeVisible();
  await expect(dialog.getByText("EnqueueJob",{exact:true})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(view).toBeFocused();
  await view.click();
  await dialog.getByRole("button",{name:"Close",exact:true}).click();
  await expect(dialog).toBeHidden();
});
test("staff cannot access the audit page or API",async ({page})=>{
  await loginAs(page,"staff");
  await expect(page.getByRole("link",{name:"Audit logs"})).toHaveCount(0);
  expect((await page.request.get("/api/audit-logs")).status()).toBe(403);
  await page.goto("/audit-logs");
  await expect(page).toHaveURL(/\/dashboard/);
});
