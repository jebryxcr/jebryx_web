import { test, expect } from "@playwright/test";
import { ready, setup } from "./fixtures";

test.use({ timezoneId: "America/Costa_Rica" });

test("date filters use the themed calendar with bounds, navigation and clearing", async ({
  page,
}) => {
  const { errors } = await setup(page);
  await page.clock.setFixedTime(new Date("2026-10-18T12:00:00-06:00"));
  await ready(page, "/movimientos");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir calendario: Desde", exact: true })
    .click();
  const from = page.getByRole("dialog", {
    name: "Calendario: Desde",
    exact: true,
  });
  await expect(from).toBeVisible();
  expect(
    await from.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await expect(from.locator(".rdp-caption_label")).toHaveText("octubre 2026");
  await from
    .locator(".rdp-day:not(.rdp-outside) .rdp-day_button")
    .filter({ hasText: /^10$/ })
    .click();
  await expect(from).not.toBeVisible();
  await expect(page.getByLabel("Desde", { exact: true })).toHaveValue(
    "10/10/2026",
  );
  await page
    .getByRole("button", { name: "Abrir calendario: Hasta", exact: true })
    .click();
  const to = page.getByRole("dialog", {
    name: "Calendario: Hasta",
    exact: true,
  });
  await expect(
    to
      .locator(".rdp-day:not(.rdp-outside) .rdp-day_button")
      .filter({ hasText: /^9$/ }),
  ).toBeDisabled();
  await to.locator(".rdp-button_next").click();
  await expect(to.locator(".rdp-caption_label")).toHaveText("noviembre 2026");
  await to.locator(".rdp-button_previous").click();
  await to
    .locator(".rdp-day:not(.rdp-outside) .rdp-day_button")
    .filter({ hasText: /^20$/ })
    .click();
  await expect(page.getByLabel("Hasta", { exact: true })).toHaveValue(
    "20/10/2026",
  );
  await page
    .getByRole("button", { name: "Abrir calendario: Desde", exact: true })
    .click();
  await expect(
    from
      .locator(".rdp-day:not(.rdp-outside) .rdp-day_button")
      .filter({ hasText: /^21$/ }),
  ).toBeDisabled();
  const rect = await from.boundingBox();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await from.getByRole("button", { name: "Limpiar", exact: true }).click();
  await expect(page.getByLabel("Desde", { exact: true })).toHaveValue("");
  expect(errors).toEqual([]);
});

test("recurring date picker stays above its modal and Escape keeps the form open", async ({
  page,
}) => {
  const { errors } = await setup(page);
  await page.clock.setFixedTime(new Date("2026-10-18T12:00:00-06:00"));
  await ready(page, "/recurrentes");
  await page.getByRole("button", { name: "Nuevo plan", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Nuevo plan", exact: true });
  await form
    .getByRole("button", {
      name: "Abrir calendario: Primer vencimiento",
      exact: true,
    })
    .click();
  const calendar = page.getByRole("dialog", {
    name: "Calendario: Primer vencimiento",
    exact: true,
  });
  await expect(calendar).toBeVisible();
  await calendar
    .locator(".rdp-day:not(.rdp-outside) .rdp-day_button")
    .filter({ hasText: /^25$/ })
    .click();
  await expect(calendar).not.toBeVisible();
  await expect(
    form.getByLabel("Primer vencimiento", { exact: true }),
  ).toHaveValue("25/10/2026");
  await form
    .getByRole("button", {
      name: "Abrir calendario: Primer vencimiento",
      exact: true,
    })
    .click();
  await calendar.locator(".rdp-day_button:focus").press("Escape");
  await expect(calendar).not.toBeVisible();
  await expect(form).toBeVisible();
  await expect(
    form.getByRole("button", {
      name: "Abrir calendario: Primer vencimiento",
      exact: true,
    }),
  ).toBeFocused();
  await form
    .getByLabel("Primer vencimiento", { exact: true })
    .fill("31/02/2026");
  expect(
    await form
      .getByLabel("Primer vencimiento", { exact: true })
      .evaluate((el: HTMLInputElement) => el.validity.valid),
  ).toBe(false);
  expect(errors).toEqual([]);
});
