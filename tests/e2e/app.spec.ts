import { test, expect } from "@playwright/test";
import { profileA, profileB, ready, setup } from "./fixtures";

test("all sections render with the original branding and fit the viewport", async ({
  page,
}, testInfo) => {
  const { errors } = await setup(page);
  for (const [path, title] of [
    ["/", "Buenas, Bryan"],
    ["/movimientos", "Movimientos"],
    ["/cuentas", "Tus cuentas"],
    ["/categorias", "Categorías"],
    ["/presupuestos", "Presupuestos"],
    ["/recurrentes", "Recurrentes y cuotas"],
    ["/reportes", "Reportes"],
    ["/coach", "Tu coach financiero"],
    ["/coach-usage", "Uso del coach"],
    ["/notificaciones", "Notificaciones"],
    ["/ajustes", "Ajustes"],
  ]) {
    await ready(page, path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    await expect(page.locator(".loading")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      `horizontal overflow on ${path}`,
    ).toBe(true);
    expect(await page.evaluate(() => innerWidth)).toBe(
      page.viewportSize()!.width,
    );
  }
  await expect(page.locator(".sidebar .official-logo")).toHaveAttribute(
    "src",
    "/logo.png",
  );
  await page.screenshot({
    path: testInfo.outputPath("settings.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("creates and edits an expense using its category account, then deletes it", async ({
  page,
}) => {
  const { calls, errors } = await setup(page);
  await ready(page, "/agregar");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Monto", { exact: true }).fill("3000");
  await dialog.getByLabel("Categoría", { exact: true }).selectOption("cat1");
  await expect(dialog.getByLabel("Cuenta", { exact: true })).toBeDisabled();
  await expect(dialog.getByLabel("Moneda", { exact: true })).toHaveValue(
    "crc1",
  );
  await dialog.getByLabel("Descripción (opcional)").fill("Compra de prueba");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByText("Compra de prueba", { exact: true }),
  ).toBeVisible();
  const created = calls.find(
    (c) => c.path === "movimientos" && c.method === "POST",
  );
  expect(created?.body).toMatchObject({
    tipo: "gasto",
    monto: "3000",
    moneda_id: "crc1",
    categoria_id: "cat1",
    cuenta_id: "1",
    descripcion: "Compra de prueba",
  });
  expect(created?.headers["x-profile-id"]).toBe(profileA);
  const row = page.getByRole("row").filter({ hasText: "Compra de prueba" });
  await row.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Monto", { exact: true })
    .fill("3500");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    calls.some(
      (c) =>
        c.method === "PATCH" &&
        c.path === "movimientos/new-movimientos" &&
        c.body.monto === "3500",
    ),
  ).toBe(true);
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.getByText("Compra de prueba", { exact: true })).toHaveCount(
    0,
  );
  expect(errors).toEqual([]);
});

test("creates accounts, linked categories and budgets with the existing API fields", async ({
  page,
}) => {
  const { calls, errors } = await setup(page);
  await ready(page, "/cuentas");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre de la cuenta").fill("Ahorro web");
  await dialog.getByLabel("Saldo", { exact: true }).fill("80000");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ahorro web" })).toBeVisible();
  expect(
    calls.find((c) => c.path === "cuentas" && c.method === "POST")?.body,
  ).toMatchObject({
    nombre: "Ahorro web",
    saldo: "80000",
    color: "CRC",
    icono: "bank",
  });
  await ready(page, "/categorias");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre", { exact: true }).fill("Transporte web");
  await dialog.getByLabel("Cuenta vinculada").selectOption("1");
  await dialog.getByLabel("Icono", { exact: true }).selectOption("car");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Transporte web" }),
  ).toBeVisible();
  expect(
    calls.find((c) => c.path === "categorias" && c.method === "POST")?.body,
  ).toMatchObject({ nombre: "Transporte web", icono: "car", cuenta_id: "1" });
  await ready(page, "/presupuestos");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Categoría", { exact: true }).selectOption("cat1");
  await dialog.getByLabel("Moneda", { exact: true }).selectOption("crc1");
  await dialog.getByLabel("Límite mensual").fill("25000");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(
    calls.find((c) => c.path === "presupuestos" && c.method === "POST")?.body,
  ).toMatchObject({ categoria_id: "cat1", moneda_id: "crc1", monto: "25000" });
  expect(errors).toEqual([]);
});

test("warns before overdrawing a numeric account ID and respects cancellation", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await ready(page, "/agregar");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Monto", { exact: true }).fill("200000");
  await dialog.getByLabel("Categoría", { exact: true }).selectOption("cat1");
  page.once("dialog", async (prompt) => {
    expect(prompt.message()).toContain("saldo negativo");
    await prompt.dismiss();
  });
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toBeVisible();
  expect(
    calls.filter((c) => c.path === "movimientos" && c.method === "POST"),
  ).toHaveLength(0);
});

test("filters and exports transactions across the full API result", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await ready(page, "/movimientos");
  await page
    .getByRole("searchbox", { name: "Buscar movimientos", exact: true })
    .fill("Almuerzo");
  await expect(page.getByText("1 resultados")).toBeVisible();
  expect(calls.some((c) => c.path === "movimientos")).toBe(true);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^jebryx-movimientos-.*\.csv$/);
  await page
    .getByRole("searchbox", { name: "Buscar movimientos", exact: true })
    .fill("No existe");
  await expect(page.getByText("Sin movimientos por aquí")).toBeVisible();
});

test("isolates profile queries and persists language and theme per profile", async ({
  page,
}) => {
  const { calls, errors } = await setup(page);
  await ready(page, "/cuentas");
  await expect(
    page.getByRole("heading", { name: "Banco principal" }),
  ).toBeVisible();
  await page.getByLabel("Perfil activo").selectOption(profileB);
  await expect(
    page.getByRole("heading", { name: "Cuenta negocio" }),
  ).toBeVisible();
  expect(
    calls.some(
      (c) => c.path === "cuentas" && c.headers["x-profile-id"] === profileB,
    ),
  ).toBe(true);
  await ready(page, "/ajustes");
  await page.getByRole("button", { name: "Oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Idioma", { exact: true }).selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Settings", level: 1 }),
  ).toBeVisible();
  await page.getByLabel("Active profile").selectOption(profileA);
  await expect(
    page.getByRole("heading", { name: "Ajustes", level: 1 }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});

test("records recurring payments and pauses plans", async ({ page }) => {
  const { calls } = await setup(page);
  await ready(page, "/recurrentes");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Registrar pago", exact: true })
    .click();
  await expect
    .poll(
      () =>
        calls.filter((c) => c.path === "planes-recurrentes/plan1/pagos").length,
    )
    .toBe(1);
  await page.getByRole("button", { name: "Pausar plan" }).click();
  await expect(
    page.getByRole("button", { name: "Registrar pago", exact: true }),
  ).toBeDisabled();
  expect(
    calls.find(
      (c) => c.path === "planes-recurrentes/plan1" && c.method === "PATCH",
    )?.body,
  ).toEqual({ active: false });
});

test("generates AI reports explicitly and only completes actions after creating the resource", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await ready(page, "/reportes");
  expect(calls.some((c) => c.path === "reportes/resumen-ia")).toBe(false);
  await page
    .getByRole("button", { name: "Generar resumen", exact: true })
    .click();
  await expect(page.getByText("Buen progreso.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Revisar y aplicar" }).click();
  expect(
    calls.some(
      (c) => c.path === "reportes/acciones/action1" && c.method === "PATCH",
    ),
  ).toBe(false);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Moneda", { exact: true }).selectOption("crc1");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Aplicada", { exact: true })).toBeVisible();
  const createIndex = calls.findIndex(
    (c) => c.path === "presupuestos" && c.method === "POST",
  );
  const completeIndex = calls.findIndex(
    (c) => c.path === "reportes/acciones/action1" && c.method === "PATCH",
  );
  expect(createIndex).toBeGreaterThan(-1);
  expect(completeIndex).toBeGreaterThan(createIndex);
  expect(calls[completeIndex].body).toEqual({
    status: "completed",
    created_resource_id: "new-presupuestos",
  });
});

test("streams real coach protocol and sends the selected backend model", async ({
  page,
}) => {
  const { calls, errors } = await setup(page);
  await ready(page, "/coach");
  await page
    .getByLabel("Modelo del coach", { exact: true })
    .selectOption("destello");
  await page
    .getByLabel("Mensaje para el coach")
    .fill("Ayúdame con mi presupuesto");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(
    page.getByText("Podemos revisar tu", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".chat-message.assistant strong")).toHaveText(
    "presupuesto",
  );
  const send = calls.find((c) => c.path.endsWith("/messages"));
  expect(send?.body).toEqual({
    message: "Ayúdame con mi presupuesto",
    model: "openai/gpt-oss-20b",
  });
  expect(send?.headers["accept"]).toBe("text/event-stream");
  expect(send?.headers["x-timezone"]).toBeTruthy();
  await expect(page.getByText("Mi presupuesto", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("marks notifications read and removes them", async ({ page }) => {
  const { calls } = await setup(page);
  await ready(page, "/notificaciones");
  await page.getByRole("button", { name: "Marcar todo como leído" }).click();
  await expect(
    page.getByRole("button", { name: "Marcar todo como leído" }),
  ).toBeDisabled();
  expect(
    calls.find((c) => c.path === "notificaciones/n1" && c.method === "PATCH")
      ?.body,
  ).toEqual({ leida: true });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Eliminar notificación" }).click();
  await expect(page.getByText("Todo al día", { exact: true })).toBeVisible();
});

test("creates financial profiles without sending X-Profile-Id", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await ready(page, "/ajustes");
  await page.getByRole("button", { name: "Crear perfil", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre del perfil").fill("Familia");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("button", { name: /Familia/ })).toBeVisible();
  const call = calls.find((c) => c.path === "profiles" && c.method === "POST");
  expect(call?.body.name).toBe("Familia");
  expect(call?.headers).not.toHaveProperty("x-profile-id");
  await expect(
    page.getByRole("button", { name: "Crear perfil", exact: true }),
  ).toBeDisabled();
});

test("expires sessions on protected 401 responses", async ({ page }) => {
  await setup(page);
  await page.route("**/api/v1/cuentas*", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: '{"message":"Token expirado"}',
    }),
  );
  await ready(page, "/cuentas");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Qué bueno verte de nuevo." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("jebryx.web.session")!).state.session,
    ),
  ).toBeNull();
});
