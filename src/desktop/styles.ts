/** Record-screen CSS, injected once. All ids/classes use the kp-ia- prefix. */
const CSS = `
.kp-ia-launch-btn {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 8px; padding: 6px 12px;
  font: inherit; font-size: 13px; color: #1f2933;
  background: #ffffff; border: 1px solid #d5dbe1; border-radius: 6px;
  cursor: pointer;
}
.kp-ia-launch-btn:hover { background: #f7f8fa; }
.kp-ia-launch-btn:focus-visible { outline: 2px solid #0f6db3; outline-offset: 2px; }
.kp-ia-launch-btn svg { width: 16px; height: 16px; }

.kp-ia-modal-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center;
}
.kp-ia-modal-dialog {
  background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.15);
  display: flex; flex-direction: column; max-width: 95vw; max-height: 95vh;
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif;
  color: #1f2933;
}
.kp-ia-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #d5dbe1;
}
.kp-ia-modal-title { margin: 0; font-size: 15px; font-weight: 600; }
.kp-ia-modal-close {
  border: 0; background: transparent; font-size: 22px; line-height: 1;
  cursor: pointer; color: #5f6b7a; padding: 0 4px;
}
.kp-ia-modal-close:focus-visible { outline: 2px solid #0f6db3; outline-offset: 2px; }
.kp-ia-modal-body { padding: 16px; overflow: auto; flex: 1 1 auto; }

.kp-ia-select-body { max-height: 80vh; }
.kp-ia-empty { margin: 0 0 12px; color: #5f6b7a; font-size: 13px; }
.kp-ia-grid { display: grid; grid-template-columns: repeat(auto-fill, 120px); gap: 8px; }
.kp-ia-thumb {
  position: relative; width: 120px;
  border: 1px solid #d5dbe1; border-radius: 6px; padding: 4px;
  background: #fff; cursor: pointer; text-align: center;
}
.kp-ia-thumb:hover { border-color: #0f6db3; }
.kp-ia-thumb:focus-visible { outline: 2px solid #0f6db3; outline-offset: 2px; }
.kp-ia-thumb.kp-ia-disabled { opacity: .4; cursor: not-allowed; }
.kp-ia-thumb-img {
  width: 112px; height: 112px; object-fit: cover;
  background: #eef1f4; border-radius: 4px; display: block;
}
.kp-ia-thumb-name {
  margin-top: 4px; font-size: 11px; color: #5f6b7a;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.kp-ia-thumb-note { font-size: 10px; color: #b3261e; }
.kp-ia-badge {
  position: absolute; top: 4px; left: 4px;
  background: #0f6db3; color: #fff; font-size: 11px;
  padding: 1px 6px; border-radius: 4px;
}

.kp-ia-editor-dialog { width: 90vw; height: 90vh; }
.kp-ia-editor-body {
  padding: 0; display: flex; flex-direction: column; overflow: hidden;
}
.kp-ia-toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  padding: 8px 12px; border-bottom: 1px solid #d5dbe1; background: #f7f8fa;
}
.kp-ia-tool-group { display: flex; gap: 4px; align-items: center; }
.kp-ia-tool-sep { width: 1px; align-self: stretch; background: #d5dbe1; }
.kp-ia-tool {
  border: 1px solid #d5dbe1; background: #fff; border-radius: 6px;
  padding: 4px 8px; font-size: 13px; cursor: pointer;
}
.kp-ia-tool[aria-pressed="true"] { border-color: #0f6db3; background: #e8f1f9; }
.kp-ia-tool:disabled { opacity: .4; cursor: default; }
.kp-ia-tool:focus-visible { outline: 2px solid #0f6db3; outline-offset: 2px; }
.kp-ia-swatch {
  width: 20px; height: 20px; border-radius: 50%; border: 1px solid rgba(0,0,0,.2);
  cursor: pointer; padding: 0;
}
.kp-ia-swatch[aria-pressed="true"] { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #0f6db3; }
.kp-ia-zoom { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.kp-ia-zoom-value { min-width: 48px; text-align: center; font-size: 13px; }

.kp-ia-canvas-wrap {
  position: relative; flex: 1 1 auto; overflow: hidden;
  background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 24px 24px;
}
.kp-ia-canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
.kp-ia-text-overlay {
  position: absolute; z-index: 5; border: 1px dashed #0f6db3;
  background: rgba(255,255,255,.85); font-family: sans-serif; resize: none;
  padding: 2px; box-sizing: border-box; overflow: hidden;
}

.kp-ia-footer {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px; border-top: 1px solid #d5dbe1;
}
.kp-ia-note { font-size: 12px; color: #5f6b7a; }
.kp-ia-footer-actions { margin-left: auto; display: flex; gap: 8px; }
.kp-ia-error {
  border-left: 3px solid #b3261e; background: #fff; color: #b3261e;
  padding: 6px 10px; font-size: 13px; display: flex; align-items: center; gap: 8px;
}
.kp-ia-error button { border: 0; background: transparent; cursor: pointer; color: #b3261e; }

.kp-ia-btn {
  border: 1px solid #d5dbe1; background: #fff; color: #1f2933;
  border-radius: 6px; padding: 6px 14px; font-size: 13px; cursor: pointer;
}
.kp-ia-btn:hover { background: #f7f8fa; }
.kp-ia-btn:focus-visible { outline: 2px solid #0f6db3; outline-offset: 2px; }
.kp-ia-btn:disabled { opacity: .5; cursor: default; }
.kp-ia-btn-primary { background: #0f6db3; border-color: #0f6db3; color: #fff; }
.kp-ia-btn-primary:hover { background: #0b578f; }
.kp-ia-btn-danger { border-color: #b3261e; color: #b3261e; }

.kp-ia-confirm .kp-ia-modal-header { border: 0; padding-bottom: 0; }
.kp-ia-confirm-message { margin: 0 0 16px; font-size: 14px; }
.kp-ia-confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }

.kp-ia-toast-host {
  position: fixed; top: 16px; right: 16px; z-index: 10001;
  display: flex; flex-direction: column; gap: 8px;
}
.kp-ia-toast {
  background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.15);
  border-left: 3px solid #0f6db3; padding: 10px 14px; font-size: 13px;
  border-radius: 4px; min-width: 220px;
}
.kp-ia-toast-error { border-left-color: #b3261e; }

.kp-ia-admin-notice {
  position: fixed; top: 16px; right: 16px; z-index: 10001;
  background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.15);
  border-left: 3px solid #b3261e; padding: 10px 14px; font-size: 13px;
  border-radius: 4px; max-width: 320px;
}
`;

export function injectStyles(): void {
  if (document.getElementById("kp-ia-styles")) return;
  const style = document.createElement("style");
  style.id = "kp-ia-styles";
  style.textContent = CSS;
  document.head.appendChild(style);
}
