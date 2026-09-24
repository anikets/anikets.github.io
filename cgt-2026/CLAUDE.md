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

## chandrabhaga-glaciers-3d-slideshow.html

Combines this file's curated slideshow (photos/clips pinned to route points,
Aug 2026 dates) with `chandrabhaga-glaciers-3d.html`'s CesiumJS flight over
Google Photorealistic 3D Tiles, replacing that file's 2D map inset with real
terrain. It drops the 3D file's time/EXIF photo matching entirely — `trek`,
`pix[].idx` and `CLIPS[].place.idx` are identical across all three files, so
photos and clips index straight into the same 1,523-point path regardless of
which file draws it.

**Rendering architecture.** Like this file, everything that appears in an
export is drawn on one 1080×1920 `<canvas>` — there is no DOM overlay. The
Cesium viewer lives in an off-screen host div (`useDefaultRenderLoop:false`,
`preserveDrawingBuffer:true`), and one `requestAnimationFrame` loop
(`tick`/`renderAt` in the script) runs continuously, whether playing or
paused: it positions the camera for the current time, calls `viewer.render()`,
`drawImage`s the Cesium canvas onto the visible 2D canvas, then draws the
photo/clip/caption/title/stats/footer on top with 2D canvas code. That keeps
`captureStream()` export working without tab capture — confirmed in-browser
(pasting the key and checking `cv.toDataURL()` doesn't throw) before the
layouts were built, since Google's tiles being CORS-clean is what makes this
approach possible at all; if that ever regresses, the 3D file's `getDisplayMedia`
tab-recording fallback is the way out.

**Three layouts**, switchable live at any seek position via the Layout
dropdown (`LAYOUT` in the script, `composeLayout()`):
- **A · Cut to photo** — full-frame 3D; at each stop the photo/clip
  cross-fades in over a darkened backdrop, camera keeps drifting underneath.
  Media shows only while the walk is stopped for it (the pre-walk slideshow,
  each route item's hold, the closing photo) and fades out while the route
  plays; see `cutSpans()`/`cutPhotoAlpha()`. The photo box shrinks to each
  item's own aspect, vertically centred (`tightBox()`), so landscape shots
  leave the terrain visible above and below them instead of a blurred
  letterbox fill. Layouts B and C still use the fixed box plus blur fill.
- **B · Card over 3D** — full-frame 3D stays visible; a floating card
  (~470px, top-left) holds the current photo/clip, caption and a stat row
  (altitude/distance/climbed/high point).
- **C · Split** — 3D fills a top band under the title; the bottom band always
  shows the current or last photo (falls back to the first `pre` photo before
  the walk reaches its first route photo).

All three share the canvas-drawn title block (ported from the 3D file's HTML
typography), the day chip and progress bar, the footer, and the Google credit
line (see below). A camera dropdown (chase/side/high, `CAMS`) and the seek
slider/Slide buttons work the same across all three, since they all key off
one shared `SCHED`/`head`.

**Before the walk starts** (`t < SCHED.preT`, while the approach photos show),
the camera does a slow wide orbit around path point 0 instead of the usual
forward chase — the route polyline stays hidden until the walk begins, so the
terrain alone carries the opening shot.

**API key.** Paste-once-and-remember, same as `chandrabhaga-glaciers-3d.html`
— in fact the same `localStorage` key (`chandrabhaga_gmaps_key`), so pasting
it on either file covers both. **This is a deliberate exception to this
directory's "don't use localStorage" rule above**, scoped only to the Google
Maps API key gate in this file and its 3D sibling; nothing else in either file
touches browser storage. The key is never written into any committed file —
GitHub Pages is public.

**Free-tier / quota hygiene.** The tileset is created once per page load and
never recreated on layout, duration, camera or seek changes, or on replay —
check DevTools Network for a single `tileset.json` request per session if
this ever needs re-verifying. In Cloud Console, restrict the key by HTTP
referrer (`http://localhost:*`) and by API (Map Tiles API only), and set a
daily quota cap on Map Tiles API so going over the free monthly allowance for
Photorealistic 3D Tiles is impossible rather than just alerted — that
allowance counts root-tileset sessions, which is why the one-session-per-load
rule matters. Avoid keeping several tabs of this page (or the 3D file) open
at once.

**Attribution.** Google's terms require the credit text and logo to stay
visible. `creditLine()` draws it every frame, in every layout, reading
`tileset.credits` when available and falling back to a static "Map data
©2026 Google" line — don't remove or hide this call from any future layout.

**Known simplification vs. the original plan:** the Cesium render always
happens at the full frame size; layout C's split view crops/scales that
full render into its band with `drawImage` rather than resizing the
Cesium viewport per layout. Simpler and safer than juggling `viewer.resize()`
across layout switches, at the cost of rendering a bit more than the split
view actually uses. Revisit if that resolution cost ever matters.

**Frames.** The Frame dropdown offers 9:16 reel (default), 4:5 feed and 16:9
fullscreen; `setSize()` changes `W`/`H` and the canvas bitmap. The `#c` CSS
must stay `width:100%;height:100%` — it was once hardcoded to 1080×1920 px,
which left the 16:9 preview half-black while exports looked fine. When
`W > H`, layout C splits left/right (map left, photo right) instead of
top/bottom, and the route progress bar runs vertically down the centre seam.
Crop maths must read the Cesium canvas's own `width`/`height`, not `W`/`H`,
because devicePixelRatio can make them differ.

**Cover slide** (`drawCoverSlide`, first `COVER_DUR` seconds, no fade-in):
the map half shows the whole route. `drawSchematicRouteMap` draws it instantly
on a dark background, and `coverMapPoller` (run from `boot()`'s tiles-loaded
interval) swaps in a top-down Cesium capture once `tileset.tilesLoaded` is
true. The result is cached per size in `COVER_MAP_CACHE`. Don't move the
Cesium camera for this capture every frame, because that fights `renderAt`'s
own camera and stops tiles from ever loading.

**Elevation profile** (`elevProfile(rect, alpha)`): drawn straight over the
map with no panel. It shows the whole trek as a silhouette (dark translucent
fill for contrast), the walked part filled in day colours, a head marker,
and a header with distance walked / total km and the live elevation. The
profile line carries a dark shadow for legibility over bright terrain.

**Map labels** (day chip, profile header, Google credit) sit on a
semi-transparent black rounded background (`labelPill()`), not a drop shadow
or text outline. Use the same helper for any new text drawn over the map. It replaces the
distance/elevation readouts that used to sit under the caption. The
"route approximate" disclaimer moved from under the caption to the end of the
Google credit line (`creditLine()`), so it still shows on every frame in
every layout. Keep it there. The "Google ·" prefix is only added when the
tileset's own credit text doesn't already say Google. The music credit is
deliberately not drawn in the video (it took too much room); it goes in post
captions instead (see the talking points below). Each layout passes its own
rect, always over map and clear of photos and the 16:9 centre progress bar.
A: above the caption, left half in 16:9, shown only while the route plays.
B: under the card if there's room (9:16), else beside it (4:5), or the right
half (16:9). C: bottom of the map half. Hidden during the pre-walk slideshow
(`profileAlpha`).

**Audio.** `assets/audio/bg.mp3` plays with Play and is mixed into the
recorded video. It is "Cinematic Ambient" by Kulakovka
(https://pixabay.com/music/pulses-cinematic-ambient-274889/), under the
Pixabay Content License. Credit isn't required but is given anyway: in a
comment above `BG_AUDIO_SRC` and a "Music:" line in the control bar. Keep
both if the track stays, and update them if it changes. The licence forbids
distributing the file on its own, so only commit it alongside the page that
uses it.

## Siblings

- `chandrabhaga-glaciers-3d.html` — same route flown over Google photorealistic
  3D tiles via CesiumJS. Needs a Google Maps API key with Map Tiles enabled.
  Its own photo matching is still time-first and would misplace these photos —
  `chandrabhaga-glaciers-3d-slideshow.html` (above) is the version that fixes
  that by reusing this file's pinned photo indices instead.
- `chandrabhaga-glaciers-3d-slideshow.html` — the 3D flight plus this file's
  curated slideshow, combined. See its own section above.
- `chandrabhaga-glaciers-earth.kmz` — Google Earth Pro tour of the same route.
- `chandrabhaga-glaciers-route.html` — the original flat map version, no photos.

## Talking points for posts (LinkedIn / Instagram / X)

Use this section when drafting posts about this project. The main readers are
hiring managers and recruiters. Investors, customers and peers come second.
Only claim what is true in the code. Don't invent numbers like views, hours
saved or users.

**Headline story.** A trek video generator, built for fun, running entirely in
the browser. It flies the real GPS route over Google's photorealistic 3D
terrain, places each photo where it was taken, and exports a ready-to-post
video. There is no server, no framework and no video editor.

**What it shows (for hiring managers and recruiters):**
- **Shipped end to end.** It went from idea to a working tool used for real
  posts, in one self-contained HTML file.
- **Sound architecture choice.** Everything is drawn on one canvas, so the
  browser can record the video directly. No screen recording, and a single
  source serves 9:16 reel, 4:5 feed and 16:9 formats.
- **Risk handled first.** The riskiest assumption (can the 3D terrain be
  exported as video at all?) was tested before any layout work began.
- **Cost and compliance.** One map-tile session per page load, a key limited
  by referrer and API, a daily quota cap so going over the free tier is
  impossible, and Google's credit visible in every frame.
- **Debugging method.** For the half-black 16:9 preview, reading the canvas
  pixels proved the drawing was correct, which narrowed the bug to one line
  of CSS.
- **Judgement about data.** Photos are pinned to route points by hand, not
  matched by timestamp, because timestamp matching put them in the wrong
  places.
- **Working with AI.** Built with Claude Code as a pair programmer. The human
  set direction, taste and acceptance criteria, and checked the results in a
  real browser. Present this as leverage and judgement, not "AI built it".

**For secondary readers:**
- Investors and customers: fast from idea to usable output, early attention to
  running costs, and knowing what to leave out.
- Peers: CesiumJS with `useDefaultRenderLoop:false`, drawing the WebGL canvas
  into a 2D canvas, `captureStream()` export, devicePixelRatio-safe cropping,
  and the CSS-size vs bitmap-size bug.

**Trek facts** (as the cover slide shows them): Chandrabhaga Glaciers, Lahaul,
2–7 Aug 2026, with Indiahikes. High point 5,311 m, 29.5 km over 3 walking days,
2,154 m gained. Re-check against the cover slide if the data changes.

**By platform:**
- **LinkedIn:** a short builder story (problem → key decision → one lesson),
  with the 16:9 or 4:5 export attached. End with one concrete lesson, not a
  list of technologies.
- **Instagram:** the 9:16 reel leads with the trek. Keep the tech to one or two
  lines at the end of the caption.
- **X:** a hook line plus the video, then an optional short thread with 2–3
  technical details from the peers list.

**Music credit:** end every post caption with
`Music: "Cinematic Ambient" by Kulakovka (Pixabay)`. On Instagram/YouTube,
if a copyright claim appears anyway, the track's Pixabay page is the proof
of licence.

**Don't:** show the API key or its entry screen, crop out the Google credit,
or call it a product or startup. It is a personal build.
