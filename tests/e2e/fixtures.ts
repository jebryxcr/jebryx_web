import { type Page, type Locator, expect } from "@playwright/test";
export const profileA = "11111111-1111-4111-8111-111111111111";
export const profileB = "22222222-2222-4222-8222-222222222222";
const token = `e30.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString("base64url")}.signature`;
export const session = {
  token,
  user: {
    id: "user1",
    name: "Bryan Test",
    email: "test@example.com",
    email_verified_at: "2026-01-01",
    created: "2026-01-01",
  },
  profiles: [
    {
      id: profileA,
      name: "Personal",
      color: "#0f6e56",
      avatar: "avatar-01-corto.svg",
      is_default: true,
    },
    {
      id: profileB,
      name: "Negocio",
      color: "#3e6bb8",
      avatar: null,
      is_default: false,
    },
  ],
  active_profile_id: profileA,
};
export type Call = {
  path: string;
  method: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
};
export async function setup(page: Page, authenticated = true) {
  const calls: Call[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    ({ session, authenticated }) => {
      if (authenticated && !localStorage.getItem("jebryx.web.session"))
        localStorage.setItem(
          "jebryx.web.session",
          JSON.stringify({ state: { session }, version: 1 }),
        );
      if (!localStorage.getItem("jebryx.web.preferences"))
        localStorage.setItem(
          "jebryx.web.preferences",
          JSON.stringify({
            state: {
              values: {
                global: {
                  theme: "light",
                  language: "es",
                  coachModel: "sabio",
                  budgetAlerts: true,
                  coachNudges: true,
                },
              },
            },
            version: 0,
          }),
        );
    },
    { session, authenticated },
  );
  const accounts = [
    {
      id: 1,
      profile_id: profileA,
      nombre: "Banco principal",
      color: "CRC",
      icono: "bank",
      saldo: "100000",
      alias: null,
      digits: "1234",
      hex_color: "#0f6e56",
      fav: true,
      archivada: false,
    },
  ];
  const categories = [
    {
      id: "cat1",
      profile_id: profileA,
      nombre: "Comida",
      color: "#0f6e56",
      icono: "utensils",
      cuenta_id: "1",
      cuenta: { id: "1", nombre: "Banco principal" },
    },
  ];
  const currencies = [
    { id: "crc1", nombre: "Colón", simbolo: "₡" },
    { id: "usd1", nombre: "Dólar", simbolo: "$" },
  ];
  const movements = [
    {
      id: "mov1",
      profile_id: profileA,
      tipo: "gasto",
      monto: "2500",
      moneda_id: "crc1",
      categoria_id: "cat1",
      cuenta_id: "1",
      descripcion: "Almuerzo",
      fecha: "2026-10-18",
      moneda: currencies[0],
      categoria: categories[0],
      cuenta: accounts[0],
    },
  ];
  const budgets = [
    {
      id: "budget1",
      categoria_id: "cat1",
      moneda_id: "crc1",
      monto: "50000",
      icono: "utensils",
      gastado: 2500,
      disponible: 47500,
      porcentaje_usado: 5,
      categoria: categories[0],
      moneda: currencies[0],
    },
  ];
  const plans = [
    {
      id: "plan1",
      name: "Internet",
      kind: "recurring",
      frequency: "monthly",
      startDate: "2026-10-20",
      amount: "20000",
      currencyId: "crc1",
      accountId: "1",
      categoryId: "cat1",
      totalInstallments: null,
      paidCount: 0,
      active: true,
      createdAt: "2026-10-01",
    },
  ];
  const notifications = [
    {
      id: "n1",
      profile_id: profileA,
      titulo: "Presupuesto actualizado",
      descripcion: "Tus cambios están guardados.",
      fecha: "2026-10-18",
      icono: "wallet",
      leida: false,
    },
  ];
  let profiles = structuredClone(session.profiles);
  const conversations: {
    id: string;
    title: string;
    created: string;
    modified: string;
  }[] = [];
  const messages: Record<string, unknown>[] = [];
  const reportActions = [
    {
      id: "action1",
      type: "create_budget",
      title: "Crea un presupuesto",
      body: "Revisa el monto sugerido.",
      status: "pending",
      params: { categoria_id: "cat1", sugerido_monto: "30000" },
    },
  ];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1/", "");
    const method = request.method();
    const body = request.postDataJSON() || {};
    calls.push({ path, method, body, headers: request.headers() });
    const fulfill = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ data }),
      });
    if (path.startsWith("auth/")) {
      if (["auth/login", "auth/google", "auth/verify"].includes(path))
        return fulfill(session);
      return fulfill({
        email: body.email,
        requires_verification: true,
        valid: true,
        message: "OK",
      });
    }
    const active = request.headers()["x-profile-id"];
    if (!path.startsWith("profiles") && path !== "monedas")
      expect(active).toBeTruthy();
    expect(request.headers()["authorization"]).toBe(`Bearer ${token}`);
    if (path === "monedas") return fulfill({ monedas: currencies });
    if (path === "movimientos/resumen-saldo")
      return fulfill({
        moneda: currencies[0],
        saldo: active === profileB ? "500000" : "100000",
        ingresos_mes: "120000",
        gastos_mes: "20000",
        variacion_pct: 10,
        tiene_movimientos: true,
        onboarding: { completado_pct: 100 },
      });
    if (path === "movimientos/resumen-categorias")
      return fulfill({
        month: "2026-10",
        monedas: [
          {
            moneda: currencies[0],
            total: "2500",
            categorias: [
              {
                categoria_id: "cat1",
                nombre: "Comida",
                icono: "utensils",
                total: "2500",
              },
            ],
          },
        ],
      });
    if (path === "onboarding/status")
      return fulfill({
        done_acct: true,
        done_cat: true,
        done_ing: true,
        dismissed: true,
      });
    if (path === "onboarding/dismiss") return fulfill({ dismissed: true });
    if (path === "profiles" && method === "GET") return fulfill({ profiles });
    if (path === "profiles" && method === "POST") {
      const profile = {
        id: "profile3",
        name: String(body.name),
        color: String(body.color),
        avatar: body.avatar as string | null,
        is_default: false,
      };
      profiles.push(profile);
      return fulfill({ profile }, 201);
    }
    if (path.startsWith("profiles/")) {
      const id = path.split("/")[1];
      if (method === "DELETE") profiles = profiles.filter((p) => p.id !== id);
      if (path.endsWith("set-default"))
        profiles = profiles.map((p) => ({ ...p, is_default: p.id === id }));
      else if (method === "PATCH")
        profiles = profiles.map((p) =>
          p.id === id ? ({ ...p, ...body } as typeof p) : p,
        );
      return fulfill({
        profile: profiles.find((p) => p.id === id),
        deleted: true,
      });
    }
    if (path === "reportes/resumen")
      return fulfill({
        moneda: currencies[0],
        ingresos_total: "120000",
        egresos_total: "20000",
        balance_neto: "100000",
        tasa_ahorro_pct: 83.3,
      });
    if (path === "reportes/serie")
      return fulfill({
        moneda: currencies[0],
        buckets: [
          { label: "Sem 1", ingresos: "70000", egresos: "5000" },
          { label: "Sem 2", ingresos: "50000", egresos: "15000" },
        ],
      });
    if (path === "reportes/categorias")
      return fulfill({
        moneda: currencies[0],
        total: "2500",
        categorias: [
          { categoria_id: "cat1", nombre: "Comida", monto: "2500", pct: 100 },
        ],
      });
    if (path === "reportes/resumen-ia")
      return fulfill({
        summary: "Tus ingresos superan tus gastos. **Buen progreso.**",
        generated_at: "2026-10-18",
      });
    if (path === "reportes/acciones")
      return fulfill({ acciones: reportActions });
    if (path.startsWith("reportes/acciones/")) {
      reportActions[0].status = String(body.status);
      return fulfill({ accion: reportActions[0] });
    }
    if (path === "coach/usage")
      return fulfill({
        usage: {
          today: {
            date: "2026-10-18",
            messages: 2,
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300,
          },
          daily: [
            {
              date: "2026-10-18",
              messages: 2,
              prompt_tokens: 100,
              completion_tokens: 200,
              total_tokens: 300,
            },
          ],
          models: {
            sabio: { messages: 2, total_tokens: 300 },
            destello: { messages: 0, total_tokens: 0 },
          },
          total: {
            messages: 2,
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300,
            active_time: 120,
            active_days: 1,
          },
        },
      });
    if (path === "coach/conversations" && method === "GET")
      return fulfill({ conversations });
    if (path === "coach/conversations" && method === "POST") {
      const conversation = {
        id: "conv1",
        title: "Mi presupuesto",
        created: "2026-10-18",
        modified: "2026-10-18",
      };
      conversations.push(conversation);
      return fulfill({ conversation }, 201);
    }
    if (path.endsWith("/messages")) {
      const message = {
        id: `msg${messages.length}`,
        role: "user",
        content: body.message,
        actions: [],
        suggestions: [],
        created: "2026-10-18",
        model: null,
        prompt_tokens: null,
        completion_tokens: null,
      };
      const reply = {
        ...message,
        id: `reply${messages.length}`,
        role: "assistant",
        content: "Podemos revisar tu **presupuesto** juntos.",
      };
      messages.push(message, reply);
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `event: start\ndata: {}\n\nevent: delta\ndata: {"text":"Podemos revisar tu "}\n\nevent: delta\ndata: {"text":"**presupuesto** juntos."}\n\nevent: done\ndata: ${JSON.stringify({ conversation: conversations[0], message, reply })}\n\n`,
      });
    }
    if (path.startsWith("coach/conversations/")) {
      if (method === "DELETE") {
        conversations.splice(0);
        return fulfill({ deleted: true });
      }
      return fulfill({ conversation: { ...conversations[0], messages } });
    }
    if (path.startsWith("planes-recurrentes/") && path.endsWith("/pagos")) {
      plans[0].paidCount += 1;
      return fulfill({ plan: plans[0], movementId: "payment1" });
    }
    const resources = {
      cuentas: { rows: accounts, one: "cuenta" },
      categorias: { rows: categories, one: "categoria" },
      presupuestos: { rows: budgets, one: "presupuesto" },
      movimientos: { rows: movements, one: "movimiento" },
      "planes-recurrentes": { rows: plans, one: "plan" },
      notificaciones: { rows: notifications, one: "notificacion" },
    };
    const resourceName = path.split("/")[0] as keyof typeof resources;
    const resource = resources[resourceName];
    if (resource) {
      const rows = resource.rows as Record<string, unknown>[];
      const id = path.split("/")[1];
      if (method === "GET")
        return fulfill({
          [resourceName === "planes-recurrentes" ? "plans" : resourceName]:
            active === profileB && resourceName === "cuentas"
              ? [{ ...accounts[0], id: 2, nombre: "Cuenta negocio" }]
              : rows,
          ...(resourceName === "movimientos"
            ? {
                meta: {
                  current_page: 1,
                  limit: 25,
                  total: rows.length,
                  has_next: false,
                },
              }
            : {}),
        });
      if (method === "POST") {
        const row = {
          id: `new-${resourceName}`,
          ...body,
          ...(resourceName === "movimientos"
            ? {
                moneda: currencies[0],
                cuenta: accounts[0],
                categoria: categories[0],
                fecha: "2026-10-18",
              }
            : {}),
          ...(resourceName === "presupuestos"
            ? { categoria: categories[0], moneda: currencies[0], gastado: 0 }
            : {}),
        };
        rows.push(row);
        return fulfill({ [resource.one]: row }, 201);
      }
      const index = rows.findIndex((r) => String(r.id) === id);
      if (method === "DELETE") {
        if (index >= 0) rows.splice(index, 1);
        return fulfill({ deleted: true });
      }
      if (index >= 0) rows[index] = { ...rows[index], ...body };
      return fulfill({ [resource.one]: rows[index] });
    }
    throw new Error(`Unexpected API route: ${method} ${path}`);
  });
  return { calls, errors };
}
export async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator(".brand-transition")).toHaveCount(0);
}

/** Choose through the visible Select2 control, including controls inside dialogs. */
export async function chooseSelectOption(labelled: Locator, value: string) {
  const page = labelled.page();
  const native = labelled.and(page.locator("select"));
  const label = await native.evaluate(
    (select: HTMLSelectElement, selected) =>
      Array.from(select.options).find((option) => option.value === selected)
        ?.textContent || "",
    value,
  );
  await native.locator("..").getByRole("combobox").click();
  await page.getByRole("option", { name: label, exact: true }).click();
}
