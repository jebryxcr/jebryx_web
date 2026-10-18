import { test, expect } from "@playwright/test";
import { chooseSelectOption, profileA, ready, setup } from "./fixtures";

test.use({ timezoneId: "America/Costa_Rica" });

test("Select2 searches inside the transaction dialog and keeps linked account and currency", async ({
  page,
}) => {
  const { errors } = await setup(page);
  await ready(page, "/agregar");
  const dialog = page.getByRole("dialog");
  const category = dialog.getByRole("combobox", {
    name: "Categoría",
    exact: true,
  });
  await category.click();
  const search = dialog.getByRole("searchbox", { name: "Buscar opciones" });
  await expect(search).toBeFocused();
  await search.fill("No existe esta categoria");
  await expect(dialog.getByText("No se encontraron resultados")).toBeVisible();
  await search.fill("comi");
  await dialog.getByRole("option", { name: "Comida", exact: true }).click();
  await expect(category).toContainText("Comida");
  await expect(
    dialog.getByRole("combobox", { name: "Cuenta", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(
    dialog.getByRole("combobox", { name: "Moneda", exact: true }),
  ).toContainText("Colón");
  await category.click();
  await dialog
    .getByRole("searchbox", { name: "Buscar opciones" })
    .press("Escape");
  await expect(dialog).toBeVisible();
  await expect(category).toHaveAttribute("aria-expanded", "false");
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("numeric keypad and account mode create income with the existing API contract", async ({
  page,
}) => {
  const { calls, errors } = await setup(page);
  await ready(page, "/agregar");
  const dialog = page.getByRole("dialog");
  const keypad = dialog.getByLabel("Teclado numérico");
  await keypad.getByRole("button", { name: "1", exact: true }).click();
  await keypad.getByRole("button", { name: "2", exact: true }).click();
  await keypad
    .getByRole("button", { name: "Separador decimal", exact: true })
    .click();
  await keypad.getByRole("button", { name: "5", exact: true }).click();
  await expect(dialog.getByLabel("Monto", { exact: true })).toHaveValue("12.5");
  await keypad.getByRole("button", { name: "Borrar último dígito" }).click();
  await keypad.getByRole("button", { name: "9", exact: true }).click();
  await expect(dialog.getByLabel("Monto", { exact: true })).toHaveValue("12.9");
  await dialog
    .getByRole("button", { name: "Directo a cuenta", exact: true })
    .click();
  await expect(
    dialog.getByRole("combobox", { name: "Categoría", exact: true }),
  ).toHaveCount(0);
  await chooseSelectOption(dialog.getByLabel("Cuenta", { exact: true }), "1");
  await dialog.getByRole("button", { name: "Ingreso", exact: true }).click();
  await dialog.getByLabel("Descripción (opcional)").fill("Ingreso con teclado");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(
    calls.find((call) => call.path === "movimientos" && call.method === "POST")
      ?.body,
  ).toEqual({
    tipo: "ingreso",
    monto: "12.9",
    moneda_id: "crc1",
    categoria_id: null,
    cuenta_id: "1",
    descripcion: "Ingreso con teclado",
  });
  expect(errors).toEqual([]);
});

test("history groups calendar dates locally and summaries keep currencies separate", async ({
  page,
}) => {
  await setup(page);
  await page.clock.setFixedTime(new Date("2026-10-18T12:00:00-06:00"));
  const base = {
    profile_id: profileA,
    cuenta_id: "1",
    categoria_id: "cat1",
    cuenta: { id: "1", nombre: "Banco principal" },
    categoria: { id: "cat1", nombre: "Comida", icono: "utensils" },
  };
  const crc = { id: "crc1", nombre: "Colón", simbolo: "₡" };
  const usd = { id: "usd1", nombre: "Dólar", simbolo: "$" };
  const movements = [
    {
      ...base,
      id: "expense-crc",
      tipo: "gasto",
      monto: "2500",
      moneda_id: "crc1",
      moneda: crc,
      fecha: "2026-10-18",
      descripcion: "Almuerzo",
    },
    {
      ...base,
      id: "income-crc",
      tipo: "ingreso",
      monto: "10000",
      moneda_id: "crc1",
      moneda: crc,
      fecha: "2026-10-18",
      descripcion: "Trabajo",
    },
    {
      ...base,
      id: "expense-usd",
      tipo: "gasto",
      monto: "20",
      moneda_id: "usd1",
      moneda: usd,
      fecha: "2026-10-18T01:30:00Z",
      descripcion: "Compra nocturna",
    },
  ];
  await page.route("**/api/v1/movimientos?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          movimientos: movements,
          meta: { total: 3, has_next: false, current_page: 1, limit: 25 },
        },
      }),
    }),
  );
  await ready(page, "/movimientos");
  await expect(page.locator(".movement-day")).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "Hoy", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ayer", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".movement-stat.balance .movement-stat-values strong"),
  ).toHaveText(["₡ 7 500,00", "$ -20,00"]);
  await expect(
    page.locator(".movement-stat.expense .movement-stat-values strong"),
  ).toHaveText(["₡ 2 500,00", "$ 20,00"]);
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await chooseSelectOption(page.getByLabel("Moneda", { exact: true }), "usd1");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByText("Compra nocturna", { exact: true }),
  ).toBeVisible();
});
