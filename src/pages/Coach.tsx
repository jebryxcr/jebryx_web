import Select2 from "@/components/Select2";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, BarChart3, MessageCircle, Plus, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as api from "@/lib/api/coach";
import { streamMessage } from "@/lib/api/coach-stream";
import { COACH_MODELS } from "@/lib/config";
import {
  localDate,
  useCredentials,
  useProfileQuery,
  useText,
} from "@/lib/hooks";
import { usePrefs } from "@/lib/store";
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  IconButton,
  Loading,
  PageTitle,
} from "@/components/ui";
import SuggestedAction from "@/components/SuggestedAction";
import { CoachAvatar } from "@/components/Brand";
import { LoadingDots } from "@/components/Motion";

function Usage() {
  const tr = useText();
  const query = useProfileQuery(["coach", "usage"], api.getUsage);
  const usage = query.data?.usage;
  const max = Math.max(1, ...(usage?.daily.map((d) => d.total_tokens) || []));
  return (
    <>
      <PageTitle
        title={tr("Uso del coach", "Coach usage")}
        subtitle={tr(
          "Tu actividad con Jebryx durante los últimos 30 días.",
          "Your activity with Jebryx over the last 30 days.",
        )}
        action={
          <Link className="button secondary" to="/coach">
            {tr("Ir al coach", "Go to coach")}
          </Link>
        }
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox error={query.error} retry={() => void query.refetch()} />
      ) : (
        usage && (
          <>
            <div className="report-kpis">
              {[
                [tr("Mensajes", "Messages"), usage.total.messages],
                [tr("Tokens", "Tokens"), usage.total.total_tokens],
                [tr("Días activos", "Active days"), usage.total.active_days],
                [
                  tr("Tiempo activo (min)", "Active time (min)"),
                  Math.round(usage.total.active_time / 60),
                ],
              ].map(([label, value]) => (
                <Card key={String(label)}>
                  <span className="kpi-label">{label}</span>
                  <h2>{Number(value).toLocaleString()}</h2>
                </Card>
              ))}
            </div>
            <Card>
              <h3>
                {tr("Actividad diaria · tokens", "Daily activity · tokens")}
              </h3>
              {usage.daily.length ? (
                <div className="bar-chart usage-chart">
                  {usage.daily.map((day) => (
                    <div className="bar-group" key={day.date}>
                      <div className="bar-pair">
                        <div
                          className="bar income-bar"
                          style={{
                            height: `${(day.total_tokens / max) * 100}%`,
                          }}
                          title={`${day.date}: ${day.total_tokens}`}
                        />
                      </div>
                      <small>{day.date.slice(8)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty />
              )}
            </Card>
            <div className="two-columns">
              {(["sabio", "destello"] as const).map((model) => (
                <Card key={model}>
                  <h3>
                    {model === "sabio"
                      ? tr("Sabio", "Sage")
                      : tr("Destello", "Flash")}
                  </h3>
                  <h2>
                    {(usage.models[model]?.total_tokens || 0).toLocaleString()}{" "}
                    <small>tokens</small>
                  </h2>
                  <p>
                    {usage.models[model]?.messages || 0}{" "}
                    {tr("mensajes", "messages")}
                  </p>
                </Card>
              ))}
            </div>
            <Card className="table-card">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{tr("Día", "Day")}</th>
                      <th>{tr("Mensajes", "Messages")}</th>
                      <th>{tr("Tokens de entrada", "Input tokens")}</th>
                      <th>{tr("Tokens de salida", "Output tokens")}</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.daily.map((d) => (
                      <tr key={d.date}>
                        <td>{localDate(d.date)}</td>
                        <td>{d.messages}</td>
                        <td>{d.prompt_tokens.toLocaleString()}</td>
                        <td>{d.completion_tokens.toLocaleString()}</td>
                        <td>{d.total_tokens.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )
      )}
    </>
  );
}

function Chat() {
  const tr = useText();
  const { token, profileId } = useCredentials();
  const { prefs, update } = usePrefs();
  const client = useQueryClient();
  const conversations = useProfileQuery(
    ["coach", "conversations"],
    api.listConversations,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState("");
  const [pendingText, setPendingText] = useState("");
  const [error, setError] = useState<unknown>(null);
  const controller = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const queryKey = [profileId, "coach", "conversation", selected];
  const detail = useQuery({
    queryKey,
    queryFn: () => api.getConversation(token, profileId, selected!),
    enabled: !!selected,
  });
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [stream, detail.data?.conversation.messages.length]);
  const send = async (message = input) => {
    const text = message.trim();
    if (!text || busy || (selected && !detail.data)) return;
    setError(null);
    setBusy(true);
    setPendingText(text);
    setInput("");
    setStream("");
    const abort = new AbortController();
    controller.current = abort;
    let id = selected;
    try {
      if (!id) {
        const created = await api.createConversation(token, profileId);
        if (abort.signal.aborted) return;
        id = created.conversation.id;
        setSelected(id);
      }
      const exchange = await streamMessage(
        token,
        profileId,
        id,
        text,
        COACH_MODELS[prefs.coachModel],
        (delta) => setStream((s) => s + delta),
        abort.signal,
      );
      if (abort.signal.aborted) return;
      await client.cancelQueries({
        queryKey: [profileId, "coach", "conversation", id],
      });
      client.setQueryData<{ conversation: api.CoachConversationDetail }>(
        [profileId, "coach", "conversation", id],
        (old) => ({
          conversation: {
            ...exchange.conversation,
            messages: [
              ...(old?.conversation.messages || []).filter(
                (m) =>
                  m.id !== exchange.message.id && m.id !== exchange.reply.id,
              ),
              exchange.message,
              exchange.reply,
            ],
          },
        }),
      );
      setPendingText("");
      setStream("");
      await client.invalidateQueries({
        queryKey: [profileId, "coach", "conversations"],
      });
    } catch (err) {
      if (!abort.signal.aborted) {
        setError(err);
        setInput(text);
        if (id)
          await client.invalidateQueries({
            queryKey: [profileId, "coach", "conversation", id],
          });
      }
    } finally {
      if (!abort.signal.aborted) {
        setBusy(false);
        setPendingText("");
        setStream("");
      }
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };
  const remove = async (id: string) => {
    if (
      busy ||
      !window.confirm(
        tr(
          "¿Eliminar esta conversación y todos sus mensajes?",
          "Delete this conversation and all its messages?",
        ),
      )
    )
      return;
    try {
      await api.deleteConversation(token, profileId, id);
      if (selected === id) setSelected(null);
      await conversations.refetch();
    } catch (err) {
      setError(err);
    }
  };
  const messages = detail.data?.conversation.messages || [];
  return (
    <>
      <PageTitle
        title={tr("Tu coach financiero", "Your financial coach")}
        subtitle={tr(
          "Menos dudas. Más claridad para decidir.",
          "Fewer doubts. More clarity to decide.",
        )}
        action={
          <Link to="/coach-usage" className="button secondary">
            <BarChart3 size={17} />
            {tr("Ver consumo", "View usage")}
          </Link>
        }
      />
      <div className="chat-layout">
        <Card className="conversation-sidebar">
          <Button
            className="secondary full"
            disabled={busy}
            onClick={() => {
              setSelected(null);
              setError(null);
              setInput("");
            }}
          >
            <Plus size={17} />
            {tr("Nueva conversación", "New conversation")}
          </Button>
          <span className="nav-label">
            {tr("TUS CONVERSACIONES", "YOUR CONVERSATIONS")}
          </span>
          {conversations.isPending ? (
            <Loading />
          ) : conversations.error ? (
            <ErrorBox
              error={conversations.error}
              retry={() => void conversations.refetch()}
            />
          ) : conversations.data?.conversations.length ? (
            conversations.data.conversations.map((c) => (
              <div
                key={c.id}
                className={`conversation-item ${selected === c.id ? "active" : ""}`}
              >
                <button
                  disabled={busy}
                  onClick={() => {
                    setSelected(c.id);
                    setError(null);
                  }}
                >
                  <MessageCircle size={16} />
                  <span>{c.title}</span>
                </button>
                <IconButton
                  disabled={busy}
                  label={tr("Eliminar conversación", "Delete conversation")}
                  onClick={() => void remove(c.id)}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            ))
          ) : (
            <p>
              {tr(
                "Aquí aparecerá tu historial.",
                "Your conversation history will appear here.",
              )}
            </p>
          )}
        </Card>
        <Card className="chat-card">
          <div className="chat-head">
            <div className="row-actions">
              <CoachAvatar size={36} />
              <div>
                <strong>Jebryx</strong>
                <small>
                  {tr(
                    "Tu espacio para pensar en dinero",
                    "Your space to think about money",
                  )}
                </small>
              </div>
            </div>
            <Select2
              aria-label={tr("Modelo del coach", "Coach model")}
              value={prefs.coachModel}
              disabled={busy}
              onChange={(e) =>
                update({ coachModel: e.target.value as "sabio" | "destello" })
              }
            >
              <option value="sabio">
                {tr("Sabio · análisis profundo", "Sage · deeper analysis")}
              </option>
              <option value="destello">
                {tr("Destello · respuesta rápida", "Flash · fast responses")}
              </option>
            </Select2>
          </div>
          <div className="chat-messages" aria-live="polite" aria-busy={busy}>
            {selected && detail.isPending ? (
              <Loading />
            ) : detail.error ? (
              <ErrorBox
                error={detail.error}
                retry={() => void detail.refetch()}
              />
            ) : messages.length === 0 && !pendingText ? (
              <div className="chat-welcome">
                <div className="coach-spark">
                  <CoachAvatar size={67} />
                </div>
                <h2>
                  {tr("Hablemos de tu dinero.", "Let’s talk about your money.")}
                </h2>
                <p>
                  {tr(
                    "Pregunta, explora y encuentra tu próximo paso. Estoy aquí para ayudarte.",
                    "Ask, explore, and find your next step. I’m here to help.",
                  )}
                </p>
                <div className="quick-suggestions">
                  {[
                    tr(
                      "¿Cómo van mis gastos este mes?",
                      "How is my spending this month?",
                    ),
                    tr(
                      "Ayúdame a crear un presupuesto",
                      "Help me create a budget",
                    ),
                    tr("¿Dónde puedo ahorrar?", "Where can I save money?"),
                  ].map((text) => (
                    <button
                      disabled={busy}
                      key={text}
                      onClick={() => void send(text)}
                    >
                      {text}
                      <ArrowUp size={15} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div className={`chat-message ${m.role}`} key={m.id}>
                  <span className="message-author">
                    {m.role === "assistant" ? "✦ Jebryx" : tr("Tú", "You")}
                  </span>
                  <div className="message-bubble markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                  {m.actions?.map((action) => (
                    <SuggestedAction
                      key={action.id}
                      action={action}
                      update={async (status, resourceId) => {
                        await api.updateAction(token, profileId, action.id, {
                          status,
                          created_resource_id: resourceId,
                        });
                        await detail.refetch();
                      }}
                    />
                  ))}
                  {m.role === "assistant" &&
                    m.id === messages.at(-1)?.id &&
                    !!m.suggestions?.length && (
                      <div className="quick-suggestions">
                        {m.suggestions.map((s) => (
                          <button
                            key={s}
                            disabled={busy}
                            onClick={() => void send(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))
            )}
            {pendingText && (
              <>
                <div className="chat-message user">
                  <span className="message-author">{tr("Tú", "You")}</span>
                  <div className="message-bubble">{pendingText}</div>
                </div>
                <div className="chat-message assistant">
                  <span className="message-author">✦ Jebryx</span>
                  <div className="message-bubble markdown">
                    {stream ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {stream}
                      </ReactMarkdown>
                    ) : (
                      <LoadingDots />
                    )}
                  </div>
                </div>
              </>
            )}
            <div ref={bottom} />
          </div>
          {error != null && <ErrorBox error={error} />}
          <form className="chat-composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="coach-message">
              {tr("Mensaje para el coach", "Message your coach")}
            </label>
            <textarea
              id="coach-message"
              rows={2}
              value={input}
              maxLength={8000}
              placeholder={tr(
                "Escribe lo que tienes en mente…",
                "What’s on your mind?",
              )}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              type="submit"
              busy={busy}
              disabled={!input.trim() || (!!selected && !detail.data)}
              aria-label={tr("Enviar mensaje", "Send message")}
            >
              <ArrowUp size={20} />
            </Button>
          </form>
          <small className="coach-disclaimer">
            {tr(
              "Orientación educativa. Revisa las sugerencias antes de aplicarlas.",
              "Educational guidance. Review suggestions before applying them.",
            )}
          </small>
        </Card>
      </div>
    </>
  );
}
export default function Coach({ usage = false }: { usage?: boolean }) {
  return usage ? <Usage /> : <Chat />;
}
