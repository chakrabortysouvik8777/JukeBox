# VALIDATION — Earth Information Jukebox

Record what was actually observed, not what is expected.
Write PASS, FAIL or NOT TESTED in the Result column, and add a short note.

## Test environment

| Item | Value |
|---|---|
| Date | |
| Tester | M3 |
| Browser and version | |
| Device / OS | |
| Output (laptop speakers / headphones) | |
| Code version (git commit) | |

To find the commit: run `git log -1 --oneline` in the terminal.

## A. Automated checks (client)

| Check | Command | Result | Note |
|---|---|---|---|
| Audio + mapping tests | `npm run test:audio` | | expected: 41 passed |
| Type check | `npx tsc --noEmit` | | expected: no output |
| Production build | `npm run build` | | expected: "built in ..." |

## B. Audio listening checks (YearSonifier panel)

Keep the timeline PAUSED while doing these checks.

| # | What to do | Expected | Result | Note |
|---|---|---|---|---|
| B1 | Load page, wait for months, click PLAY YEAR | 12 notes play, about 0.6 s apart | | |
| B2 | Watch the highlighted month while listening | Highlight moves with each note, no visible lag | | |
| B3 | Listen at the start and end of each note | No clicks or pops | | |
| B4 | Listen at volume 50% on speakers / headphones | Comfortable, not harsh | | |
| B5 | Click STOP in the middle of a year | Sound stops immediately, nothing plays afterwards | | |
| B6 | Click PLAY / STOP quickly 10 times | Never two sequences at once; ends silent after final STOP | | |
| B7 | Move volume slider during playback, then to 0 | Loudness changes smoothly; 0 is silent | | |
| B8 | Select Kolkata, play; select Svalbard, play | Svalbard clearly lower pitch than Kolkata | | |
| B9 | Change year or location while playing | Old sequence stops; no leftover notes | | |
| B10 | A month showing "—" (if any) | That month is silent; timing of later months unchanged | | |
| B11 | Sound legend: click each Listen button | 220 Hz low, 440 Hz middle, 880 Hz high | | |
| B12 | Sound legend: Listen, then Stop preview | Preview stops immediately | | |
| B13 | Play, then switch to another browser tab for 5 s, return | Note what happens (sound continues / stops / highlight jumps) | | |
| B14 | Play, then reload the page | Sound stops; no error after reload | | |
| B15 | Open browser console (F12) during B1–B14 | No red errors from audio code | | |

## C. Known limitations (from AUDIO_CONTRACT.md)

- Mocked tests check commands and lifecycle, not real sound.
- Visual highlight can lag the sound by about one screen frame (~16 ms).
- The Chronological Sonic Scrubber still advances years with its own timer;
  playing the timeline stops the year sonification on each year change.
  Unified playback is M4's PlaybackController work.

## D. Issues found

| # | Check | What happened | Fixed in commit |
|---|---|---|---|
| | | | |