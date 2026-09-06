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
2. `<script id="pix" type="application/json">` — the photos, as base64 JPEG
   data URLs plus `slot`, `idx`, `time`, `date`, `alt`, `cap`, optional `sub`.
   This is why the file is ~6.5 MB.
3. `const CLIPS = [...]` near the top of the main script — video clip config.
   Clips are **not** embedded; the user attaches local files at runtime.

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

Four slots, attached at runtime from the Clips row. Files stay on disk; nothing
is embedded. Because a local video drawn onto a canvas can taint it under
`file://`, **serve the folder over localhost** before using Save video:

```
cd <folder> && python3 -m http.server 8123 --bind 127.0.0.1
```

iPhone HEVC `.mov` may not decode in Chrome. Convert:
`ffmpeg -i in.mov -c:v libx264 -crf 20 out.mp4`.

## Recording

Play (or Space), F11 for full screen, then screen record; or use Save video for
a clean 1080×1920 WebM straight from the canvas. Instagram won't take WebM:
`ffmpeg -i in.webm -c:v libx264 -pix_fmt yuv420p out.mp4`.

Frame options are 9:16 reel and 4:5 feed. The Safe area toggle shows where
Instagram's controls sit.

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
