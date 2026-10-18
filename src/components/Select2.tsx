import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { useTranslation } from "react-i18next";
import $ from "jquery";
import install from "select2";
import "select2/dist/css/select2.css";
import "@/select2.css";

// The npm package exposes a CommonJS installer rather than an ES module initializer.
if (!$.fn.select2)
  (install as unknown as (root: Window, jquery: JQueryStatic) => void)(
    window,
    $,
  );

function optionsKey(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (
        !isValidElement<{
          value?: unknown;
          label?: string;
          disabled?: boolean;
          children?: ReactNode;
        }>(child)
      )
        return String(child);
      return `${child.props.value}:${child.props.label}:${child.props.disabled}:${optionsKey(child.props.children)}`;
    })
    .join("|");
}

/** One adapter owns Select2's DOM and bridges its events to React's controlled value. */
export default function Select2({
  children,
  value,
  disabled,
  className = "",
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const ref = useRef<HTMLSelectElement>(null);
  const fallbackId = useId();
  const { i18n } = useTranslation();
  const es = !i18n.language.startsWith("en");
  const signature = optionsKey(children);

  useEffect(() => {
    const element = ref.current!;
    const select = $(element);
    const dialog = element.closest("dialog");
    select.select2({
      theme: "jebryx",
      width: "100%",
      minimumResultsForSearch: 0,
      dropdownParent: dialog ? $(dialog) : $(document.body),
      language: {
        noResults: () =>
          es ? "No se encontraron resultados" : "No results found",
        searching: () => (es ? "Buscando…" : "Searching…"),
        errorLoading: () =>
          es
            ? "No se pudieron cargar los resultados"
            : "The results could not be loaded",
      },
    });
    const instance = select.data("select2");
    const label =
      element.getAttribute("aria-label") ||
      element.closest(".field")?.querySelector("label")?.textContent ||
      element.labels?.[0]?.textContent;
    if (label)
      instance.$selection
        .attr("aria-label", label.trim())
        .removeAttr("aria-labelledby");
    queueMicrotask(() => {
      const description = element.getAttribute("aria-describedby");
      if (description && select.data("select2"))
        instance.$selection.attr("aria-describedby", description);
    });
    const changed = () => {
      instance.$selection.removeAttr("aria-invalid");
      element.dispatchEvent(new Event("change", { bubbles: true }));
    };
    select.on(
      "select2:select.jebryx select2:clear.jebryx select2:unselect.jebryx",
      changed,
    );
    select.on("select2:open.jebryx", () => {
      const search = instance.$dropdown.find<HTMLInputElement>(
        ".select2-search__field",
      );
      search
        .attr("placeholder", es ? "Buscar…" : "Search…")
        .attr("aria-label", es ? "Buscar opciones" : "Search options");
      search.trigger("focus");
    });
    const invalid = (event: Event) => {
      event.preventDefault();
      instance.$selection.attr("aria-invalid", "true");
      select.select2("open");
    };
    element.addEventListener("invalid", invalid);
    return () => {
      element.removeEventListener("invalid", invalid);
      select.off(".jebryx");
      if (select.data("select2")) select.select2("destroy");
    };
  }, [signature, es]);

  useEffect(() => {
    const element = ref.current!;
    const select = $(element);
    // A disabled fieldset must also disable the visual control and its search.
    select.prop(
      "disabled",
      !!disabled || !!element.closest("fieldset[disabled]"),
    );
    if (value !== undefined)
      select
        .val(Array.isArray(value) ? [...value] : String(value))
        .trigger("change.select2");
  });

  return (
    <span className="app-select">
      <select
        {...props}
        id={id || fallbackId}
        ref={ref}
        className={className}
        value={value}
        disabled={disabled}
      >
        {children}
      </select>
    </span>
  );
}
