# KronoFrise icon

The selected direction is a folded timeline ribbon with three colored eras,
event markers and a right-facing arrow. The Tahoe revision replaces parchment
and brass with smooth translucent surfaces and pearlescent highlights.

## Files

| File | Use |
| --- | --- |
| `kronofrise-tahoe-source.png` | Original full-resolution generated artwork |
| `kronofrise-1024.png` | 1024 × 1024 sRGB RGBA master |
| `tauri/icon.icns` | Static macOS icon, ten standard/Retina representations |
| `tauri/icon.png` | 512 × 512 RGBA desktop PNG |
| `tauri/32x32.png`, `128x128.png`, `128x128@2x.png` | Tauri bundle PNG sizes |
| `../../public/icons/icon-192.png`, `icon-512.png` | PWA icons |
| `../../public/apple-touch-icon.png` | 180 × 180 Apple touch icon |
| `../../public/favicon.ico` | 16, 32 and 48 px PNG representations |
| `../../public/icons/icon-16.png`, `icon-32.png`, `icon-48.png` | Individual favicon PNGs |
| `kronofrise-parchment-concept.png` | Earlier concept, retained for comparison; not used by the app |

The web head references the favicon, touch icon and manifest. URLs support
Vite's configured base path. The manifest supplies icon metadata only: this
change does not add an offline service worker or complete the PWA milestone.

The artwork is full bleed, with no baked-in outer rounded corners. PWA entries
use `purpose: any`; they are not advertised as maskable because the ribbon
extends beyond the guaranteed circular safe zone.

These are flattened, Tahoe-inspired raster assets, not a native layered
`.icon` document. They cannot dynamically change glass lighting or supply
separate dark, clear and tinted appearances. When adding the native shell,
prepare the background, ribbon and markers as separate layers in Icon Composer
and check the final system mask. The square ICNS is a static fallback, not a
claim of a completed native Tahoe icon integration.

## Re-export

On macOS, from the repository root:

```sh
swift scripts/export-icons.swift
```

The script only resamples and encodes the selected source; it does not generate
or redesign artwork. It emits explicit sRGB RGBA PNGs and packages ICO/ICNS
representations. The future Tauri shell can copy `tauri/` into
`src-tauri/icons/` and reference these files in `bundle.icon`.

## References

- [Apple Icon Composer](https://developer.apple.com/icon-composer/)
- [Creating your app icon using Icon Composer](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer)
- [Tauri app icons](https://v2.tauri.app/develop/icons/)
- [MDN: defining app icons and maskable safe zones](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons)

## Generation provenance

Artwork generated using the built-in `image_gen` tool, then mechanically
resampled/encoded using CoreGraphics and ImageIO. No API/CLI generation fallback
was used. The final edit used the parchment concept as its reference.

Final prompt:

```text
Use case: style-transfer.
Edit the reference KronoFrise timeline ribbon icon into a convincing macOS Tahoe / Apple Liquid Glass app icon.
PRESERVE the recognizable compact folded ribbon timeline concept, three historical era bands, a right-facing arrow endpoint, and milestone markers. User liked this concept but wants it to fit macOS Tahoe rather than look antique.
TRANSFORM the visual language substantially: replace all rough parchment, grainy terracotta and aged brass with pristine smooth opal glass, translucent colored glass, and softly luminous rounded details. Much shallower depth and almost frontal view, like layered artwork in Apple Icon Composer, NOT a realistic physical sculpture. Keep the ribbon as a compact elegant flowing S with three horizontal folds, aligned within a square. The ribbon surfaces are milky-white frosted glass with subtle warm translucency and fine polished beveled edges. Era bands are softly saturated coral/terracotta, honey amber, and cool slate blue, with subtle light transmitting through them. Replace long brass sewing pins with three low-profile small pearlescent round event nodes connected by very short stems, visually integrated into the timeline. A few extremely clean ruler ticks only.
Composition: optically centered emblem occupying approximately 66% canvas width and 62% canvas height, ALL important content comfortably inside a central circle 78% of the canvas diameter for app-icon masks. Strong silhouette readable in a Dock.
Background: continuous full-bleed square warm coral-to-terracotta soft gradient, clean and luminous, no grain, no texture. The square canvas should be filled edge to edge, no surrounding desktop or frame. The OS will apply rounded-square clipping later.
Lighting: characteristic Tahoe Liquid Glass look — smooth translucent layers, restrained soft specular rim highlights, subtle refraction, gentle close contact shadows, bright clean upper-left lighting. Elegant and controlled; NOT excessively glossy, chrome, neon, holographic or rainbow.
Output one high-resolution square production icon image, no text, no dates, no lettering, no watermark, no checkerboard, no outer margins, no rendered device. Avoid aged materials, paper texture, harsh shadows, clutter and the over-simplified flat arrow of the earlier attempt.
```
