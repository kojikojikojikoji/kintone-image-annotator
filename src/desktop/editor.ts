import {
  clampPan,
  clampZoom,
  displayToCanvas,
  distance,
  scaleForZoom,
  zoomAround,
  type Viewport,
} from "../core/geometry";
import { HistoryStack } from "../core/history";
import { decideOutput, type OutputFormat } from "../core/naming";
import { drawShapes, type RenderContext } from "../core/rasterizer";
import {
  createTextShape,
  generateId,
  PRESET_COLORS,
  type PresetColor,
  type Shape,
  type StrokeLevel,
  type ToolKind,
} from "../core/shapes";
import { fontSizeFor, shouldAddPoint, strokeWidthFor, MAX_PEN_POINTS } from "../core/stroke";
import { rasterizeToBlob } from "../kintone/image";
import { createModal, confirmDialog, el, toast } from "./ui";

export interface EditorSession {
  bitmap: ImageBitmap;
  canvasWidth: number;
  canvasHeight: number;
  contentType: string;
  originalName: string;
  sourceFileKey: string;
  initialShapes: Shape[];
  resized: boolean;
  isGif: boolean;
  /** EC-11: source image gone, drawing directly on the annotated raster. */
  directDraw: boolean;
}

export type SaveResult = { ok: true } | { ok: false; message: string };

export interface EditorCallbacks {
  onSave: (payload: {
    blob: Blob;
    output: OutputFormat;
    shapes: Shape[];
    canvasWidth: number;
    canvasHeight: number;
  }) => Promise<SaveResult>;
}

const TOOL_LABELS: Record<ToolKind, string> = {
  pen: "ペン",
  line: "直線",
  arrow: "矢印",
  rect: "矩形",
  ellipse: "楕円",
  text: "テキスト",
};

const COLOR_LABELS: Record<PresetColor, string> = {
  "#d93025": "赤",
  "#e8710a": "橙",
  "#f9ab00": "黄",
  "#188038": "緑",
  "#1a73e8": "青",
  "#202124": "黒",
};

const LEVEL_LABELS: Record<StrokeLevel, string> = {
  thin: "細",
  medium: "中",
  thick: "太",
};

/** Open the annotation editor. Resolves when the editor is closed. */
export function openEditor(session: EditorSession, callbacks: EditorCallbacks): void {
  const longSide = Math.max(session.canvasWidth, session.canvasHeight);
  const modal = createModal({
    title: `注釈エディタ - ${session.originalName}`,
    labelledBy: "kp-ia-editor-title",
  });
  modal.dialog.classList.add("kp-ia-editor-dialog");
  modal.body.classList.add("kp-ia-editor-body");

  // --- editor state ---
  const history = new HistoryStack<Shape[]>([...session.initialShapes]);
  let dirty = false;
  let tool: ToolKind = "pen";
  let color: PresetColor = "#d93025";
  let level: StrokeLevel = "medium";
  let zoomPercent = 100;
  let viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };
  let preview: Shape | null = null;

  // --- toolbar ---
  const toolButtons = new Map<ToolKind, HTMLButtonElement>();
  const colorButtons = new Map<PresetColor, HTMLButtonElement>();
  const levelButtons = new Map<StrokeLevel, HTMLButtonElement>();

  const toolGroup = el("div", { class: "kp-ia-tool-group" });
  (Object.keys(TOOL_LABELS) as ToolKind[]).forEach((kind) => {
    const btn = el("button", {
      class: "kp-ia-tool",
      type: "button",
      "aria-label": TOOL_LABELS[kind],
      "aria-pressed": kind === tool,
      text: TOOL_LABELS[kind],
    });
    btn.addEventListener("click", () => setTool(kind));
    toolButtons.set(kind, btn);
    toolGroup.appendChild(btn);
  });

  const colorGroup = el("div", { class: "kp-ia-tool-group" });
  PRESET_COLORS.forEach((c) => {
    const btn = el("button", {
      class: "kp-ia-swatch",
      type: "button",
      "aria-label": COLOR_LABELS[c],
      "aria-pressed": c === color,
    });
    btn.style.background = c;
    btn.addEventListener("click", () => setColor(c));
    colorButtons.set(c, btn);
    colorGroup.appendChild(btn);
  });

  const levelGroup = el("div", { class: "kp-ia-tool-group" });
  (Object.keys(LEVEL_LABELS) as StrokeLevel[]).forEach((lv) => {
    const btn = el("button", {
      class: "kp-ia-tool",
      type: "button",
      "aria-pressed": lv === level,
      text: LEVEL_LABELS[lv],
    });
    btn.addEventListener("click", () => setLevel(lv));
    levelButtons.set(lv, btn);
    levelGroup.appendChild(btn);
  });

  const undoBtn = el("button", { class: "kp-ia-tool", type: "button", text: "元に戻す" });
  const redoBtn = el("button", { class: "kp-ia-tool", type: "button", text: "やり直す" });
  const clearBtn = el("button", { class: "kp-ia-tool", type: "button", text: "全消去" });
  undoBtn.addEventListener("click", () => doUndo());
  redoBtn.addEventListener("click", () => doRedo());
  clearBtn.addEventListener("click", () => doClear());
  const historyGroup = el("div", { class: "kp-ia-tool-group" }, [undoBtn, redoBtn, clearBtn]);

  const zoomOut = el("button", {
    class: "kp-ia-tool",
    type: "button",
    "aria-label": "縮小",
    text: "−",
  });
  const zoomIn = el("button", {
    class: "kp-ia-tool",
    type: "button",
    "aria-label": "拡大",
    text: "+",
  });
  const zoomValue = el("span", { class: "kp-ia-zoom-value", text: "100%" });
  zoomOut.addEventListener("click", () => stepZoom(-25));
  zoomIn.addEventListener("click", () => stepZoom(25));
  const zoomGroup = el("div", { class: "kp-ia-zoom" }, [zoomOut, zoomValue, zoomIn]);

  const toolbar = el("div", { class: "kp-ia-toolbar" }, [
    toolGroup,
    el("div", { class: "kp-ia-tool-sep" }),
    colorGroup,
    el("div", { class: "kp-ia-tool-sep" }),
    levelGroup,
    el("div", { class: "kp-ia-tool-sep" }),
    historyGroup,
    zoomGroup,
  ]);

  // --- canvas ---
  const wrap = el("div", { class: "kp-ia-canvas-wrap" });
  const canvas = el("canvas", { class: "kp-ia-canvas" });
  wrap.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // --- footer ---
  const notes: string[] = [];
  if (session.resized) notes.push("元画像が大きいため、長辺8000pxに縮小して編集しています");
  if (session.isGif) notes.push("GIFは先頭フレームに注釈し、PNG形式で保存します");
  if (session.directDraw) notes.push("元画像が見つからないため、注釈済み画像に直接描画します");
  const note = el("span", { class: "kp-ia-note", text: notes.join(" / ") });

  const errorBar = el("div", { class: "kp-ia-error" });
  errorBar.style.display = "none";
  const errorText = el("span", {});
  const errorClose = el("button", { type: "button", "aria-label": "閉じる", text: "×" });
  errorClose.addEventListener("click", () => hideError());
  errorBar.appendChild(errorText);
  errorBar.appendChild(errorClose);

  const cancelBtn = el("button", { class: "kp-ia-btn", type: "button", text: "キャンセル" });
  const saveBtn = el("button", {
    class: "kp-ia-btn kp-ia-btn-primary",
    type: "button",
    text: "保存",
  });
  cancelBtn.addEventListener("click", () => requestClose());
  saveBtn.addEventListener("click", () => doSave());
  const footerActions = el("div", { class: "kp-ia-footer-actions" }, [cancelBtn, saveBtn]);
  const footer = el("div", { class: "kp-ia-footer" }, [note, footerActions]);

  modal.body.appendChild(toolbar);
  modal.body.appendChild(wrap);
  modal.body.appendChild(errorBar);
  modal.body.appendChild(footer);

  // --- helpers ---
  function currentShapes(): Shape[] {
    return history.current();
  }

  function setTool(kind: ToolKind): void {
    tool = kind;
    toolButtons.forEach((btn, k) => btn.setAttribute("aria-pressed", String(k === kind)));
    updateCursor();
  }
  function setColor(c: PresetColor): void {
    color = c;
    colorButtons.forEach((btn, k) => btn.setAttribute("aria-pressed", String(k === c)));
  }
  function setLevel(lv: StrokeLevel): void {
    level = lv;
    levelButtons.forEach((btn, k) => btn.setAttribute("aria-pressed", String(k === lv)));
  }

  function strokeWidth(): number {
    return strokeWidthFor(longSide, level);
  }

  function updateHistoryButtons(): void {
    undoBtn.disabled = !history.canUndo();
    redoBtn.disabled = !history.canRedo();
    clearBtn.disabled = currentShapes().length === 0;
    saveBtn.disabled = currentShapes().length === 0;
  }

  function commit(next: Shape[]): void {
    history.push(next);
    dirty = true;
    updateHistoryButtons();
    render();
  }

  function doUndo(): void {
    if (history.undo() !== null) {
      dirty = true;
      updateHistoryButtons();
      render();
    }
  }
  function doRedo(): void {
    if (history.redo() !== null) {
      dirty = true;
      updateHistoryButtons();
      render();
    }
  }
  function doClear(): void {
    if (currentShapes().length === 0) return;
    commit([]);
  }

  function showError(message: string): void {
    errorText.textContent = message;
    errorBar.style.display = "flex";
  }
  function hideError(): void {
    errorBar.style.display = "none";
  }

  function updateCursor(): void {
    if (panning) {
      canvas.style.cursor = "grabbing";
    } else if (spaceDown) {
      canvas.style.cursor = "grab";
    } else if (tool === "text") {
      canvas.style.cursor = "text";
    } else {
      canvas.style.cursor = "crosshair";
    }
  }

  // --- viewport / rendering ---
  const dpr = window.devicePixelRatio || 1;

  function viewportSize(): { width: number; height: number } {
    return { width: wrap.clientWidth, height: wrap.clientHeight };
  }

  function resetViewport(): void {
    const vp = viewportSize();
    const scale = scaleForZoom(
      zoomPercent,
      { width: session.canvasWidth, height: session.canvasHeight },
      vp,
    );
    // Center the image.
    viewport = clampPan(
      {
        scale,
        offsetX: (vp.width - session.canvasWidth * scale) / 2,
        offsetY: (vp.height - session.canvasHeight * scale) / 2,
      },
      { width: session.canvasWidth, height: session.canvasHeight },
      vp,
    );
  }

  function applyZoom(
    nextPercent: number,
    anchorDisplay?: { x: number; y: number },
    anchorCanvasOverride?: { x: number; y: number },
  ): void {
    const vp = viewportSize();
    const clamped = clampZoom(nextPercent);
    const canvasSize = { width: session.canvasWidth, height: session.canvasHeight };
    const newScale = scaleForZoom(clamped, canvasSize, vp);
    const anchor = anchorDisplay ?? { x: vp.width / 2, y: vp.height / 2 };
    const anchorCanvas = anchorCanvasOverride ?? displayToCanvas(anchor, viewport);
    viewport = clampPan(zoomAround(anchor, anchorCanvas, newScale), canvasSize, vp);
    zoomPercent = clamped;
    zoomValue.textContent = `${clamped}%`;
    zoomOut.disabled = clamped <= 50;
    zoomIn.disabled = clamped >= 400;
    render();
  }

  function stepZoom(delta: number): void {
    applyZoom(zoomPercent + delta);
  }

  // TODO(spec 9 perf): redraws every shape on each pointermove. The spec asks
  // for a preview layer that diff-draws the in-progress shape at 60fps on
  // 4000px images. Acceptable for typical shape counts; revisit for heavy pen use.
  function render(): void {
    if (!ctx) return;
    const vp = viewportSize();
    canvas.width = Math.max(1, Math.floor(vp.width * dpr));
    canvas.height = Math.max(1, Math.floor(vp.height * dpr));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(
      viewport.scale * dpr,
      0,
      0,
      viewport.scale * dpr,
      viewport.offsetX * dpr,
      viewport.offsetY * dpr,
    );
    ctx.drawImage(session.bitmap, 0, 0, session.canvasWidth, session.canvasHeight);
    const shapes = preview ? [...currentShapes(), preview] : currentShapes();
    drawShapes(ctx as unknown as RenderContext, shapes);
  }

  // --- pointer interaction ---
  const activePointers = new Map<number, { x: number; y: number }>();
  let drawingPointerId: number | null = null;
  let penActive = false;
  let panning = false;
  let spaceDown = false;
  let startCanvas = { x: 0, y: 0 };
  let penPoints: Array<{ x: number; y: number }> = [];
  let lastPanClient = { x: 0, y: 0 };
  let pinchStartDist = 0;
  let pinchStartZoom = 100;
  let pinchAnchorCanvas = { x: 0, y: 0 };

  function toCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return displayToCanvas({ x: clientX - rect.left, y: clientY - rect.top }, viewport);
  }
  function toDisplayPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function onPointerDown(event: PointerEvent): void {
    if (textOverlay) return;

    // Palm rejection first: a touch landing while the pen draws must not be
    // tracked at all, or it would count toward the two-pointer pinch branch,
    // cancel the pen stroke and leave penActive stuck (FR-5).
    if (penActive && event.pointerType === "touch") return;

    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    // Two-finger pan/pinch (touch).
    if (event.pointerType === "touch" && activePointers.size === 2) {
      beginPinch();
      return;
    }

    const wantPan = spaceDown || event.button === 1;
    if (wantPan) {
      panning = true;
      lastPanClient = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      updateCursor();
      return;
    }
    if (event.button !== 0 && event.pointerType === "mouse") return;

    if (event.pointerType === "pen") penActive = true;
    drawingPointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    const pt = toCanvasPoint(event.clientX, event.clientY);
    startCanvas = pt;

    if (tool === "text") {
      drawingPointerId = null;
      openTextOverlay(pt, event.clientX, event.clientY);
      return;
    }
    if (tool === "pen") {
      penPoints = [pt];
      preview = { id: "preview", type: "pen", color, strokeWidth: strokeWidth(), points: [pt, pt] };
    } else {
      preview = buildDragShape(pt, pt);
    }
    render();
  }

  function onPointerMove(event: PointerEvent): void {
    if (activePointers.has(event.pointerId)) {
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pinchStartDist > 0 && activePointers.size >= 2) {
      updatePinch();
      return;
    }
    if (panning) {
      const dx = event.clientX - lastPanClient.x;
      const dy = event.clientY - lastPanClient.y;
      lastPanClient = { x: event.clientX, y: event.clientY };
      viewport = clampPan(
        { scale: viewport.scale, offsetX: viewport.offsetX + dx, offsetY: viewport.offsetY + dy },
        { width: session.canvasWidth, height: session.canvasHeight },
        viewportSize(),
      );
      render();
      return;
    }
    if (drawingPointerId !== event.pointerId) return;
    const pt = toCanvasPoint(event.clientX, event.clientY);
    if (tool === "pen") {
      const last = penPoints[penPoints.length - 1];
      if (penPoints.length < MAX_PEN_POINTS && shouldAddPoint(last, pt, strokeWidth())) {
        penPoints.push(pt);
      }
      preview = {
        id: "preview",
        type: "pen",
        color,
        strokeWidth: strokeWidth(),
        points: penPoints.length >= 2 ? penPoints : [penPoints[0], pt],
      };
    } else {
      preview = buildDragShape(startCanvas, pt);
    }
    render();
  }

  // A cancelled pointer (OS gesture, palm dialog, window blur) must abort the
  // in-progress shape, never commit a partial one through the pointer-up path.
  function onPointerCancel(event: PointerEvent): void {
    activePointers.delete(event.pointerId);
    if (pinchStartDist > 0 && activePointers.size < 2) {
      pinchStartDist = 0;
    }
    if (panning) {
      panning = false;
      updateCursor();
    }
    if (drawingPointerId === event.pointerId) {
      drawingPointerId = null;
      if (event.pointerType === "pen") penActive = false;
      preview = null;
      penPoints = [];
      render();
    }
  }

  function onPointerUp(event: PointerEvent): void {
    activePointers.delete(event.pointerId);
    if (pinchStartDist > 0 && activePointers.size < 2) {
      pinchStartDist = 0;
    }
    if (panning) {
      panning = false;
      updateCursor();
      return;
    }
    if (drawingPointerId !== event.pointerId) return;
    drawingPointerId = null;
    if (event.pointerType === "pen") penActive = false;

    const endPt = toCanvasPoint(event.clientX, event.clientY);
    if (tool === "pen") {
      const points = penPoints.length >= 2 ? penPoints : null;
      preview = null;
      penPoints = [];
      if (points) {
        commit([
          ...currentShapes(),
          { id: generateId(), type: "pen", color, strokeWidth: strokeWidth(), points },
        ]);
      } else {
        render();
      }
      return;
    }
    preview = null;
    // Discard tiny drags (click misfires) (FR-5).
    if (distance(startCanvas, endPt) < strokeWidth()) {
      render();
      return;
    }
    const shape = buildDragShape(startCanvas, endPt);
    if (shape) {
      commit([...currentShapes(), { ...shape, id: generateId() }]);
    } else {
      render();
    }
  }

  function buildDragShape(a: { x: number; y: number }, b: { x: number; y: number }): Shape | null {
    const sw = strokeWidth();
    switch (tool) {
      case "line":
        return {
          id: "preview",
          type: "line",
          color,
          strokeWidth: sw,
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
        };
      case "arrow":
        return {
          id: "preview",
          type: "arrow",
          color,
          strokeWidth: sw,
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
        };
      case "rect":
        return {
          id: "preview",
          type: "rect",
          color,
          strokeWidth: sw,
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          width: Math.abs(b.x - a.x),
          height: Math.abs(b.y - a.y),
        };
      case "ellipse":
        return {
          id: "preview",
          type: "ellipse",
          color,
          strokeWidth: sw,
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          width: Math.abs(b.x - a.x),
          height: Math.abs(b.y - a.y),
        };
      default:
        return null;
    }
  }

  // --- pinch zoom (touch) ---
  // TODO(spec FR-9 / TC-30): pinch tracks two pointers and anchors on the
  // midpoint; verify precision on iPad Safari against the 50-400% bound.
  function pointerPair(): Array<{ x: number; y: number }> {
    return Array.from(activePointers.values()).slice(0, 2);
  }
  function beginPinch(): void {
    const pair = pointerPair();
    if (pair.length < 2) return;
    pinchStartDist = distance(pair[0], pair[1]);
    pinchStartZoom = zoomPercent;
    // Anchor the canvas point under the starting midpoint for the whole
    // gesture. Re-deriving it every move would cancel out two-finger panning.
    const midClient = { x: (pair[0].x + pair[1].x) / 2, y: (pair[0].y + pair[1].y) / 2 };
    const rect = canvas.getBoundingClientRect();
    pinchAnchorCanvas = displayToCanvas(
      { x: midClient.x - rect.left, y: midClient.y - rect.top },
      viewport,
    );
    drawingPointerId = null;
    preview = null;
  }
  function updatePinch(): void {
    const pair = pointerPair();
    if (pair.length < 2 || pinchStartDist <= 0) return;
    const d = distance(pair[0], pair[1]);
    const factor = d / pinchStartDist;
    const midClient = { x: (pair[0].x + pair[1].x) / 2, y: (pair[0].y + pair[1].y) / 2 };
    const rect = canvas.getBoundingClientRect();
    applyZoom(
      pinchStartZoom * factor,
      { x: midClient.x - rect.left, y: midClient.y - rect.top },
      pinchAnchorCanvas,
    );
  }

  function onWheel(event: WheelEvent): void {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    applyZoom(zoomPercent + (event.deltaY < 0 ? 25 : -25), anchor);
  }

  // --- text overlay (FR-7) ---
  let textOverlay: HTMLTextAreaElement | null = null;

  function openTextOverlay(
    canvasPt: { x: number; y: number },
    clientX: number,
    clientY: number,
  ): void {
    const fontSize = fontSizeFor(longSide, level);
    const displaySize = fontSize * viewport.scale;
    const rectPt = toDisplayPoint(clientX, clientY);
    const area = el("textarea", { class: "kp-ia-text-overlay" }) as HTMLTextAreaElement;
    area.style.left = `${rectPt.x}px`;
    area.style.top = `${rectPt.y}px`;
    area.style.fontSize = `${Math.max(12, displaySize)}px`;
    area.style.color = color;
    area.style.minWidth = "80px";
    area.style.minHeight = `${Math.max(20, displaySize * 1.2)}px`;
    wrap.appendChild(area);
    textOverlay = area;
    window.setTimeout(() => area.focus(), 0);

    const commitText = (): void => {
      const value = area.value;
      closeTextOverlay();
      const shape = createTextShape({ color, fontSize, x: canvasPt.x, y: canvasPt.y, text: value });
      if (shape) commit([...currentShapes(), shape]);
    };
    area.addEventListener("keydown", (ev) => {
      if (ev.isComposing) return; // IME (EC-14)
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        commitText();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        closeTextOverlay();
      }
    });
    // Outside click confirms.
    area.addEventListener("blur", () => commitText());
  }

  function closeTextOverlay(): void {
    if (textOverlay) {
      const area = textOverlay;
      textOverlay = null;
      area.remove();
    }
  }

  // --- keyboard ---
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === " " && !textOverlay) {
      spaceDown = true;
      updateCursor();
      return;
    }
    if (textOverlay || event.isComposing) return; // no shortcuts while typing (FR-8)
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      doUndo();
    } else if (
      mod &&
      ((event.key.toLowerCase() === "z" && event.shiftKey) || event.key.toLowerCase() === "y")
    ) {
      event.preventDefault();
      doRedo();
    }
  }
  function onKeyUp(event: KeyboardEvent): void {
    if (event.key === " ") {
      spaceDown = false;
      updateCursor();
    }
  }

  // --- save (FR-11) ---
  let saving = false;
  async function doSave(): Promise<void> {
    if (saving || currentShapes().length === 0) return;
    saving = true;
    saveBtn.disabled = true;
    saveBtn.textContent = "保存中...";
    hideError();
    const output = decideOutput(session.contentType);
    try {
      const blob = await rasterizeToBlob(
        session.bitmap,
        session.canvasWidth,
        session.canvasHeight,
        currentShapes(),
        output,
      );
      const result = await callbacks.onSave({
        blob,
        output,
        shapes: currentShapes(),
        canvasWidth: session.canvasWidth,
        canvasHeight: session.canvasHeight,
      });
      if (result.ok) {
        toast("注釈済み画像を保存しました", "success");
        cleanup();
        modal.close();
        return;
      }
      showError(result.message);
    } catch {
      showError("保存に失敗しました。通信環境を確認してやり直してください");
    } finally {
      saving = false;
      saveBtn.textContent = "保存";
      updateHistoryButtons();
    }
  }

  // --- close (FR-14) ---
  async function requestClose(): Promise<void> {
    if (textOverlay) {
      closeTextOverlay();
      return;
    }
    // Any unsaved change prompts, including a clear-all that left zero shapes.
    if (dirty) {
      const ok = await confirmDialog({
        message: "注釈が保存されていません。閉じますか？",
        confirmLabel: "閉じる",
        cancelLabel: "編集に戻る",
      });
      if (!ok) return;
    }
    cleanup();
    modal.close();
  }

  // --- lifecycle ---
  function onResize(): void {
    resetViewport();
    render();
  }

  function cleanup(): void {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerCancel);
    canvas.removeEventListener("wheel", onWheel);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("resize", onResize);
    session.bitmap.close();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("resize", onResize);
  modal.onRequestClose(() => void requestClose());

  updateHistoryButtons();
  // Defer initial layout until the modal has size.
  window.setTimeout(() => {
    applyZoom(100);
    resetViewport();
    render();
  }, 0);
}
