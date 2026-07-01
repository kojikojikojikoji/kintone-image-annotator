import { buildAnnotatedFileName, disambiguateKey } from "../core/naming";
import { parsePluginConfig, type PluginConfig } from "../core/config";
import {
  buildUpdatedStore,
  findEntry,
  isWithinLimit,
  makeEntry,
  parseStore,
  serializeStore,
  type AnnotationStore,
} from "../core/annotation-store";
import type { Shape } from "../core/shapes";
import { decodeUpright, prepareImage } from "../kintone/image";
import { getFieldElement } from "../kintone/dom-map";
import { isConflictError, KintoneGateway } from "../kintone/rest";
import { openEditor, type EditorSession, type SaveResult } from "./editor";
import { openSelectModal, SUPPORTED_TYPES, type SelectableFile } from "./select-modal";
import { injectStyles } from "./styles";
import { toast } from "./ui";

interface FileValue {
  contentType: string;
  fileKey: string;
  name: string;
}

const gateway = new KintoneGateway();

function readFiles(record: KintoneEventRecord, fieldCode: string): FileValue[] {
  const field = record[fieldCode];
  if (!field || field.type !== "FILE" || !Array.isArray(field.value)) return [];
  return field.value as FileValue[];
}

function buildLaunchButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "kp-ia-launch-btn";
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  btn.appendChild(document.createTextNode("注釈を追加"));
  return btn;
}

function loadStore(config: PluginConfig, record: KintoneEventRecord): AnnotationStore | null {
  if (!config.settings.dataField) return null;
  const field = record[config.settings.dataField];
  const raw = field && field.type === "MULTI_LINE_TEXT" ? (field.value as string) : undefined;
  return parseStore(raw);
}

async function loadThumbnail(file: SelectableFile): Promise<string | null> {
  try {
    const blob = await gateway.downloadFile(file.fileKey, file.contentType);
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

async function openForFile(params: {
  file: SelectableFile;
  fieldCode: string;
  config: PluginConfig;
  app: number;
  recordId: number;
  store: AnnotationStore | null;
}): Promise<void> {
  const { file, fieldCode, config, app, recordId, store } = params;
  const entry = findEntry(store, file.name);

  // Determine the image to load and initial shapes.
  let sourceKey = file.fileKey;
  const sourceContentType = file.contentType;
  let sourceName = file.name;
  let initialShapes: Shape[] = [];
  let directDraw = false;

  if (entry) {
    // Re-edit: load the original source image and restore shapes (FR-13).
    try {
      const blob = await gateway.downloadFile(entry.sourceFileKey, "image/*");
      const bitmap = await decodeUpright(blob);
      const prepared = await prepareImage(bitmap);
      initialShapes = entry.shapes;
      sourceKey = entry.sourceFileKey;
      sourceName = entry.sourceFileName;
      await launchEditor({
        fieldCode,
        bitmap: prepared.bitmap,
        canvasWidth: prepared.width,
        canvasHeight: prepared.height,
        contentType: guessTypeFromName(entry.sourceFileName) ?? "image/png",
        originalName: sourceName,
        sourceFileKey: sourceKey,
        initialShapes,
        resized: prepared.resized,
        isGif: false,
        directDraw: false,
        config,
        app,
        recordId,
      });
      return;
    } catch {
      // EC-11: source gone -> open the annotated raster directly, no shapes.
      directDraw = true;
    }
  }

  try {
    const blob = await gateway.downloadFile(sourceKey, sourceContentType);
    let bitmap: ImageBitmap;
    try {
      bitmap = await decodeUpright(blob);
    } catch {
      toast("この画像は読み込めませんでした", "error");
      return;
    }
    let prepared;
    try {
      prepared = await prepareImage(bitmap);
    } catch {
      toast("この端末では画像が大きすぎるため編集できません", "error");
      return;
    }
    await launchEditor({
      fieldCode,
      bitmap: prepared.bitmap,
      canvasWidth: prepared.width,
      canvasHeight: prepared.height,
      contentType: sourceContentType,
      originalName: sourceName,
      sourceFileKey: sourceKey,
      initialShapes,
      resized: prepared.resized,
      isGif: sourceContentType === "image/gif",
      directDraw,
      config,
      app,
      recordId,
    });
  } catch {
    toast("画像を取得できませんでした。ページを再読み込みしてからやり直してください", "error");
  }
}

function guessTypeFromName(name: string): string | null {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return map[ext] ?? null;
}

async function launchEditor(
  params: EditorSession & {
    fieldCode: string;
    config: PluginConfig;
    app: number;
    recordId: number;
  },
): Promise<void> {
  const { fieldCode, config, app, recordId, ...session } = params;
  openEditor(session, {
    onSave: (payload) =>
      saveAnnotated({
        app,
        recordId,
        fieldCode,
        config,
        output: payload.output,
        blob: payload.blob,
        shapes: payload.shapes,
        canvasWidth: payload.canvasWidth,
        canvasHeight: payload.canvasHeight,
        sourceFileKey: session.sourceFileKey,
        sourceFileName: session.originalName,
      }),
  });
}

/** Save flow per 7.3: upload, re-fetch, all-replace attachment, update. */
async function saveAnnotated(params: {
  app: number;
  recordId: number;
  fieldCode: string;
  config: PluginConfig;
  output: { mime: string };
  blob: Blob;
  shapes: Shape[];
  canvasWidth: number;
  canvasHeight: number;
  sourceFileKey: string;
  sourceFileName: string;
}): Promise<SaveResult> {
  const outputFormat = { type: params.output.mime === "image/jpeg" ? "jpeg" : "png" } as const;
  const baseFileName = buildAnnotatedFileName(
    params.sourceFileName,
    outputFormat.type === "jpeg"
      ? { type: "jpeg", mime: "image/jpeg", quality: 0.9 }
      : { type: "png", mime: "image/png" },
    new Date(),
  );

  try {
    const { record, revision } = await gateway.getRecord(params.app, params.recordId);

    // Save back into the field the image was opened from, not the first
    // configured one (a record can have several annotation targets).
    const targetField = params.fieldCode;
    const targetValue = record[targetField];
    if (!targetValue || targetValue.type !== "FILE") {
      return { ok: false, message: "保存に失敗しました。通信環境を確認してやり直してください" };
    }

    const existing = (record[targetField]?.value as FileValue[]) ?? [];
    // The uploaded name must be unique among the field's attachments BEFORE
    // upload, so the shape-data store key always equals a real file name.
    // Disambiguating only the store key left entries unmatched and prunable.
    const fileName = disambiguateKey(
      baseFileName,
      existing.map((f) => f.name),
    );
    const newFileKey = await gateway.uploadFile(fileName, params.blob);

    // All-replace: map existing files then push the new one (7.3 step 4).
    const attachmentValue = existing.map((f) => ({ fileKey: f.fileKey }));
    attachmentValue.push({ fileKey: newFileKey });

    const update: Record<string, { value: unknown }> = {
      [targetField]: { value: attachmentValue },
    };

    // Data field (FR-12).
    let oversizeNote = false;
    const dataField = params.config.settings.dataField;
    if (dataField) {
      const rawCurrent = (record[dataField]?.value as string) ?? "";
      const attachmentNames = existing.map((f) => f.name);
      const entry = makeEntry({
        sourceFileKey: params.sourceFileKey,
        sourceFileName: params.sourceFileName,
        canvasWidth: params.canvasWidth,
        canvasHeight: params.canvasHeight,
        shapes: params.shapes,
      });
      const { store } = buildUpdatedStore({
        rawCurrent,
        fileName,
        entry,
        attachmentNames: [...attachmentNames, fileName],
      });
      const json = serializeStore(store);
      if (isWithinLimit(json)) {
        update[dataField] = { value: json };
      } else {
        oversizeNote = true;
      }
    }

    await gateway.updateRecord({
      app: params.app,
      recordId: params.recordId,
      revision,
      record: update,
    });

    if (oversizeNote) {
      toast("注釈データが大きいため、再編集用データは保存されませんでした", "error");
    }
    // Success: reload so the new attachment shows (7.3 step 9).
    window.setTimeout(() => window.location.reload(), 400);
    return { ok: true };
  } catch (error) {
    if (isConflictError(error)) {
      return {
        ok: false,
        message:
          "他のユーザーがレコードを更新しました。ページを再読み込みしてからやり直してください",
      };
    }
    return { ok: false, message: "保存に失敗しました。通信環境を確認してやり直してください" };
  }
}

function handleField(params: {
  fieldCode: string;
  config: PluginConfig;
  record: KintoneEventRecord;
  app: number;
  recordId: number;
  store: AnnotationStore | null;
}): void {
  const { fieldCode, config, record, app, recordId, store } = params;
  const element = getFieldElement(fieldCode);
  if (!element) return; // field removed from form (common spec 4)

  const files = readFiles(record, fieldCode);
  const buttonId = `kp-ia-launch-${fieldCode}`;
  if (files.length === 0) {
    document.getElementById(buttonId)?.remove();
    return; // EC-1
  }
  if (document.getElementById(buttonId)) return; // idempotent (common spec 4)

  const btn = buildLaunchButton();
  btn.id = buttonId;
  btn.addEventListener("click", () => {
    const selectable: SelectableFile[] = files.map((f) => ({
      name: f.name,
      contentType: f.contentType,
      fileKey: f.fileKey,
      reEditable: SUPPORTED_TYPES.has(f.contentType) && !!findEntry(store, f.name),
    }));
    openSelectModal(selectable, {
      loadThumbnail,
      onPick: (file) => void openForFile({ file, fieldCode, config, app, recordId, store }),
    });
  });
  element.insertAdjacentElement("afterend", btn);
}

async function onDetailShow(event: KintoneRecordEvent): Promise<KintoneRecordEvent> {
  injectStyles();
  const config = parsePluginConfig(kintone.plugin.app.getConfig(kintone.$PLUGIN_ID));
  if (!config) return event; // unconfigured (common spec 4)

  const app = event.appId;
  const recordId = event.recordId;

  // Remove any stale buttons before rebuilding (idempotent re-render).
  for (const code of config.settings.targetFields) {
    document.getElementById(`kp-ia-launch-${code}`)?.remove();
  }

  let editable = false;
  try {
    editable = await gateway.isRecordEditable(app, recordId);
  } catch (error) {
    // fail-closed (FR-2, EC-3)
    // eslint-disable-next-line no-console
    console.warn("kintone-image-annotator: acl/evaluate failed", error);
    return event;
  }
  if (!editable) return event;

  const store = loadStore(config, event.record);
  for (const fieldCode of config.settings.targetFields) {
    handleField({ fieldCode, config, record: event.record, app, recordId, store });
  }
  return event;
}

kintone.events.on("app.record.detail.show", onDetailShow);
