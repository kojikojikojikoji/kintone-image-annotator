# Release checklist

Run the automated gates first: `npm run lint`, `npm run typecheck`, `npm test`,
`npm run build`. Then verify the browser x screen matrix below by hand.

## Browser x screen matrix

Legend: verify the launch button, the select modal, the editor (six tools,
undo/redo, zoom/pan), and save (attachment added, original kept, page reloads).

| Screen | Chrome | Edge | Firefox | Safari |
| --- | --- | --- | --- | --- |
| Record list (button must NOT appear) | | | | |
| Record detail (button appears after target field) | | | | |
| Record create (button must NOT appear) | | | | |
| Record edit (button must NOT appear) | | | | |
| Editor: draw with each of the six tools | | | | |
| Editor: undo / redo / clear | | | | |
| Editor: zoom (buttons, Ctrl+wheel), pan (Space drag) | | | | |
| Save: new _annotated_ file added, original kept, reload | | | | |

## iPad (touch / Apple Pencil)

| Case | Result |
| --- | --- |
| TC-29 Pencil draws, palm touch does not misdraw or scroll | |
| TC-30 Pinch zoom (50-400%), two-finger pan stays on screen | |

## Cross-cutting

| Case | Result |
| --- | --- |
| Unconfigured plugin: no console error on record detail | |
| Configured field deleted from form: other features keep working | |
| Two series plugins installed together: no CSS / DOM clash | |
| Fast list -> detail -> edit -> list: no duplicate buttons or listeners | |
| Japanese IME: Enter during conversion does not confirm text (TC-31) | |
| Mobile screen: no button, no console error (TC-32) | |
| EXIF Orientation=6 JPEG: upright in editor and output (TC-33) | |
| Animated GIF: first frame annotated, saved as PNG (TC-34) | |
| 10000px image: downscale note shown, output long side 8000px (TC-35) | |
| Revision conflict: conflict message, shapes kept (TC-36) | |
| Transparent PNG: transparency preserved, no white fill (TC-37) | |
| Double-click save: one file added, button disabled (TC-38) | |

## Package

- `npm run pack` produces `dist/plugin.zip` and, on first run, `private.ppk`.
- Keep `private.ppk` out of version control (already in `.gitignore`).
