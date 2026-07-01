import { createModal, el } from "./ui";

export const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export interface SelectableFile {
  name: string;
  contentType: string;
  fileKey: string;
  /** True when the annotation data field has a re-editable entry for this file. */
  reEditable: boolean;
}

export interface SelectModalCallbacks {
  /** Load a thumbnail object URL for a supported file, or null on failure. */
  loadThumbnail: (file: SelectableFile) => Promise<string | null>;
  /** User picked a file to annotate. */
  onPick: (file: SelectableFile) => void;
}

/** Image selection modal (FR-3). */
export function openSelectModal(files: SelectableFile[], callbacks: SelectModalCallbacks): void {
  const modal = createModal({ title: "注釈する画像を選択", width: "720px" });
  modal.body.classList.add("kp-ia-select-body");
  modal.onRequestClose(() => modal.close());

  const hasSupported = files.some((f) => SUPPORTED_TYPES.has(f.contentType));
  if (!hasSupported) {
    modal.body.appendChild(
      el("p", {
        class: "kp-ia-empty",
        text: "注釈できる画像がありません。対応形式: JPEG、PNG、WebP、GIF",
      }),
    );
  }

  const grid = el("div", { class: "kp-ia-grid" });
  modal.body.appendChild(grid);

  for (const file of files) {
    const supported = SUPPORTED_TYPES.has(file.contentType);
    const thumb = el("button", {
      class: supported ? "kp-ia-thumb" : "kp-ia-thumb kp-ia-disabled",
      type: "button",
      title: file.name,
      disabled: !supported,
      "aria-label": file.name,
    });

    const img = el("div", { class: "kp-ia-thumb-img" });
    thumb.appendChild(img);

    if (file.reEditable && supported) {
      thumb.appendChild(el("span", { class: "kp-ia-badge", text: "再編集" }));
    }
    thumb.appendChild(el("div", { class: "kp-ia-thumb-name", text: file.name }));
    if (!supported) {
      thumb.appendChild(
        el("div", { class: "kp-ia-thumb-note", text: "この形式には注釈できません" }),
      );
      thumb.title = "この形式には注釈できません";
    }

    grid.appendChild(thumb);

    if (supported) {
      thumb.addEventListener("click", () => {
        modal.close();
        callbacks.onPick(file);
      });
      // Load thumbnail lazily.
      void callbacks.loadThumbnail(file).then((url) => {
        if (url) {
          const image = el("img", {
            class: "kp-ia-thumb-img",
            alt: file.name,
            src: url,
          }) as HTMLImageElement;
          img.replaceWith(image);
        }
      });
    }
  }
}
