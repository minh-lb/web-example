import { expect, test } from "@playwright/test";
import { loginAs, getToast } from "./helpers";
import { createBooking, dateAfter, getServiceId, makeBookingPayload, uniqueToken } from "./test-data";

test("admin can edit an existing customer and see the changes on their booking", async ({ page }) => {
  await loginAs(page, "admin");
  const token = uniqueToken();
  const serviceId = await getServiceId(page);
  const payload = makeBookingPayload(serviceId, { date: dateAfter(310), customerName: "Customer " + token });
  const booking = await createBooking(page, payload);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Customers" }).click();
  await page.getByPlaceholder("Search customers...").fill(payload.customerEmail);
  const row = page.getByRole("row").filter({ hasText: payload.customerEmail });
  await expect(row).toContainText(payload.customerName);
  await row.getByRole("button", { name: "Edit " + payload.customerName }).click();
  const dialog = page.getByRole("dialog", { name: "Edit customer" });
  await expect(dialog.getByLabel("Email")).toHaveValue(payload.customerEmail);
  const updatedName = "Updated " + token;
  const updatedEmail = "updated-" + token.toLowerCase() + "@example.com";
  await dialog.getByLabel("Name", { exact: true }).fill(updatedName);
  await dialog.getByLabel("Email").fill(updatedEmail);
  await dialog.getByLabel("Phone").fill("0912345678");
  await dialog.getByRole("button", { name: "Save customer" }).click();
  await expect(getToast(page, "Customer updated")).toBeVisible();
  await page.getByPlaceholder("Search customers...").fill(updatedEmail);
  await expect(page.getByRole("row").filter({ hasText: updatedEmail })).toContainText(updatedName);
  await page.reload();
  await page.getByPlaceholder("Search customers...").fill(updatedEmail);
  await expect(page.getByRole("row").filter({ hasText: updatedEmail })).toContainText("0912345678");
  await page.goto("/bookings");
  await page.getByPlaceholder("Search bookings...").fill(booking.reference);
  const bookingRow = page.getByRole("row").filter({ hasText: booking.reference });
  await expect(bookingRow).toContainText(updatedName);
  await expect(bookingRow).toContainText(updatedEmail);
  const detail = await page.request.get("/api/bookings/" + booking.id);
  expect(detail.status()).toBe(200);
  expect((await detail.json()).customer).toMatchObject({ name: updatedName, email: updatedEmail, phone: "0912345678" });
});

test("staff cannot open customer directory or call its endpoints", async ({ page }) => {
  await loginAs(page, "staff");
  await expect(page.getByRole("navigation").getByRole("link", { name: "Customers" })).toHaveCount(0);
  await page.goto("/customers");
  await expect(page).toHaveURL(/\/dashboard$/);
  expect((await page.request.get("/api/customers")).status()).toBe(403);
  expect((await page.request.get("/api/customers/1")).status()).toBe(403);
  expect((await page.request.patch("/api/customers/1", { data: { name: "Unauthorized" } })).status()).toBe(403);
});

test("anonymous customer requests are rejected", async ({ page }) => {
  expect((await page.request.get("/api/customers")).status()).toBe(401);
  expect((await page.request.get("/api/customers/1")).status()).toBe(401);
  expect((await page.request.patch("/api/customers/1", { data: { name: "Unauthorized" } })).status()).toBe(401);
});
