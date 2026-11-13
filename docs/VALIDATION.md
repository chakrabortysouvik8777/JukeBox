# VALIDATION — Earth Information Jukebox

Record what was actually observed, not what is expected.
Results marked **(sandbox)** were observed by the coding assistant in an
automated Chromium browser with **synthetic (made-up) API responses**, except
where "real snapshot" is noted. They check behaviour and wiring, not real
sound quality. Rows marked **TO DO** need a person with working speakers or
headphones.

## Test environment

| Item | Value |
|---|---|
| Date | 2026-11-13 |
| Code version | `git log -1 --oneline` after the Phase 2 commit |
| Automated browser | Chromium (Playwright), 1366×900 and 390×844 |
| Real-device listening | TO DO (team member, browser, device, headphones/speakers) |

## A. Automated checks (client)

Run from `Earthscore/client`.

| Check | Command | Result |
|---|---|---|
| All unit tests | `npm test` | PASS — 183 tests in 11 files |
| Type check | `npx tsc --noEmit` | PASS — no errors |
| Production build | `npm run build` | PASS |

What the tests cover: temperature→pitch mapping, audio engine lifecycle and
scheduling (mocked audio), playback state transitions, NASA POWER validation
(fill values, month 13, missing months, units), selectors and the year
badge, WAV rendering and encoding, location search parsing, page routing,
rainfall completeness, MODIS NDVI grid and quality flags, WorldPop values,
Regional Compare alignment, A/B events, stereo position and seeking,
the four sound parameters (rainfall parsing and range checks, NOAA gas
series padding, mappings, compare with rainfall) and stereo WAV encoding.

## B. Browser behaviour (sandbox)

| # | Check | Result |
|---|---|---|
| B1 | PLAY TIMELINE plays months in order; year, month cards, chart dot and badge follow | PASS (sandbox) |
| B2 | Pause / Resume / Stop; Stop returns to the start of the played range | PASS (sandbox) |
| B3 | Speed 0.5× / 1× / 2× (2× = 4 months per second); change while playing | PASS (sandbox) |
| B4 | Seek by year while playing continues from January of that year | PASS (sandbox) |
| B5 | Location switch while playing: sound stops, Play disabled until new data loads | PASS (sandbox) |
| B6 | Slow older response (Svalbard, 3 s) cannot overwrite newer choice (Tokyo) | PASS (sandbox) |
| B7 | Navbar mute and panel volume change the output level; mute = silent | PASS (sandbox, measured signal level) |
| B8 | Explorer audio and DAW file never play at the same time | PASS (sandbox) |
| B9 | DAW WAV: 2.5 °C month ≈ 440 Hz, 22 °C ≈ 605 Hz, gaps and missing month silent | PASS (sandbox, measured from the file) |
| B10 | Leaving the Explorer page stops the sound; browser Back works | PASS (sandbox) |
| B11 | NASA POWER blocked → saved NASA data used, yellow notice shown | PASS (sandbox, real snapshot) |
| B12 | Missing air-quality values show "N/A" without errors | PASS (sandbox) |
| B13 | Rainfall: incomplete year flagged and excluded from average | PASS (sandbox) |
| B14 | Vegetation: cloudy composite excluded; Retry works without reloading | PASS (sandbox) |
| B15 | Population: ocean / no-data cell shows a clear message | PASS (sandbox) |
| B16 | Keyboard: Space on PLAY TIMELINE starts and pauses | PASS (sandbox) |
| B17 | Phone width 390 px: no sideways scrolling | PASS (sandbox) |
| B18 | Browser console: no errors during the runs above | PASS (sandbox) |

### Regional Compare (sandbox)

| # | Check | Result |
|---|---|---|
| R1 | Both locations load; two lines on one chart; A, B and A − B shown | PASS (sandbox) |
| R2 | Playback alternates A → B; active card and chart dot follow | PASS (sandbox) |
| R3 | Stereo: A notes louder in the left channel, B in the right (measured ≈ 0.07 vs 0.02) | PASS (sandbox, measured) |
| R4 | Pause, resume, stop; month slider, month buttons, chart click | PASS (sandbox) |
| R5 | Speed 2× while playing; volume; navbar mute silences | PASS (sandbox) |
| R6 | Changing a location while playing stops sound; Play disabled while loading | PASS (sandbox) |
| R7 | Slow older request (Tokyo, 3 s) does not overwrite newer choice (Sahara) | PASS (sandbox) |
| R8 | One location fails: error shown, Play disabled | PASS (sandbox) |
| R9 | Leaving Compare is silent; Explorer then plays centred (equal L/R) | PASS (sandbox, measured) |
| R10 | Keyboard Space on Play; phone width 390 px without sideways scrolling | PASS (sandbox) |

### Sound sources and Compare DAW (sandbox)

| # | Check | Result |
|---|---|---|
| P1 | Sound source switch Temperature → Rainfall → CO₂ → CH₄ → Temperature: cards, units, Hz, chart, footer and navbar follow | PASS (sandbox) |
| P2 | CO₂ / CH₄ show the "global average" note; Temperature / Rainfall do not | PASS (sandbox) |
| P3 | PLAY YEAR with Rainfall: active month card follows | PASS (sandbox) |
| P4 | Explorer DAW with Rainfall: file `earthscore-kolkata-rainfall-2016.wav`, values in mm/day | PASS (sandbox) |
| P5 | Compare Rainfall: A, B, A − B in mm/day, "Kolkata wetter" | PASS (sandbox) |
| P6 | Compare DAW: stereo WAV, A notes RMS ≈ 8800 left / 2900 right, B the reverse (measured from the file) | PASS (sandbox, measured) |
| P7 | Compare DAW shows "A · Kolkata" then "B · Svalbard" while playing; changing parameter clears the file | PASS (sandbox) |
| P8 | Browser console: no errors | PASS (sandbox) |
| P9 | NASA POWER AOD_55 returns real monthly values (Kolkata, Jan 2016 = 1.12) | PASS (Codespace, real API) |

## C. Real-device listening checks — TO DO

Use live NASA data (not the sandbox). Write PASS / FAIL and a note.

| # | What to do | Expected | Result | Note |
|---|---|---|---|---|
| C1 | Kolkata → PLAY TIMELINE | Notes clearly audible, one per month | | |
| C2 | Listen to note starts and ends | No clicks or pops | | |
| C3 | Volume 50 %, headphones | Comfortable, not harsh | | |
| C4 | Kolkata then Svalbard | Svalbard clearly lower | | |
| C5 | Stop during playback; press Play/Stop rapidly | Silence after Stop, never two sequences | | |
| C6 | Legend Listen buttons | Low / middle / high tones | | |
| C7 | Play, switch browser tab 5 s, return | Write what happens | | |
| C8 | Download a WAV and play it in a music player | Same notes as the app | | |
| C9 | Compare Kolkata / Svalbard with headphones | A clearly left, B clearly right; Svalbard lower | | |
| C10 | Compare at speeds 0.5×, 1×, 2× | A and B still easy to tell apart | | |
| C11 | Demo device and demo browser | All checks above on the device used for judging | | |

## D. Known limitations

- Mocked tests check commands and lifecycle, not perceived sound.
- Visuals can lag the sound by about one screen frame (~16 ms).
- Hidden browser tabs may slow visual updates; audio keeps its schedule.
- Regional Compare has no audio export yet (optional next step).
- On speakers the stereo difference is smaller than on headphones.

## E. Issues found and fixed

| Issue | Fix |
|---|---|
| Seeking to a new year while playing left old notes scheduled | Controller clears notes before rescheduling |
| Navbar search button covered the mute button at 1366 px | Search input may shrink (`min-width: 0`) |
| Missing population (`null`) was read as 0 people | `parsePopulation` rejects null / empty values |
| Resuming a paused one-year range after choosing another year | Any seek ends the one-year range |
| Stop did not cancel a legend preview that was still starting | `stopAll()` cancels pending previews |
