# CLAUDE.md — chandrabhaga-glaciers-photos.html

Context for anyone (including a future Claude session) picking this file up.

## What it is

A single self-contained HTML file that animates a trek: photos play as a
slideshow while a route line draws itself on a small map inset, synced so each
photo appears at the point on the route where it was taken. It exists to be
**recorded as a video** for Instagram, WhatsApp Status and X. It is not a
website and not a gallery — every design decision serves "this will be a
30–150 second vertical video".

Trek: Chandrabhaga Glaciers, Lahaul, 2–7 August 2026, with Indiahikes.

## The three data blocks

Everything lives in one file. Open it in a text editor and you'll find:

1. `<script id="trek" type="application/json">` — the route. Path points
   `[lat, lon, elevation, dayIndex]`, cumulative distance, cumulative climb,
   recce waypoints, ghost tracks, day labels. Derived from a GaiaGPS recce GPX
   that someone else recorded in June 2025.
2. `<script id="pix" type="application/json">` — the photos, each entry a
   `src` (relative path into `cgt-2026/assets/img/`, e.g.
   `assets/img/photo-09-route-278.jpg`) plus `w`, `h`, `slot`, `idx`, `time`,
   `date`, `alt`, `cap`, optional `sub`. Photos used to be embedded as base64
   JPEG data URLs directly in this block (that's why older commits show the
   file at ~6.5 MB); they were externalized to keep the HTML file small and
   diffable. `w`/`h` are the actual pixel dimensions of the file, used for
   layout before the image finishes loading — keep them in sync if you replace
   a photo. File naming is `photo-<order-in-array>-<slot>[-<idx>].jpg`; order
   matches the array (chronological), and `idx` (when not `pre`/`post`) is the
   route path index the photo is pinned to. Because `src` is now a relative
   URL, `loadPix()`'s `new Image(); im.src = ph.src` requires the page to be
   served over localhost, same as the clip-loading note below — `file://`
   works too for plain display but the canvas export path taints on local
   files, so always serve for anything beyond a quick look.
3. `const CLIPS = [...]` near the top of the main script — video clip config,
   including a `src:` path for each clip (e.g. `assets/video/river-waves.mp4`).
   The clip files themselves are **not** embedded in the HTML — they're
   separate `.mp4` files committed under `cgt-2026/assets/video/` and
   auto-load on page load. The manual "Clips" row in the control bar still
   exists as a fallback:
   pick a local file there to override a bundled clip, e.g. to test new
   footage before converting/committing it.

## How photos got their positions

Important and easy to get wrong. The photo timestamps (Aug 2026) do **not**
overlap the recce GPX's waypoint times (June 2025), so time-based matching
fails. Placement was done offline in Python:

- Photo date → trek day (4 Aug = day 1, 5 Aug = day 2, 6 Aug = day 3).
- Within that day's slice of the path only, find the nearest point to the
  photo's EXIF GPS.
- Force monotonic order within the day using photo times, so out-and-back legs
  don't snap backwards.
- 2–3 Aug photos become `slot:'pre'` (the approach at Darcha), 7 Aug becomes
  `slot:'post'` (walking out at Baralacha La).

Most landed within 25 m of the line; a few on the pass day are 90–220 m off
because the recce line differs from where he actually walked.

**The photos are the ground truth. The route is approximate.** The footer says
so, and it should stay saying so.

## How it draws

One `<canvas width=1080 height=1920>`, scaled to fit with a CSS transform.
Everything — text, images, route, video frames — is drawn onto that canvas.
There is no DOM overlay, deliberately: the built-in "Save video" button uses
`canvas.captureStream()` + `MediaRecorder`, which only captures canvas pixels.
Anything drawn as HTML would be missing from the export.

Frame pipeline, in `draw(t)`:

```
backdrop → titleBar → hero (photo/clip) → placeInset → route + head marker
        → captionBar → bottomRow + footer (both inside a glide transform)
```

Key functions:

- `layout()` — all geometry. Regions are computed from a safe band
  (`bandTop`/`bandBot`) so Instagram's own UI doesn't cover anything important.
- `buildSchedule(duration)` — builds `tIn[]`/`tOut[]` per path index. The walk
  pauses (`HOLD`) at every photo and clip. Approach photos run before the walk
  starts; the closing photo runs after it ends.
- `headAt(t)` — binary search into the schedule, returns `{i, f}`.
- `pickPhoto(t)` — returns the current media item, `{kind:'photo'|'clip', ...}`.
- `photoPanel` / `drawPhoto` — cross-fades between items, records `mediaRect`.
- `placeInset` — moves the map inset to sit inside the current image, then
  re-projects.
- The frame is fixed: caption, progress rule, number line and footer never move,
  whatever the shape of the current image. Images are centred inside a 960x1000
  box, so portrait shots fill it and landscape shots leave an even margin above
  and below. An earlier version let the lower block follow each image's height —
  it removed dead space but the movement between portrait and landscape read as
  distracting, so don't reintroduce it. The map inset does follow the image, since
  it sits on the picture.

## Editing safely

Fine to change:

- Captions: `"cap"` and `"sub"` in the `pix` block. Keep `cap` under ~38
  characters or it auto-shrinks; `sub` fits about 58.
- Clip trims, placement and captions: the `CLIPS` array. `rate: 0.5` if a
  slow-motion file plays at full speed. `crop:'square'` centre-crops.
- Day labels: `days` in the `trek` block.
- Run length: the dropdown (120/150/180 s). Holds shrink automatically as more
  items are added.

Don't:

- **Don't reformat or pretty-print the file.** The two JSON blocks are single
  enormous lines; a formatter will try to wrap them.
- **Don't use localStorage or any browser storage.** Nothing needs it, and it
  fails in some embedded viewers.
- **Don't add HTML overlays** for anything that must appear in the video (see
  canvas note above).
- **Don't reintroduce the recce waypoint clock times** into the captions or the
  log. They belong to someone else's June 2025 walk and were removed for that
  reason.
- **Don't re-sort the `pix` array.** It's in chronological order and route items
  are keyed by `idx` into the path.
- Don't crop the user's photos to fill space. Empty margin is preferred over
  cutting into a picture.

## Clips

Four slots — `river-waves.mp4`, `the-drive.mp4`, `pushups.mp4`,
`snow-throw.mp4` — committed under `cgt-2026/assets/video/` and referenced by
`src:` in `CLIPS` as `assets/video/<file>.mp4`. They auto-load on page load;
no manual step needed for a normal run. Each was prepared with ffmpeg before committing: re-encoded to
H.264 (iPhone HEVC `.mov` may not decode in Chrome's canvas pipeline), muted
(clips always render `muted=true` anyway), and stripped of EXIF/GPS metadata:

```
ffmpeg -i in.mov -map_metadata -1 -c:v libx264 -crf 20 -pix_fmt yuv420p -an out.mp4
```

`the-drive.mp4` also had to be trimmed to just its used window (`-ss`/`-to`)
to fit under GitHub's 100 MB file limit. If you replace a clip with a longer
one, check the committed file size and, if you trim it, update that clip's
`start`/`end` in `CLIPS` to match — trimming resets the output file's internal
clock to 0, so an untrimmed offset will point at the wrong frames.

The Clips row in the control bar is a manual override, not the primary path:
click a clip's button to attach a different local file instead of the bundled
one. Because a local video drawn onto a canvas can taint it under `file://`,
**serve the folder over localhost** before using Save video or any export
button:

```
cd <folder> && python3 -m http.server 8123 --bind 127.0.0.1
```

## Recording

Play (or Space), F11 for full screen, then screen record; or use one of the
export buttons for a clean 1080×1920 WebM straight from the canvas:

- **Save video** — no watermark.
- **Export for Instagram** / **Export for Twitter** — the same recording, but
  stamps a small handle watermark (`@aniketsur` / `@44Sur`) onto the
  bottom-right corner of the photo *only while recording* — `WATERMARK` is set
  for the duration of `recordVideo()` and cleared in its `onstop`, so the live
  editor view never shows it. Both force the 9:16 frame regardless of the
  current Frame dropdown.

All three download WebM; Instagram won't take that container, convert first:
`ffmpeg -i in.webm -c:v libx264 -pix_fmt yuv420p out.mp4`.

Frame options are 9:16 reel and 4:5 feed. The Safe area toggle shows where
Instagram's controls sit.

## Jumping between slides

Reviewing one specific photo or clip used to mean playing through from the
start. The control bar has a **seek slider** plus **◀ Slide / Slide ▶**
buttons (also ← / → when the slider isn't focused):

- The slider spans `0` to `SCHED.total` and scrubs to any arbitrary time.
- Slide-jump snaps to the exact start of the previous/next photo or clip, from
  `SCHED.jumps` — the sorted union of `SCHED.preAt[].start` (approach items)
  and `SCHED.tIn[idx]` for each item in `SCHED.RI` (on-route items). It's
  rebuilt every time `buildSchedule()` runs, so it stays correct as the route,
  photo count or clip placement changes.
- Everything that changes `cur` funnels through one `seekTo(t)` (next to
  `play`/`stop` in the transport section), which pauses playback if running,
  redraws that frame, and updates the slider/time label. If you add another
  way to change the play position, route it through `seekTo` /
  `syncSeekRange` rather than setting `cur` directly — that's what keeps the
  slider from drifting out of sync with the canvas.

## Testing changes

There is no test suite. What worked during development:

- **node-canvas harness**: extract the `<script>` body, stub `document` with a
  canvas mock, register Barlow Condensed and IBM Plex Mono TTFs, call `draw(t)`
  at chosen times, write PNGs. Catches layout collisions and text overflow, which
  are the usual failures.
- **Playwright + headless Chromium** for anything involving real video, file
  inputs or `MediaRecorder`. Note the bundled Chromium has no H.264, so test
  clips must be WebM.

## Siblings

- `chandrabhaga-glaciers-3d.html` — same route flown over Google photorealistic
  3D tiles via CesiumJS. Needs a Google Maps API key with Map Tiles enabled.
  Its photo matching is still time-first and would misplace these photos.
- `chandrabhaga-glaciers-earth.kmz` — Google Earth Pro tour of the same route.
- `chandrabhaga-glaciers-route.html` — the original flat map version, no photos.
