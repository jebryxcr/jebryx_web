import { API_BASE_URL } from "../config";
import { ApiError } from "./client";
import type { CoachExchange } from "./coach";

export function parseSSEBlock(block: string): { event: string; data: string } {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  return { event, data: data.join("\n") };
}

export async function streamMessage(
  token: string,
  profileId: string,
  conversationId: string,
  message: string,
  model: string,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<CoachExchange> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/coach/conversations/${conversationId}/messages`,
    {
      method: "POST",
      signal,
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Profile-Id": profileId,
        "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
      body: JSON.stringify({ message, model }),
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401)
      window.dispatchEvent(new Event("jebryx:unauthorized"));
    throw new ApiError(
      body.message || `Error ${response.status}`,
      response.status,
      body.errors,
    );
  }
  if (response.headers.get("content-type")?.includes("application/json")) {
    const json = await response.json();
    return json.data ?? json;
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No se pudo abrir la respuesta del coach.");
  const decoder = new TextDecoder();
  let buffer = "";
  let exchange: CoachExchange | undefined;
  const consume = (block: string) => {
    const { event, data } = parseSSEBlock(block);
    if (!data || data === "[DONE]") return;
    const payload = JSON.parse(data);
    if (event === "delta" && payload.text) onDelta(payload.text);
    if (event === "done") exchange = payload.data ?? payload;
    if (event === "error")
      throw new Error(payload.message || "El coach no pudo responder.");
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      // Normalize after buffering, including CRLF split between network chunks.
      buffer = buffer.replace(/\r\n/g, "\n");
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        consume(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
      }
      if (done) {
        if (buffer.trim()) consume(buffer);
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (!exchange)
    throw new Error(
      "La respuesta se interrumpió. Vuelve a abrir la conversación antes de reenviar.",
    );
  return exchange;
}
