import { CONFIG_KEY, configSchema, type PluginConfig } from "../core/config";
import { KintoneGateway } from "../kintone/rest";

interface FieldMeta {
  code: string;
  label: string;
  type: string;
}

function ce<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function readCurrentConfig(): PluginConfig | null {
  const raw = kintone.plugin.app.getConfig(kintone.$PLUGIN_ID)?.[CONFIG_KEY];
  if (!raw) return null;
  try {
    const parsed = configSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function render(): Promise<void> {
  const root = document.getElementById("kp-ia-config-root");
  if (!root) return;

  const appId = kintone.app.getId();
  const gateway = new KintoneGateway();

  let fields: Record<string, FieldMeta> = {};
  if (appId !== null) {
    try {
      fields = (await gateway.getFormFields(appId)) as Record<string, FieldMeta>;
    } catch {
      fields = {};
    }
  }

  const attachmentFields = Object.values(fields).filter((f) => f.type === "FILE");
  const textFields = Object.values(fields).filter((f) => f.type === "MULTI_LINE_TEXT");
  const current = readCurrentConfig();
  const selectedTargets = new Set(current?.settings.targetFields ?? []);
  const selectedData = current?.settings.dataField ?? "";

  root.innerHTML = "";
  root.appendChild(ce("h1", {}, "kintone-image-annotator 設定"));
  root.appendChild(
    ce(
      "p",
      { class: "kp-cfg-lead" },
      "添付ファイルフィールドの画像に注釈を書き込み、同じフィールドへ追加保存します。",
    ),
  );

  // --- Target fields card ---
  const targetCard = ce("section", { class: "kp-cfg-card" });
  targetCard.appendChild(ce("h2", {}, "対象フィールド"));
  targetCard.appendChild(
    ce("span", { class: "kp-cfg-label" }, "対象の添付ファイルフィールド（必須）"),
  );

  const checks: HTMLInputElement[] = [];
  if (attachmentFields.length === 0) {
    targetCard.appendChild(
      ce("p", { class: "kp-cfg-empty" }, "このアプリには添付ファイルフィールドがありません。"),
    );
  } else {
    for (const field of attachmentFields) {
      const row = ce("label", { class: "kp-cfg-check" });
      const input = ce("input", { type: "checkbox", value: field.code }) as HTMLInputElement;
      input.checked = selectedTargets.has(field.code);
      checks.push(input);
      row.appendChild(input);
      row.appendChild(ce("span", {}, `${field.label} (${field.code})`));
      targetCard.appendChild(row);
    }
  }
  targetCard.appendChild(
    ce(
      "p",
      { class: "kp-cfg-help" },
      "選択したフィールドの直後に「注釈を追加」ボタンを表示します。",
    ),
  );
  const targetError = ce("p", { class: "kp-cfg-error" });
  targetError.style.display = "none";
  targetCard.appendChild(targetError);
  root.appendChild(targetCard);

  // --- Data field card ---
  const dataCard = ce("section", { class: "kp-cfg-card" });
  dataCard.appendChild(ce("h2", {}, "再編集用データ"));
  dataCard.appendChild(ce("span", { class: "kp-cfg-label" }, "注釈データフィールド（任意）"));
  const select = ce("select", { class: "kp-cfg-select" }) as HTMLSelectElement;
  const none = ce("option", { value: "" }, "保存しない") as HTMLOptionElement;
  select.appendChild(none);
  for (const field of textFields) {
    const opt = ce("option", { value: field.code }, `${field.label} (${field.code})`);
    if (field.code === selectedData) opt.setAttribute("selected", "");
    select.appendChild(opt);
  }
  select.value = selectedData;
  dataCard.appendChild(select);
  dataCard.appendChild(
    ce(
      "p",
      { class: "kp-cfg-help" },
      "設定すると図形データをこのフィールドへ保存し、注釈済み画像を後から再編集できます。このフィールドはプラグインが専用に使用します。手動で編集しないでください。",
    ),
  );
  const dataError = ce("p", { class: "kp-cfg-error" });
  dataError.style.display = "none";
  dataCard.appendChild(dataError);
  root.appendChild(dataCard);

  // --- Save bar ---
  const cancel = ce(
    "button",
    { class: "kp-cfg-btn kp-cfg-btn-text", type: "button" },
    "キャンセル",
  );
  const save = ce("button", { class: "kp-cfg-btn kp-cfg-btn-primary", type: "button" }, "保存");
  const bar = ce("div", { class: "kp-cfg-bar" });
  bar.appendChild(cancel);
  bar.appendChild(save);
  root.appendChild(bar);

  cancel.addEventListener("click", () => {
    history.back();
  });

  save.addEventListener("click", () => {
    targetError.style.display = "none";
    dataError.style.display = "none";

    const targetFields = checks.filter((c) => c.checked).map((c) => c.value);
    if (targetFields.length === 0) {
      targetError.textContent = "対象の添付ファイルフィールドを1つ以上選択してください";
      targetError.style.display = "block";
      return;
    }

    const dataField = select.value;
    if (dataField) {
      const meta = fields[dataField];
      if (!meta || meta.type !== "MULTI_LINE_TEXT") {
        dataError.textContent = `フィールド「${dataField}」が見つからないか、文字列（複数行）ではありません。別のフィールドを選択してください`;
        dataError.style.display = "block";
        return;
      }
    }

    const config: PluginConfig = { version: 1, settings: { targetFields, dataField } };
    const parsed = configSchema.safeParse(config);
    if (!parsed.success) {
      targetError.textContent = "設定値が不正です。選択内容を確認してください";
      targetError.style.display = "block";
      return;
    }
    kintone.plugin.app.setConfig({ [CONFIG_KEY]: JSON.stringify(config) });
  });
}

void render();
