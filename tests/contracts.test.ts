import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiRequest,
  ApiError,
  normalizeIdentifiers,
} from "../src/lib/api/client";
import { dueDate } from "../src/lib/recurring";
import { parseSSEBlock, streamMessage } from "../src/lib/api/coach-stream";
import { csvCell } from "../src/lib/export";

afterEach(() => vi.unstubAllGlobals());
describe("JEBRYX_API contract", () => {
  it("sends the existing endpoint, JWT, active profile and JSON body", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ data: { cuenta: { id: 42, saldo: "250" } } }),
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const response = await apiRequest<{ cuenta: { id: string } }>(
      "/api/v1/cuentas",
      {
        method: "POST",
        token: "jwt",
        profileId: "profile-a",
        body: { nombre: "Banco" },
      },
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/cuentas",
      expect.objectContaining({
        method: "POST",
        body: '{"nombre":"Banco"}',
        headers: expect.objectContaining({
          Authorization: "Bearer jwt",
          "X-Profile-Id": "profile-a",
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(response.cuenta.id).toBe("42");
  });
  it("keeps auth requests independent of financial profile headers", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('{"data":{"token":"jwt"}}'));
    vi.stubGlobal("fetch", fetch);
    await apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: { email: "test@example.com", password: "secret" },
    });
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("X-Profile-Id");
  });
  it("retains CakePHP validation errors and expires unauthorized sessions", async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            '{"message":"Inválido","errors":{"monto":["Debe ser positivo"]}}',
            { status: 422 },
          ),
        )
        .mockResolvedValueOnce(
          new Response('{"message":"Expiró"}', { status: 401 }),
        ),
    );
    await expect(apiRequest("/api/v1/movimientos")).rejects.toMatchObject({
      status: 422,
      errors: { monto: ["Debe ser positivo"] },
    });
    await expect(
      apiRequest("/api/v1/cuentas", { token: "expired" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(dispatchEvent.mock.calls[0][0].type).toBe("jebryx:unauthorized");
  });
  it.each(["<html>Authentication is required to continue</html>", ""])(
    "expires rejected sessions when the backend returns a non-JSON body: %s",
    async (body) => {
      const dispatchEvent = vi.fn();
      vi.stubGlobal("window", { dispatchEvent });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(
          async () => new Response(body, { status: 401 }),
        ),
      );
      await expect(
        apiRequest("/api/v1/movimientos/resumen-saldo", { token: "rejected" }),
      ).rejects.toMatchObject({ status: 401 });
      expect(dispatchEvent).toHaveBeenCalledTimes(1);
      expect(dispatchEvent.mock.calls[0][0].type).toBe("jebryx:unauthorized");

      dispatchEvent.mockClear();
      await expect(
        apiRequest("/api/v1/auth/login", { method: "POST" }),
      ).rejects.toMatchObject({ status: 401 });
      expect(dispatchEvent).not.toHaveBeenCalled();
    },
  );
  it("normalizes nested IDs without changing monetary values or counts", () => {
    expect(
      normalizeIdentifiers({
        id: 1,
        cuenta_id: 2,
        cuenta: { id: 2, saldo: 30 },
        count: 4,
        plans: [{ accountId: 2 }],
      }),
    ).toEqual({
      id: "1",
      cuenta_id: "2",
      cuenta: { id: "2", saldo: 30 },
      count: 4,
      plans: [{ accountId: "2" }],
    });
  });
  it("reports non JSON responses and network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response("<html>Error</html>", { status: 502 }),
        )
        .mockRejectedValueOnce(new TypeError("offline")),
    );
    await expect(apiRequest("/api/v1/health")).rejects.toMatchObject({
      status: 502,
    });
    await expect(apiRequest("/api/v1/health")).rejects.toMatchObject({
      status: 0,
    });
  });
});
describe("native recurring payment dates", () => {
  it("clamps month end and resumes the original day the next month", () => {
    expect(
      dueDate({ startDate: "2026-01-31", frequency: "monthly", paidCount: 1 }),
    ).toBe("2026-02-28");
    expect(
      dueDate({ startDate: "2026-01-31", frequency: "monthly", paidCount: 2 }),
    ).toBe("2026-03-31");
    expect(
      dueDate({ startDate: "2028-01-31", frequency: "monthly", paidCount: 1 }),
    ).toBe("2028-02-29");
  });
  it("uses weekly and fourteen day intervals across year boundaries", () => {
    expect(
      dueDate({ startDate: "2026-12-28", frequency: "weekly", paidCount: 1 }),
    ).toBe("2027-01-04");
    expect(
      dueDate({ startDate: "2026-12-28", frequency: "biweekly", paidCount: 1 }),
    ).toBe("2027-01-11");
  });
});
describe("browser SSE adapter", () => {
  it("parses multiline event data and ignores comments", () => {
    expect(
      parseSSEBlock(": heartbeat\nevent: delta\ndata: first\ndata: second"),
    ).toEqual({ event: "delta", data: "first\nsecond" });
  });
  it("handles split UTF-8 and CRLF chunks and returns the persisted exchange", async () => {
    const exchange = {
      conversation: { id: "c1" },
      message: { id: "m1" },
      reply: { id: "m2" },
    };
    const raw = `event: delta\r\ndata: {"text":"¡Hola!"}\r\n\r\nevent: done\r\ndata: ${JSON.stringify(exchange)}\r\n\r\n`;
    const bytes = new TextEncoder().encode(raw);
    const stream = new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(stream, {
          headers: { "Content-Type": "text/event-stream" },
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const delta = vi.fn();
    expect(
      await streamMessage(
        "jwt",
        "p1",
        "c1",
        "Hola",
        "openai/gpt-oss-20b",
        delta,
      ),
    ).toEqual(exchange);
    expect(delta).toHaveBeenCalledWith("¡Hola!");
    expect(fetch.mock.calls[0][1].headers).toMatchObject({
      Authorization: "Bearer jwt",
      "X-Profile-Id": "p1",
      Accept: "text/event-stream",
    });
  });
  it("fails visibly if the stream ends without a persisted result", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('event: delta\ndata: {"text":"partial"}\n\n', {
            headers: { "Content-Type": "text/event-stream" },
          }),
        ),
    );
    await expect(
      streamMessage("jwt", "p", "c", "Hola", "model", () => {}),
    ).rejects.toThrow("interrumpió");
  });
});
it("exports CSV with correct escaping and neutralizes spreadsheet formulas", () => {
  expect(csvCell('Dijo "hola", ayer')).toBe('"Dijo ""hola"", ayer"');
  expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
  expect(csvCell("café\nmañana")).toBe('"café\nmañana"');
});
