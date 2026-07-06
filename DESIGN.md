# AUTEUR

**Your personal AI cinematographer.**

A product design document. Everything here is designed to survive five years: the brand vocabulary, the system, and every screen.

---

## Part I — The Brand

### 1. Name

**Auteur** (oh-TUR). French: *the director as the author of the film.*

The name does the positioning work by itself. Every competitor will call the AI the star — "AI-generated video," "auto-edit," "magic montage." Auteur inverts it. **The user is the director. The AI is the crew.** Every film in the app is credited:

> *Directed by Faiz Mustansar. Photographed with Ray-Ban. Edited with Auteur.*

The AI never takes credit above the line. That single decision drives the entire emotional architecture of the product: pride, ownership, growth. You don't feel like you pressed a button. You feel like you made a film — because you did. You shot every frame of it by living your day.

**Tagline:** *Directed by you.*

**The vocabulary.** Auteur commits fully to real film-industry language, never tech language. This is the brand's texture — the way Letterboxd feels like it was made by people who love cinema, not by people who love databases:

| Never say | Always say |
|---|---|
| Uploads / files / clips | **Dailies** (the raw footage from your day) |
| Processing / syncing | **Developing** |
| Output / video / export | **Film** / **Cut** |
| Notification | **Call sheet** |
| AI feedback | **Director's Notes** |
| Map | **Locations** |
| Tutorial / lessons | **Film School** |
| Year in review | **Premiere Night** |

### 2. Voice

Sparse. Warm. Film-literate. Auteur writes like a great first assistant director: calm, precise, quietly encouraging, never excitable.

- No exclamation marks, ever. Confidence doesn't shout.
- Short sentences. Title-card cadence.
- It speaks *to a director*: "Your opening hook was strong." "You're missing an ending."
- Banned words: content, asset, engage, unlock, magic, supercharge, AI-powered.

### 3. Logo direction

**The mark: the Open Frame.**

Four thin corner ticks of a 2.39:1 widescreen frame — the corners of a viewfinder — with a single point of light placed at the golden-ratio intersection inside the frame.

Why this mark:
- The **frame corners** are the universal gesture of "I'm composing a shot" (every director's hands making a rectangle).
- The frame is **open** — unfinished, waiting for your life to fill it.
- The **point of light** sits at the rule-of-thirds/golden point — the mark literally teaches composition, which is the product's second promise.
- It scales: at 16px it's a crisp glyph; full-bleed it becomes the framing device for posters, splash screens, and the camera HUD.

The point of light is the only element that ever animates: it warms from white to tungsten gold when a film finishes developing. That's the whole motion identity of the logo — a light coming on in a dark room.

**Wordmark:** *auteur*, lowercase, set in the display serif (below), tracked slightly tight. Lowercase because the user is the auteur, not us.

**Rejected directions (and why):** aperture blades (owned by every camera app since 2010), a pair of lenses/glasses (too literal, ties the brand to one hardware partner), a film reel (nostalgic, backward-looking — Auteur is about the future of filmmaking).

### 4. Brand principles

1. **The user is above the line.** Credit, ownership, and pride flow to the director. Always.
2. **Everything is light.** Every surface, transition, and loading state behaves like light and optics — exposure, focus, flare — never like a spreadsheet.
3. **Ritual over feed.** Auteur creates appointments (tonight's premiere) instead of infinite scroll. Scarcity is the premium feeling.
4. **Teach quietly.** Every screen makes you slightly better at filmmaking without ever feeling like homework.
5. **Trust is the material.** A camera on your face is intimate. Privacy isn't a settings page; it's a design surface.

---

## Part II — The Design System

### 5. Typography

Three voices, strictly cast:

**Display — "the Film voice."** A high-contrast modern serif (spec: *PP Editorial New* or *Fraunces* at low optical size settings). Used enormous: film titles at 64–120pt, onboarding title cards, Premiere Night. This is the typeface of movie posters and end credits. It only ever speaks about *films* — never UI chrome.

**Text — "the App voice."** A neutral grotesque with quiet character (spec: *Neue Montreal* or *Söhne*). All UI: labels, buttons, settings, body copy. 13–17pt. It disappears; that's its job.

**Mono — "the Camera voice."** A technical monospace (spec: *IBM Plex Mono*). Timecodes, ISO/lens metadata, coordinates, sync counts, dates. `00:04:12 · 24 FPS · GOLDEN HOUR`. This is the Blackmagic instinct: metadata set in mono makes the whole app feel like a precision instrument instead of a photo album.

Type scale (mobile): 12 / 13 / 15 / 17 / 22 / 28 / 40 / 64 / 96. Jumps are deliberately huge at the top — the gap between "UI text" and "film title" should feel like the gap between a ticket stub and a marquee.

Rule: **serif = cinema, sans = interface, mono = machine.** Any screen you can't parse by typeface alone is mis-set.

### 6. Color

**Dark first, and specifically *screening-room* dark.** Not pure black — pure black makes OLED footage bloom and UI feel void. The canvas is a warm near-black, like the walls of a theater.

Core palette (the "house lights"):

| Token | Value | Role |
|---|---|---|
| `screen.0` | `#0B0B0C` | Canvas. The theater. |
| `screen.1` | `#141416` | Raised surfaces, cards |
| `screen.2` | `#1D1D20` | Sheets, popovers |
| `glass` | `rgba(255,255,255,0.06)` + 24px blur + 0.5px `rgba(255,255,255,0.12)` inner hairline | Docks, overlays, controls floating over footage |
| `bone` | `#F2EFE9` | Primary text. Warm white — projector white, not sRGB white. |
| `bone.60` / `bone.35` | 60% / 35% bone | Secondary / tertiary text |
| `tungsten` | `#E6A550` | THE accent. Golden-hour amber. Used for exactly one thing per screen. |
| `signal.print` | `#5DC9A5` | Success (a print "approved") |
| `signal.cut` | `#E24B4A` | Destructive (cut/delete) |

**The dynamic layer — every film brings its own light.** When a film is on screen, Auteur extracts a 5-swatch palette from its footage and tints the UI with it: the glass dock picks up the film's key color at 8%, progress bars and the play scrubber take the film's accent, the poster's ambient glow bleeds 40px beyond its edges (a subtle box-glow sampled from the poster, like a TV in a dark room). The app has one identity but a thousand moods — Spotify's dynamic color, executed with a colorist's restraint.

Gradients: permitted only where light would actually create them — poster ambience, the developing sequence, golden-hour indicators. Never as decoration on buttons or backgrounds. A gradient in Auteur always *means light*.

Light mode exists ("Daylight") but is honest about being secondary: it's bone paper with ink text, for reading Director's Notes outdoors. Playback and premieres always drop to screening-room dark regardless.

### 7. Spacing

4pt base grid. Scale: **4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128**.

The governing rule is **one idea per viewport.** Home shows one film. A note shows one note. Auteur's density ceiling is roughly a third of a normal app's — screens are composed like frames, with the subject given negative space. Margins: 24pt screen gutters on mobile (not 16 — the extra 8pt *is* the premium), 96pt+ section breathing room.

All media is letterboxed to **2.39:1** in browsing contexts. The letterbox bars aren't wasted space; they're the brand. UI never overlays footage inside the frame — controls live in the bars, like subtitles. The frame is sacred.

### 8. Iconography

- 24px optical grid, **1.5px stroke**, rounded caps, always outline — never filled. (Filled icons read as "app"; hairline icons read as "instrument.")
- The set is drawn from **optics and the film set**, not from office software: focus brackets (select), iris (settings — it *irises* open when tapped), slate/clapper (new cut), light meter (insights), tripod (stability), lens (search), sprockets (library).
- Icons are **drawn, not shown**: on first appearance each icon strokes itself in over 240ms, like a pencil on a storyboard. On state change, they morph (play ↔ pause as a single continuous path) rather than swap.
- No icon ever appears without having earned it — if a text label alone is clear, there is no icon.

### 9. Motion language: "Everything is light"

Auteur has no slides, no bounces, no confetti. Every animation is derived from four optical behaviors:

1. **Exposure** — elements enter by fading up from 0 with a slight blur→sharp resolve (like film exposing). Exits are the reverse. Nothing "slides in from the right."
2. **Rack focus** — layer transitions (opening a sheet, entering a film) blur the outgoing layer 0→12px while the incoming layer resolves sharp. Depth is communicated with focus, not shadows.
3. **Dolly** — scroll parallax: posters move at 0.92× scroll speed, their titles at 1.0×, ambient glow at 0.85×. Two or three planes maximum; it should feel like a slow camera move, not a parallax demo.
4. **Flare** — the reward behavior. Completed states (film developed, note earned, level reached) get a single horizontal anamorphic light streak sweeping through at 600ms. Used at most once per session per surface.

Timing system:

| Token | Duration | Use |
|---|---|---|
| `beat.micro` | 120ms | Touch feedback, toggles |
| `beat.base` | 240ms | Component transitions |
| `beat.scene` | 420ms | Screen transitions, sheets |
| `beat.hero` | 700ms | Premieres, developing, Wrapped |

Easing: one custom curve everywhere — `cubic-bezier(0.32, 0, 0.16, 1)` ("lens ease"): a decisive start with a long optical settle. Springs only on directly-manipulated objects (dragging a scene card), tuned critically damped — nothing in Auteur wobbles.

**Haptics** are mapped to camera hardware: a soft *shutter* tick on capture-adjacent actions, a fine *focus-ring* detent series when scrubbing a timeline (one tick per scene boundary), a single deep *slate clap* when a film finishes developing.

**Sound**: almost none. Two sounds total: the slate clap (film ready) and a sub-second projector flutter at the start of a premiere. Both defeatable, both mixed 12dB quieter than system sounds.

---

## Part III — Architecture & Navigation

### 10. Structure

Four spaces, one summonable layer:

```
Marquee (home)  ·  Filmography (library)  ·  Locations (map)  ·  You (profile)
                      Ask (search) — pull down from anywhere
```

**Navigation chrome: the Dock.** A floating glass capsule at the bottom, four hairline icons, no labels after the first week (labels fade out once each space has been visited five times — the interface learns you, then gets out of the way). The dock auto-hides on scroll-down and during any playback; it returns on scroll-up with an exposure fade. Its top edge carries the **sync halo** — a 2px light line that breathes tungsten while dailies develop, so system status lives in the chrome without a single badge or spinner.

**Why not a hamburger, why not five tabs:** four spaces is the most a spatial model can hold without a map of the map. Search is a gesture, not a destination, because asking your archive a question should be as fast as thinking of it. Settings is deliberately buried in You — a premium product's settings are visited twice a year.

Screen transitions between spaces use rack focus (blur cross-resolve), not horizontal slides — spaces are *depths*, not pages.

---

## Part IV — The Screens

Each screen: purpose, layout, hierarchy, interactions, animation, and why it exists.

### 11. Onboarding — "the Cold Open"

**Purpose:** In ninety seconds, reframe the user's self-image from "person with camera glasses" to "director," and collect taste signal the AI needs — without one form field.

**Layout & flow:** Full-black screens, serif title cards, center-set, one line each:

1. *"Every day, you shoot hours of footage."* (beat) *"You just don't have a cinematographer."* (beat) *"Now you do."* — Each card exposes up over 700ms; the Open Frame mark draws itself around the final line.
2. **Taste, not settings.** Twelve full-bleed cinematic stills (not from real films — Auteur-original frames graded in distinct styles: neon night, pastel morning, high-contrast noir, warm handheld documentary…). "Pick the five that feel like you." Tap = the frame's corners tick in with a shutter haptic. This is Letterboxd's onboarding insight applied to *style*: five taps seed the grading, pacing, and music models better than any questionnaire, and it's the most beautiful screen in the flow.
3. **Pairing.** "Put on your glasses." The Open Frame appears with a live-scanning shimmer; when the Ray-Bans connect, the frame's light-point warms to tungsten and the glasses' name sets in mono beneath. Pairing failure states are calm and specific ("Glasses are asleep. Tap the right temple.") — never a red error box.
4. **Permissions, in context, honestly.** Each permission is a single dark card explaining the *cinematic* reason: Location → "So your films know where they were shot." Photos → "Your dailies develop here." Notifications → "One call sheet a day. Tonight's premiere. Nothing else." Each card states what is *not* done ("Faces are recognized on this device. They never leave it."). Decline paths are first-class, not guilt-styled.

**Why it exists:** Onboarding is the trailer for the product. If the first ninety seconds feel like a form, the brand promise is dead before the first film. And the taste picker means the *first* film the AI cuts already feels like the user's style — the single biggest determinant of week-one retention.

### 12. Authentication

**Purpose:** Get out of the way.

One screen: the Open Frame mark, *auteur* wordmark, two buttons — **Continue with Apple**, **Continue with Google** — and a mono-type footnote: `Your footage stays yours. Read how →`. No email/password path at launch; no marketing checkboxes; no "choose a username" (your name is your director credit, pulled from the identity provider and editable in You).

Session expiry re-auth uses Face ID directly into the app — a director is never locked out of their own screening room.

**Why:** Every field on an auth screen is a person deciding this isn't worth it. Auteur's auth is a door, not a lobby.

### 13. Syncing — "Developing"

**Purpose:** Turn the app's slowest moment (media transfer + AI analysis) into its most characterful ritual, and set the anticipation hook for tonight's premiere.

**Layout:** When glasses come into range with new footage, a glass sheet rises from the dock: *"38 dailies from today"* in serif, beneath it a **contact sheet** — a grid of frames that develop individually: each thumbnail starts as warm grain and resolves to image with a blur→sharp exposure, in the order they were shot, like prints coming up in a darkroom tray. Mono captions tick beneath: `ANALYZING LIGHT · FINDING SCENES · READING MOTION`.

**Hierarchy:** count → contact sheet → one line of status. No percentage bar. (A percentage says "machine working"; a developing contact sheet says "film coming to life.")

**Interactions:** The sheet is fully dismissible — developing continues in the background, status handed off to the dock's sync halo. Tapping any developed frame peeks it full-screen (long-press to mark *print it* — a manual favorite signal fed to the editor). When analysis finishes, the sheet's last act is a single line: *"Tonight's premiere: 9:00 PM."* with the slate-clap haptic.

**The premiere schedule is the product's core ritual.** Films don't appear the instant they're done; they premiere in the evening (user-tunable). This converts AI latency from a cost into theater, creates a daily appointment, and makes the film feel like an *event* rather than a push notification. (Impatient users can always "screen it early" from Home — the option exists, quietly.)

**Upload flow** (phone footage, imported media): drag into the same tray; identical developing metaphor. Auteur treats a borrowed iPhone clip and glasses footage as the same thing — dailies.

**Why:** Every competitor shows a progress bar here. This is the moment Auteur is most obviously *itself*.

### 14. Loading, universally

- **No spinners anywhere.** Skeletons are *undeveloped frames*: soft warm-grain rectangles with a slow shimmer, in the exact geometry of the content they become.
- Premiere playback start gets the one indulgence: a 1.5s film-leader countdown (8… 7…) with the projector flutter. First play of a film only; replays start instantly. A ritual repeated on every replay would become a wait.
- Any operation under 400ms shows nothing at all. Silence is premium.

### 15. Home — "the Marquee"

**Purpose:** Answer one question with total confidence: *what film is playing tonight?* Home is a cinema marquee, not a dashboard and not a feed.

**Layout, top to bottom:**
1. A whisper of chrome: date in mono (`SUN JUL 6`), sync halo state, nothing else.
2. **Tonight's film, full-bleed.** The AI-generated poster at ~70% of viewport: title in the display serif (*The Rain Before Sunset*), beneath it the credit block in mono — `4 MIN · 7 SCENES · DIRECTED BY YOU`. The poster's palette glows into the canvas around it. Press-and-hold: the poster comes alive, playing the film's trailer (the AI cuts a 12-second trailer for every film) with sound fading up — the Live Photo gesture, elevated. Tap: the film page. If tonight's film is still developing, the poster renders as its developing contact sheet with the premiere time — anticipation as hero content.
3. **This week** — a horizontal shelf of the last seven days' posters, letterboxed, snap-scrolling with dolly parallax.
4. **One Director's Note** — a single serif pull-quote from the latest notes ("Your opening hook was strong. Watch the ending.") linking into Insights. One. Never a stack.
5. **The week's cut** — Sunday surfaces the weekly recap film as a wide 2.39:1 card.

**Hierarchy:** poster → title → everything else at 35% bone. The screen has exactly one focal point.

**Interactions:** Pull down anywhere → Ask. Scroll up → the shelf; the dock hides. Long-press any poster → glass context sheet (Play, Recut, Share, Pin to Filmography).

**Animation:** On open, the poster exposes up (blur→sharp, 700ms) with its ambient glow blooming after — the nightly reveal moment. Posters tilt ±2° with device gyro, their sheen tracking — printed one-sheets under a gallery light.

**Why:** Opening Auteur should feel like walking past a theater and seeing your name on the marquee. Every other decision on this screen exists to protect that feeling from becoming a content grid.

### 16. Library — "Filmography"

**Purpose:** Your body of work — a filmography you're proud of, browsable by memory's own axes: time, people, places, feeling.

**Layout:** Default view is **Seasons**: films grouped by month under huge serif month-names (*June*, 96pt, with the month's aggregate palette as a thin gradient rule beneath — your June was warm; your February was blue). Posters in a 2-up grid, letterboxed, with mono footers (`THE LONG WAY HOME · 6 MIN · LISBON`).

A hairline filter row above (glass chips): **People · Places · Kinds · Moods**. "Kinds" = Dailies films / Weeklies / Monthly documentaries / Supercuts / Your recuts. Selecting *People* pivots the whole library into a cast view — faces as circular lens portraits, each opening that person's filmography ("Hamza — appears in 23 films").

**Interactions:** Pinch out on the grid → posters shrink into a **year wall**, hundreds of tiny posters forming a color-field of your year (this view *is* the shareable artifact — "my 2026 wall"). Pinch in → single-film focus. Long-press → context sheet. Scrub the right edge → a mono time-rail (`JAN — DEC`) with focus-ring haptic detents per month.

**Animation:** Grid enters as a staggered exposure (40ms/poster stagger, capped at 8). The pinch year-wall transition is continuous and interruptible — one of the two "show a friend" gestures in the app.

**Why:** Letterboxd proved people don't want a folder of what they watched — they want an identity made of it. Filmography does that for what they *lived*.

### 17. Film Detail — "the Film Page"

**Purpose:** One film's complete world: watch it, understand it, feel proud of it, learn from it, share it.

**Layout, one scrolling composition:**
1. **The one-sheet.** Poster full-bleed; title in serif over the lower third; credit block in mono. A single tungsten **Play** — the only accent-colored element on screen.
2. **Playback** takes over the full screen, dark, letterboxed; controls live in the letterbox bars: title top bar, scrub bar bottom with **chapter ticks**. Scrubbing shows a filmstrip preview above the thumb with focus-ring haptics at scene boundaries. AI chapter titles appear as subtitle-position cards at scene starts (*"II. The Market"*) and fade.
3. **Scenes** — the chapter list as wide stills with serif numerals (I, II, III…), each with title, duration, and a one-line AI logline ("You lingered here. Good instinct."). Tap → plays from that scene.
4. **The score** — the AI's music choice: track, why it was chosen ("Your walking pace matched 92 BPM"), and two alternates. Changing the score re-conforms the cut to the new track's rhythm — one tap, whole-film remaster.
5. **Palette** — the film's five swatches as a strip; tapping a swatch highlights every scene where that color leads. (This is secretly a color-theory lesson.)
6. **Locations** — a dark mini-map with the day's path drawn as a light line, scene markers glowing along it. Tap → the full map, focused.
7. **Cast** — lens-portraits of people appearing, with their scenes.
8. **Director's Notes** — this film's craft notes (see §19), pinned to timecodes.
9. **Behind the scenes** — the honest cut: dailies used vs. left out, and *why* ("Cut: 14 seconds of pavement. Your camera was down."). Any cut clip can be dragged back in → opens the Cut with it staged.
10. Footer: **Recut · Share · Export**, and beneath, the film's full **end credits** — locations, dates, music, gear, weight of footage — set like real credits. Sharing exports with credits attached.

**Why the film page is long:** the film is 4 minutes; the *pride* is in the artifact around it. This page is the difference between "the app made me a video" and "here is a film about the day I lived, and here is everything inside it."

### 18. Editing — "the Cut"

**Purpose:** Give a normal person the power of an edit suite through intent, while letting them *feel* like they're in one. DaVinci's depth, delivered through conversation-first controls with a real timeline underneath for those who reach for it.

**Layout — three altitudes, progressively disclosed:**

1. **Intent (default).** The film plays letterboxed, top half. Below, a glass panel of **direction chips** organized like a director's vocabulary: *Pace* (Slower · As shot · Faster), *Mood* (a small palette dial through the film's extracted grades), *Ending* (the AI proposes three alternate closing shots as thumbnails), plus a freeform line: *"Tell the editor…"* — "make it more melancholy, end on the sunset." Every change previews in-place within seconds on a low-res proxy, conformed in full quality after. The AI negotiates like a real editor: *"Slower pace means losing two scenes — these. OK?"* with the affected stills shown. It never silently discards the director's material.
2. **Scenes (one swipe up).** The film as a deck of scene cards — reorder by dragging (cards physically shuffle with critically-damped springs), swipe left to cut a scene (it doesn't vanish; it moves to a *Cutting-room floor* shelf at the edge, always recoverable), pull a card down to split it at the playhead.
3. **Fine Cut (a further pull).** A real single-track timeline with filmstrip thumbnails, trim handles with frame-step haptic ticks, transition points marked with iris icons. Deliberately one track — Auteur is not Resolve and refuses to cosplay as it. Power users get precision; nobody gets a spaceship.

**The Grade room** (a tab within the Cut): full-width preview; beneath it, looks presented as a filmstrip of the *same frame* rendered in each look, named like film stocks — *Tungsten Night*, *Kodachrome '68*, *Overcast Silver*. One intensity dial. Long-press the preview for before/after. Each look card carries one mono line of colorist reasoning (`LIFTED SHADOWS · WARM SKIN · TEAL NIGHT`) — grading as a vocabulary lesson.

**Every edit is non-destructive; version history reads as *Cut 1, Cut 2, Director's Cut*** — tap any to screen it.

**Why:** The chip layer means an eleven-year-old can recut a film. The timeline means a film student doesn't churn. The altitude metaphor means neither ever sees the other's interface.

### 19. AI Insights — "Director's Notes"

**Purpose:** The mentor. This surface is why Auteur users get *better* every month while users of every other app stay the same. It must feel like margin notes from a generous teacher, never like analytics.

**Layout — two levels:**

**Per-film notes** (on the film page): a vertical sequence of note cards, each pinned to a timecode with its frame as background. Serif note, mono timecode:

> `00:42` — *You panned too fast here. Lead with your shoulders, let the lens follow.*
> `02:10` — *This is the best frame you shot today. You held still and let the scene breathe.*
> `03:58` — *The sunset four minutes after you stopped filming would've been your ending.*

Notes are **specific, credited to real footage, and balanced** — the system always finds at least one genuinely earned praise note per film; it also always finds one craft push. Tap a note → plays that moment with the note as a subtitle. Each note has a quiet *"Show me"* link into the matching Film School lesson.

**Your Craft** (level two, in You): the longitudinal view. A **cinematic score** (0–100) rendered as a light-line drawing itself across months — with the explicit framing *"Your eye, measured"* and a breakdown by discipline: Composition · Light · Movement · Story · Sound. Each discipline expands into your actual frames as evidence — your best three compositions this month beside your September ones. One **weekly focus**, never more: *"This week: hold your shots. Your average is 2.1 seconds. Aim for 4."* — with the average recomputed live as the week's dailies develop.

**Why one focus, why a score:** People improve on one instruction at a time; a dashboard of twelve metrics improves nothing. The score exists because progress you can see is the strongest retention loop ever shipped (Duolingo) — but Auteur's version measures *craft*, is always explained, and never gates anything.

### 20. Learn — "Film School"

**Purpose:** Structured craft, gamified with dignity. The syllabus of a film degree, taught through the user's own footage.

**Layout:** A vertical **syllabus** of chapters set like a course catalog in serif — *Composition · Light · Color · Movement · Story · Sound*. Each chapter is a run of lessons; each lesson is three beats:

1. **See it** — a 20-second visual essay built from Auteur-original footage (a principle like leading lines shown, not described), with the frame annotated live — composition lines drawing themselves over the shot.
2. **Find it** — the AI pulls examples *from the user's own dailies*: "You already shot leading lines. Here. And here." (This moment — being shown you already had the instinct — is the pedagogical heart of the product.)
3. **Shoot it** — a field assignment: *"Today: one frame where a line leads to your subject."* The next sync auto-detects the attempt, and the lesson resolves with the user's shot presented full-bleed beside the principle diagram, corners ticking in with the shutter haptic.

**Progression:** ranks named for the crew ladder — *Production Assistant → Camera Operator → Cinematographer → Director → Auteur* — each rank a wordmark-set card added to the profile. **No streaks, no lives, no guilt mechanics.** Missing a week costs nothing; the assignment simply waits. Gamification here is a film-school transcript, not a slot machine.

**Why:** "AI that edits for you" is a feature; competitors will have it within a year. "An app that made me a filmmaker" is a life change, and it is the moat — the more lessons you absorb, the better your dailies, the better your films, the deeper the loyalty.

### 21. Search — "Ask"

**Purpose:** Make an archive of your life feel omniscient. Natural language in, cinema out.

**Layout & behavior:** Pull down anywhere → the current screen racks out of focus and a single serif line floats: *"Ask your films."* Mono suggestion lines cycle beneath (`every sunset` · `days it rained` · `whenever Hamza laughed` · `coffee shops in Lisbon`). Voice input is first-class (the glasses have your voice already).

Results are **an answer first, a grid second**. The AI responds editorially in serif — *"Fourteen sunsets this year. October 12th was the best one."* — above a letterboxed grid of matching scenes grouped by film, each playing muted on press. Semantic chips refine (golden hour only · with people · this year).

**The killer interaction: any search becomes a film.** A tungsten line at the bottom of every result set: **"Cut this into a film."** → the developing ritual → *Every Sunset, 2026* premieres tonight, poster and all. Saved searches become living **Collections** that auto-grow as new dailies match, and can re-cut themselves quarterly.

**Why:** Search in every gallery app retrieves. Ask *creates*. The gap between "here are your sunset clips" and "here is your sunset film" is the entire brand, compressed into one button.

### 22. Map — "Locations"

**Purpose:** Your life as a shot-on-location production. Space is memory's strongest index; this screen makes it magical instead of forensic.

**Layout:** A full-screen 3D globe/city map in a custom dark cartographic style — charcoal terrain, hairline bone streets, no POI clutter, no roads you didn't walk. Everywhere you've filmed is a **point of warm light**; light accumulates, so your neighborhood glows like a long exposure of your life. Clusters bloom into **Sets** ("Lisbon — 12 films") with a fanned stack of posters.

**Interactions:** Tap a light → the camera flies down (a helicopter establishing shot, 700ms, lens ease) and the location opens as a set page: films shot there, scenes, the palette of that place, and a mono fact (`YOU ALWAYS FILM HERE AT DUSK`). A **time scrubber** along the bottom edge plays your year across the map — lights igniting in sequence as the months pass; scrubbing it feels like watching your life spread across the city. Pinch out far enough and film-trip journeys draw themselves as light-lines between cities.

**Animation:** The globe idles with a barely-perceptible drift (0.1°/s) — alive, never busy. Entering Locations from anywhere racks focus into black, then the globe exposes up already framed on your most recent light.

**Why:** Every other app's map is metadata. This one is the *"show someone at a dinner party"* screen — and it quietly teaches location as a storytelling character.

### 23. AI Director — "On Set" (live mode)

**Purpose:** The endgame feature: real-time direction through the glasses while you shoot. Designed with extreme restraint, because a pushy AI in your ear ruins the moment it's trying to capture.

**Behavior:** Opt-in per outing ("Going somewhere worth filming? Take the director along."). Guidance arrives as **at most four prompts per hour**, each a single first-AD line via glasses audio (or phone HUD): *"Golden hour in 15 minutes."* · *"You have no wide shot of this place."* · *"Hold this… hold… got it."* The phone companion screen is a minimal live slate: mono readout of light, coverage checklist as frame-corner ticks (WIDE ✓ · MEDIUM ✓ · CLOSE —), and a hush toggle (one tap silences the director for the day, no confirmation, no guilt).

**Rules of the room:** the director never speaks during detected conversation; never interrupts twice in ten minutes; brags never ("Great shot!" is banned — approval is shown later, in the Notes, with evidence). Everything it asked for is credited in that evening's film page: *"You got the wide shot. It became the opening."*

**Why:** This closes the loop — Notes teach you after, Film School trains you between, On Set guides you during. No competitor can copy the third one without the glasses.

### 24. Profile — "You"

**Purpose:** The director's identity: filmography, craft, taste, and eventually a public page — Letterboxd for lives.

**Layout:** Your name set huge in serif — a title card, with your rank beneath in mono (`CINEMATOGRAPHER · SINCE 2026`). Then: **A Year in Light** — a horizontal strip of 365 one-pixel-wide color columns, each day's dominant hue: your year as a spectrogram (the second great share artifact). Then Your Craft (§19), your Film School transcript, taste profile ("You shoot warm, low, and patient — closest to the handheld documentary tradition"), and hero stats set as end credits, not as a stats grid: `41 FILMS · 9 CITIES · 212 GOLDEN HOURS · MOST FILMED: HAMZA`.

**Premiere Night** (the yearly Wrapped) lives here each December: a full AI-cut feature about your year, preceded by an actual countdown, with one-sheet poster, chaptered by season, ending in full personalized credits. It arrives as a dated invitation two weeks early — anticipation designed in.

### 25. Settings — "Preferences"

**Purpose:** Rarely visited; when visited, it must decisively deepen trust.

**Layout:** A quiet bone-on-dark list, sans-serif, generously spaced, five groups: **Privacy** (first, always) · Premieres (time, frequency) · The Director (On Set voice, prompt frequency, off) · Storage & Quality · Account.

Privacy is the flagship section, written in plain sentences with the controls inline: *"Faces are recognized on this device and never leave it."* [toggle] · *"People can be blurred from all films automatically."* [manage people] · *"Export everything. Delete everything. No exit interview."* Deletion is one screen, immediate, and confirms in mono like a wrap report: `47 FILMS · 18,204 DAILIES · ERASED`.

**Why the copy matters more than the layout:** A face-camera product lives one trust incident from death. Settings is where the brand proves its spine.

### 26. Notifications — "Call Sheets"

**Purpose:** One per day that matters. Zero engagement bait.

The full permitted set: **the premiere announcement** (*"Tonight's film is ready. 'The Rain Before Sunset' — 4 min."*), **golden-hour alerts** (opt-in, location-aware, genuinely useful: *"Golden hour at 8:42. The pier is six minutes away."*), **the weekly note** (Sunday, one line of craft), and **Premiere Night invitations**. Banned forever: "We miss you," red badges, streak warnings, "Someone viewed…" — all of it. In-app, notifications render as an actual call sheet: a dated mono-type sheet, not a bubble list.

**Why:** Restraint in the notification channel *is* the luxury positioning. Every skipped ping is deposited brand equity.

### 27. Empty states

Never apologize; always direct. The empty Marquee (day one, nothing shot) is the most designed empty state in the app: the Open Frame, center, with live mono readouts inside it — `GOLDEN HOUR: 47 MIN` · `LIGHT: SOFT, OVERCAST` · today's one field assignment — and a serif line: *"Your first film is waiting outside."* The empty state is itself a call to shoot. Empty search: *"Ask anything. Your films remember."* Empty Locations: a globe with one pulsing light on your current position: *"Every film starts somewhere. You're standing on it."*

---

## Part V — The Finish

### 28. Micro-interactions

- **Posters** respond to touch with a 2° tilt toward the finger and a light-sheen shift — a printed one-sheet, not a button.
- **Pull-to-refresh** is an iris: the aperture blades draw open with the pull and snap closed on release (shutter haptic) — you're *taking* the refresh.
- **Favoriting** a scene "prints" it: a 120ms white exposure flash and the frame gets a mono `PRINT` stamp in the corner.
- **Scrubbing anything** — timelines, the map's year, the library time-rail — uses focus-ring haptic detents at semantic boundaries (scenes, months). The whole product feels like it has a machined focus ring running through it.
- **Export** renders a small spooling-reel glyph in the dock halo; completion is the anamorphic flare across the film's poster.
- **Errors** are title cards, not alerts: *"The archive is unreachable. Your dailies are safe on the glasses."* — always what happened, always what's safe, in the same voice as everything else.

### 29. Premium details (the last 2%)

- A **2% film-grain** texture on all `screen.*` surfaces — imperceptible until it's missing; kills the "flat app void" feel.
- Hero animations (premieres, Wrapped, developing) render at a deliberate **24fps** with a subtle shutter-blur — the app's most important moments literally have film cadence. UI interaction stays at 120Hz.
- **End credits everywhere:** every share export appends 1.5s of real credits. Every film page ends with them. The credits are the watermark — pride as distribution.
- Poster typography is **art-directed per film** by the AI (typeface pairing, placement, treatment chosen from a curated system of 12 poster templates by mood) — no two one-sheets identical, all unmistakably Auteur.
- **App icon**: the Open Frame on screen-black; the light-point subtly repositions seasonally (winter: low; summer: high — the sun's arc). Nobody will notice for months. The people who notice will never shut up about it.

### 30. The five bets (what this design is actually wagering on)

1. **Credit the human** — "Directed by you" beats "AI-generated" for pride, retention, and word-of-mouth.
2. **Ritual beats feed** — a nightly premiere creates an appointment no infinite scroll can match.
3. **Teach, don't just automate** — Film School + Notes + On Set make the user better, which makes the footage better, which makes the films better: the compounding loop competitors without a pedagogy can't replicate.
4. **Search that creates** — "Cut this into a film" turns the archive from storage into a studio.
5. **Trust as design surface** — face-camera products win or die on privacy; Auteur spends design budget on it like it's the hero feature, because it is.

*— end of document —*
