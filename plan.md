# Plan: Hidden Clues — a split-half scanner for two phones

## Project
Phone as a scanner over a shared 3×3-screen digital area, to find your own half of four split clues and hand them to a third person who decodes the final message, for a three-person group in a design class (two scanners, one pen-and-paper decoder).

## The question
The prototype tests whether hiding half the clue per phone provokes communication and teamwork:

1. it encourages players to talk and cooperate during the search;
2. the split halves make sure no single person can solve the puzzles alone — they need each other;
3. the whole loop is completable within one class;
4. the decode stays readable — the third person gets a correct word without misreading a colour or a slot.

It works if you can see and hear players guiding each other mid-search (e.g. "your circle's near the top-left") and the final message gets decoded correctly in the session.

## The experience
Two players stand in class with phones in hand. Both open the sketch and tap once to join the same room — the first phone in is player ①, the second is player ②. They drag the shared world beneath a fixed scanner window in the middle of the screen. Their own clue halves appear as very faint images; their partner's halves appear as ghosts at 20–30% so they can call out locations to each other. When a player's own faint symbol sits inside the scanner window, they tap it: it flashes, and its slot in the top bar fills solid. The partner's phone shows the change almost instantly. When all four pairs are found on both phones, a bar of text appears: "All Clues Found. Good Luck Decoding". The two scanners then read their found symbols aloud to the third person, who decodes on pen and paper. People watching see two players wandering the room, pointing at each other's screens, and talking.

## Input, transformation, output, fallback
- **Input:** one finger drags to pan the world; a tap (finger moves less than 10 px) claims a clue, and only when the target sits inside the fixed scanner window. No sensors, no camera, no sound, no GPS — touch only.
- **Transformation:** the first phone rolls a random seed into `shared`; both phones build the identical world from it (3×3 screens, four clue pairs = eight half-symbols at seeded random positions, spread with minimum spacing inside world bounds). Role and state decide visibility: own unfound 10% opacity, partner unfound 0% (invisible — the ghost clues confused players about which clue was theirs), own found 100%, partner found 50%. Only your own unfound symbol is claimable, with a 35 px tap tolerance, and only when its centre is inside the scanner window (ties go to the symbol nearest the window centre). Each phone writes only its own found-array under its own `shared` key, so the two players can never overwrite each other.
- **Output:** visuals only — the fixed scanner window (square, 60% of screen width, centred, thin border, four corner brackets, faint crosshair), the four opacity levels above (partner unfound renders at 0%, i.e. not at all), a top bar with the player badge (①/②) and four pair-slots (yours fills solid when found; a faint inset appears when your partner found theirs), a brief flash/ring when you claim, and the end bar text above.
- **Fallback:** a laptop runs the same sketch with mouse drag and click — the same pointer code path handles both. Two browser windows on one laptop join the same room and play both roles, so the full two-player loop is testable alone. `showDesktopQr()` on the desktop invites a partner by QR (it silently does nothing on a phone). Nothing depends on phone hardware, so nothing degrades.

## References
| File | Use it as | Take | Leave |
|---|---|---|---|
| `references/concept.png` | layout: match this | top bar: player badge ①/② plus the row of four clue slots; the fixed scanner window centred below it; the pink shared world area with scattered symbols and the phone-as-rectangle "visible area"; the "ex. order found" two-row symbol strip | handwriting and red annotations; the dashes above the slot row; the "Order to solve" and "ex. solve" decode sections (that's the decoder's pen-and-paper work, not the app); the tilted/rotated phone drawings (the real world pans axis-aligned) |

## Limits
- **Change only:** `sketch.js`, `assets/`, `references/`. **`index.html` is frozen** — p5.js 2.3.2 and p5-phone 1.16.1 stay exactly as they are.
- **Assets:** 8 PNGs in `assets/`, all 1000×1000 px and 67–107 KB — **uploaded 2026-11-06, verified within limits**. Note the **uppercase `.PNG` extension**: load every file by its exact name, case included — GitHub Pages is case-sensitive, so `TEAR-1.png` would 404 where `TEAR-1.PNG` works:
  - Player 1's halves: `assets/TEAR-1.PNG` … `assets/TEAR-4.PNG`
  - Player 2's halves: `assets/ACRE-1.PNG` … `assets/ACRE-4.PNG`
  - **Pairing is by number:** pair *k* = `TEAR-k` + `ACRE-k` (slot *k* in the top bar is pair *k*).
  - Shape, colour and letter are baked into the art. The names are accepted as-is, knowing that page source reveals them (friendly-class trade-off, decided 2026-11-06).
  - Code-drawn placeholders (coloured shape + letter) remain the fallback if any image fails to load.
- **Share** runs on the class Cloudflare worker. Config for `setup()`:
  ```js
  shareSetup({
    host: 'https://p5-phone-share.npuckett.workers.dev', // the class server
    room: 'a1-iris',                                     // your room
    app: 'hidden-clues',
    me: { name: 'emma' }
  });
  enablePermissionsTap(['share'], 'Tap to join');
  ```
  All phones in one game join the same room (`a1-iris`). The worker must speak Share protocol v2: a `shareError: "Unsupported protocol version"` means the worker needs a redeploy.
- **Not now (out of v1):** tap-a-slot fullscreen clue view (read-aloud is the v1 path); sound and vibration feedback; a "new game"/replay reset; motion sensors, GPS, camera, AR. The dashes, a decoder phone, extra players, a minimap, and saved results/timers are handled physically in the room, not in the sketch.

## How I will check it
- **On my laptop:** two browser windows, both join the room — the first shows ①, the second ②, and both show the identical world layout. Dragging pans and stops hard at the world edge. A tap inside the window claims my faint symbol; panning never claims anything; my slot fills solid while the other window shows it ghosted. Claim all eight halves and both windows show "All Clues Found. Good Luck Decoding". The desktop QR is visible.
- **On my phone:** the join tap works and the screen stays awake (joining the room does that). Dragging is smooth with no pull-to-refresh, and a thumb-tap inside the window claims reliably. My partner's claims appear on my screen within about a second. After four pairs, the end bar appears on both phones with the exact text.

## Steps
<!-- Written by the agent. Each step small enough to check on your phone. -->

1. **Canvas + scanner window.** Replace the 400×400 stub with a full-screen canvas (`async setup`, `lockGestures()`), a dark background, and the fixed scanner window: square at 60% of screen width, centred, thin border, four corner brackets, faint crosshair. Handle `windowResized()` so it stays centred. *Check (laptop):* window centred and still centred after resize.
2. **Panning.** Introduce world coordinates: the world is 3× the screen in both axes; dragging moves a camera offset; the view clamps so it never shows outside the world; a faint grid makes the movement readable. Drive it with **`mousePressed` / `mouseDragged` / `mouseReleased`** — p5.js 2's unified pointer callbacks; `touchStarted/Moved/Ended` are no-ops in p5.js 2 and would silently do nothing. *Check:* smooth drag, hard stop at the edges.
3. **Serve it over localhost.** Share needs a secure context — opening the file via `file://` will not work. Start a local server (e.g. `python3 -m http.server`) and open `http://localhost:8000`. *Check:* the sketch loads from localhost, not from the file path.
4. **Join the room.** In `setup()`, after `lockGestures()`, configure Share exactly as decided:
   ```js
   shareSetup({
     host: 'https://p5-phone-share.npuckett.workers.dev', // the class server
     room: 'a1-iris',                                     // your room
     app: 'hidden-clues',
     me: { name: 'emma' }
   });
   enablePermissionsTap(['share'], 'Tap to join');
   ```
   Shared defaults: `seed`, `p1Found` (four `false`), `p2Found` (four `false`). Use `quiet: true` in `shareSetup` (the sketch reads only `shared`; harmless if the worker ignores it). The tap only *starts* the join — gate everything on the room actually being connected: read `window.shareConnected` (or use the `shareReady()` callback) before treating the phone as in the room, and surface `window.shareError` if it is set (an "Unsupported protocol version" message means the class worker needs a redeploy). Call `showDesktopQr()` — after `shareSetup()` the QR carries the room join link. *Check (laptop, two windows):* both windows reach connected with no `shareError`.
5. **Roles + partner UI.** The first phone to connect is player 1, the second is player 2 — detect the first with **`shareIsHost`**, then **pin the role in `sessionStorage`**, not `localStorage`: two windows on one laptop share one `localStorage` and would both pin ①, while `sessionStorage` is per tab (and per phone) and still survives a reload or backgrounding. Draw the ①/② badge so the role is visible, and show the room name plus the join link from **`getShareJoinUrl()`** until both are in — "both in" means `guests` holds two entries — then hide it. *Check (two windows):* first shows ①, second ②, both roles survive a reload, and the invite line disappears once the second window joins.
6. **One seed.** **Only the host writes** `shared.seed` (a random value) and only if it is null; every other phone waits until `shared.seed` is non-null, showing a "waiting for world…" line. No second seed may ever be written — if both phones roll one, the two worlds diverge. *Check:* the non-host waits, then both windows proceed with the same seed (confirmed by the identical layout in the next step).
7. **Build the world.** Both phones generate the same layout from the seed: eight positions (four pairs × two sides) from a seeded PRNG, inside the world bounds with minimum spacing. **Pairing: pair *k* = `TEAR-k` + `ACRE-k`** — pair 1 is `TEAR-1` + `ACRE-1`, and so on. Placeholder symbols for now: coloured shape + letter, about 96 px. *Check:* both windows show the same eight positions.
8. **Visibility ladder.** Draw every symbol by role and state: own unfound 10%, partner unfound 0% (invisible), own found 100%, partner found 50%; only own unfound is claimable; partner state comes from their `shared` key. Apply the opacities with `tint()` before each draw and `noTint()` after. *Check:* each window shows its own four faint, the partner's unfound four invisible, and the partner's found ones at 50%.
9. **Top bar.** Move the badge into a top bar with four pair-slots: empty → solid when you found your half, with a faint inset when your partner found theirs. *Check:* both states visible per slot across two windows.
10. **Claim inside the window.** Tap vs drag with a 10 px movement threshold: compare the `mousePressed` position with the `mouseReleased` position — under 10 px of movement is a tap, more is a drag, and a drag must never claim. A claim needs a tap within 35 px of your own unfound symbol *and* that symbol's centre inside the scanner window; overlapping candidates resolve to the one nearest the window centre. On claim: write your own found array to `shared` — the slot fills, since it exists from Step 9. *Check:* panning never claims; a deliberate tap claims; partner symbols never claim; the slot fills.
11. **Sync + end state.** Partner claims appear on the other phone within about a second (Share batches at ~50 ms). When all eight halves are found, both phones show the bar **"All Clues Found. Good Luck Decoding"** while the symbols stay on screen. *Check:* claim #8 in one window → bar appears in both.
12. **Real images.** Load the eight PNGs in `async setup()` by their exact, case-sensitive names — `assets/TEAR-1.PNG` … `assets/TEAR-4.PNG` for player 1, `assets/ACRE-1.PNG` … `assets/ACRE-4.PNG` for player 2 — with a per-file placeholder fallback, and note the drop-in path in the code. *Check:* with the files present, the real art shows; with one renamed, that slot still runs on its placeholder.
13. **Deploy for phones.** Enable GitHub Pages for this repo (main branch — `.nojekyll` is already in place) and note the URL (`https://linhhhhhhhhhhhh.github.io/hidden-clues/`). Share requires HTTPS, so this is the only way phones can play. *Check:* the URL opens the sketch on a phone over https.
14. **Phone pass.** On a real phone with a partner over class Wi-Fi: join tap, screen stays awake (joining the room does that), thumb-tap feel, exact opacity values, exact end-bar text, debug console never enabled. Add the claim flash here as polish — about a 400 ms ring/flash on the symbol when it is claimed. *Check:* a full playthrough — four pairs found, ghosts updating live, flash on claim, end bar on both phones.

## Changes
- 2026-11-06: initial plan written from the design Q&A (drag-to-pan world, class Share server, two players, visual-only feedback).
- 2026-11-06: asset naming confirmed — `assets/TEAR-1..4.png` (player 1) and `assets/ACRE-1..4.png` (player 2), pairs matched by number; filename leak of the answer accepted.
- 2026-11-06: Share config filled in — host `p5-phone-share.npuckett.workers.dev`, room `a1-iris`, app `hidden-clues`.
- 2026-11-06: assets verified in `assets/` (8× 1000×1000 PNG, 67–107 KB, uppercase `.PNG` extension — must be loaded case-exactly); `references/concept.png` added and the References table filled.
