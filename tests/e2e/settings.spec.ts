import { test, expect } from "@playwright/test";
import {
  chooseSelectOption,
  profileA,
  profileB,
  ready,
  setup,
} from "./fixtures";

test("appearance previews support keyboard selection, system theme and persistence", async ({
  page,
}) => {
  await setup(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await ready(page, "/ajustes");
  const group = page.getByRole("radiogroup", { name: "Apariencia" });
  await expect(group.getByRole("radio")).toHaveCount(3);
  await expect(
    group.getByRole("radio", { name: "Sistema", exact: true }),
  ).toBeChecked();
  await group.getByRole("radio", { name: "Oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await group
    .getByRole("radio", { name: "Oscuro", exact: true })
    .press("ArrowRight");
  await expect(
    group.getByRole("radio", { name: "Sistema", exact: true }),
  ).toBeChecked();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator(".brand-transition")).toHaveCount(0);
  await expect(
    page.getByRole("radio", { name: "Sistema", exact: true }),
  ).toBeChecked();
});

test("settings switches persist their state and remain isolated by profile", async ({
  page,
}) => {
  await setup(page);
  await ready(page, "/ajustes");
  const warnings = page.getByRole("switch", {
    name: "Advertencias de saldo y presupuesto",
  });
  const nudges = page.getByRole("switch", { name: "Sugerencias del coach" });
  await expect(warnings).toBeChecked();
  await warnings.click();
  await nudges.focus();
  await nudges.press("Space");
  await expect(warnings).not.toBeChecked();
  await expect(nudges).not.toBeChecked();
  await page.reload();
  await expect(page.locator(".brand-transition")).toHaveCount(0);
  await expect(warnings).not.toBeChecked();
  await expect(nudges).not.toBeChecked();
  await chooseSelectOption(page.getByLabel("Perfil activo"), profileB);
  await expect(warnings).toBeChecked();
  await chooseSelectOption(page.getByLabel("Perfil activo"), profileA);
  await expect(warnings).not.toBeChecked();
});
