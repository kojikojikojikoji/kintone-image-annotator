/** Small dependency-free DOM helpers for the record-screen UI. */

type Attrs = Record<string, string | number | boolean | undefined>;

/** Create an element with attributes and children. Text is set via textContent. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === "class") {
      node.className = String(value);
    } else if (key === "text") {
      node.textContent = String(value);
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clearChildren(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** A modal shell with overlay, focus trap, Esc handling, and aria-hidden. */
export interface Modal {
  overlay: HTMLDivElement;
  dialog: HTMLDivElement;
  body: HTMLDivElement;
  close: () => void;
  /** Set the handler invoked on Esc / close button / overlay click. */
  onRequestClose: (fn: () => void) => void;
}

export function createModal(options: {
  title: string;
  width?: string;
  height?: string;
  labelledBy?: string;
}): Modal {
  const titleId = options.labelledBy ?? `kp-ia-title-${Math.random().toString(36).slice(2)}`;
  const closeBtn = el("button", {
    class: "kp-ia-modal-close",
    type: "button",
    "aria-label": "閉じる",
  });
  closeBtn.textContent = "×";

  const title = el("h2", { class: "kp-ia-modal-title", id: titleId, text: options.title });
  const header = el("div", { class: "kp-ia-modal-header" }, [title, closeBtn]);
  const body = el("div", { class: "kp-ia-modal-body" });
  const dialog = el(
    "div",
    {
      class: "kp-ia-modal-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
    },
    [header, body],
  );
  if (options.width) dialog.style.width = options.width;
  if (options.height) dialog.style.height = options.height;

  const overlay = el("div", { class: "kp-ia-modal-overlay" }, [dialog]);

  let requestClose = (): void => close();

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && !event.isComposing) {
      event.stopPropagation();
      requestClose();
    } else if (event.key === "Tab") {
      trapFocus(dialog, event);
    }
  };

  function close(): void {
    document.removeEventListener("keydown", onKeyDown, true);
    overlay.remove();
  }

  closeBtn.addEventListener("click", () => requestClose());
  overlay.addEventListener("mousedown", (event) => {
    if (event.target === overlay) requestClose();
  });
  document.addEventListener("keydown", onKeyDown, true);
  document.body.appendChild(overlay);
  window.setTimeout(() => closeBtn.focus(), 0);

  return {
    overlay,
    dialog,
    body,
    close,
    onRequestClose: (fn) => {
      requestClose = fn;
    },
  };
}

function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  const focusables = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/** Confirm dialog with two buttons. Resolves true for confirm, false otherwise. */
export function confirmDialog(options: {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = createModal({ title: "", width: "360px" });
    modal.dialog.classList.add("kp-ia-confirm");
    const message = el("p", { class: "kp-ia-confirm-message", text: options.message });
    const confirmBtn = el("button", { class: "kp-ia-btn kp-ia-btn-danger", type: "button" });
    confirmBtn.textContent = options.confirmLabel;
    const cancelBtn = el("button", { class: "kp-ia-btn", type: "button" });
    cancelBtn.textContent = options.cancelLabel;
    const actions = el("div", { class: "kp-ia-confirm-actions" }, [cancelBtn, confirmBtn]);
    modal.body.appendChild(message);
    modal.body.appendChild(actions);
    const done = (value: boolean): void => {
      modal.close();
      resolve(value);
    };
    modal.onRequestClose(() => done(false));
    confirmBtn.addEventListener("click", () => done(true));
    cancelBtn.addEventListener("click", () => done(false));
  });
}

/** Right-top toast, auto-dismiss after 4s, max 3 (common spec 7). */
export function toast(message: string, kind: "success" | "error" = "success"): void {
  let host = document.getElementById("kp-ia-toast-host");
  if (!host) {
    host = el("div", { id: "kp-ia-toast-host", class: "kp-ia-toast-host" });
    document.body.appendChild(host);
  }
  while (host.children.length >= 3) {
    host.firstChild?.remove();
  }
  const item = el("div", {
    class: `kp-ia-toast kp-ia-toast-${kind}`,
    role: "status",
    text: message,
  });
  host.appendChild(item);
  window.setTimeout(() => item.remove(), 4000);
}
