# kintone-image-annotator

Documentation in Japanese: [README.ja.md](./README.ja.md)

Draw arrows, shapes, and text on an image stored in a kintone attachment field,
then save the annotated copy back into the same field. The original file stays,
so the state before the markup is always available.

The plugin runs on the record detail screen. It reads and writes only through
the kintone REST API under the signed-in user's session. It sends nothing to any
external server and stores no data outside kintone.

## What it does

- Adds a "注釈を追加" button after each configured attachment field, but only
  when the current user can edit the record.
- Opens a picker of the attachments. JPEG, PNG, WebP, and GIF can be annotated;
  other types are shown greyed out.
- Opens an editor with six tools (pen, line, arrow, rectangle, ellipse, text),
  six preset colors, three stroke widths, undo/redo (50 steps), clear-all, and
  zoom/pan (50-400%).
- On save, rasterizes the image plus the shapes, uploads it as a new file named
  `<name>_annotated_<timestamp>.<ext>`, and adds it to the same attachment field.
  JPEG sources stay JPEG at quality 0.9; PNG, WebP, and GIF are written as PNG
  and keep transparency.
- Optionally stores the vector shape data in a text field so an annotated image
  can be re-opened and edited later.

## Screens

- Record detail: supported.
- Record list, create, and edit: not supported (attachments there have no stable
  file key yet).
- Mobile: not supported. Touch input is served through the iPad desktop view.

## Installation

1. Build the plugin bundle:
   ```
   npm install
   npm run build
   npm run pack
   ```
   `npm run pack` writes `dist/plugin.zip`. On the first run it also creates
   `private.ppk`, the signing key. Keep `private.ppk`; reuse it for later builds
   so the plugin id stays the same. It is git-ignored.
2. In kintone, open the system or per-app plugin settings and upload
   `dist/plugin.zip`.
3. Add the plugin to the target app.

## Configuration

Open the plugin settings for the app.

- Target attachment fields (required): check one or more attachment fields. The
  button appears after each selected field.
- Annotation data field (optional): choose a multi-line text field, or leave it
  at "保存しない". When set, the plugin writes shape data into that field so
  annotated images can be re-edited. The plugin uses this field for itself; do
  not edit it by hand.

Field references are stored by field code, so renaming a field's label does not
break the configuration.

## How it works

- File naming: the annotated file is `<original-name>_annotated_<YYYYMMDD-HHmmss>`
  with the JPEG extension kept for JPEG sources and `png` for everything else.
- Re-editing: when a data field is configured, a "再編集" badge marks images that
  have stored shape data. Selecting one loads the original source image and
  restores the shapes as editable objects. If the original source is gone, the
  annotated image opens for direct drawing instead.
- Attachment safety: kintone replaces the whole attachment field on update. The
  save flow re-fetches the record, keeps every existing file key, and appends
  the new one, so no existing attachment is dropped. Updates use the record
  revision for optimistic locking; a conflicting change stops the save and asks
  the user to reload.
- Storage: shape data lives in the configured record field. The plugin does not
  use localStorage. In-progress edits are discarded when the editor is closed.

## Limitations

- Existing shapes cannot be selected, moved, resized, or deleted individually.
  The only correction tools are undo and clear-all. Committed text cannot be
  re-edited; undo it and type again.
- No fill for rectangles and ellipses, no font choice, no bold or italic, no
  stamps, mosaic, rotation, or cropping.
- Text is rendered in the device `sans-serif` font, so exact glyphs depend on
  the machine that saved the image.
- Images with a long side over 8000px are downscaled to 8000px for editing, and
  the saved file uses that reduced size.
- Animated GIF is annotated on its first frame only and saved as PNG. PDF, HEIC,
  and TIFF cannot be annotated.
- Mobile screens are not supported.

## TODO

- Add screenshots and a short GIF of the annotate-and-save flow to this README
  (see `docs/release-checklist.md` for the shots to capture).
- Editor rendering redraws all shapes on each pointer move
  (`// TODO(spec 9 perf)` in `src/desktop/editor.ts`). A diff-drawn preview
  layer is planned for heavy pen use on large images.
- Verify pinch-zoom precision on iPad Safari
  (`// TODO(spec FR-9 / TC-30)` in `src/desktop/editor.ts`).
- Lint uses `@typescript-eslint` directly. The shared `@cybozu/eslint-config`
  house preset is the intended base and can replace `.eslintrc.cjs` once its
  peer dependencies are pinned.
- Unit tests cover the `core/` logic (35 cases). The `desktop/` and `kintone/`
  layers are exercised by the Playwright specs in `test/e2e` and the manual
  matrix, not by unit tests.

## Development

```
npm install       # install dependencies
npm run typecheck  # tsc --noEmit
npm test           # vitest (unit tests for core/)
npm run build      # build dist/desktop.js and dist/config.js
npm run lint       # eslint
npm run pack       # build then create dist/plugin.zip (and private.ppk)
```

E2E specs live in `test/e2e` and run against a development kintone environment.
They read `KINTONE_BASE_URL`, `KINTONE_USERNAME`, `KINTONE_PASSWORD`, and
`KINTONE_APP_ID` from the environment and skip when those are absent. They are
not part of CI.

## License

MIT. See [LICENSE](LICENSE).
