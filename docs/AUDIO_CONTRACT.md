# Audio Engine Integration Contract — Initial Implementation

## 1. Current status

- Temperature mapping: tests passing (sst-pitch-v1 and t2m-pitch-v1).
- AudioEngine.ts: 19 mocked tests passing (lifecycle + scheduled playback).
- TypeScript check and production build: passing.
- SoundLegend.tsx: shown inside YearSonifier (first end-to-end slice).
- YearSonifier.tsx: plays the 12 monthly T2M values of the selected year.
- Real-browser listening checks (section 9): pending.

Mocked tests do not prove real browser sound; see section 9.

## 2. Responsibilities

### Audio engine owner

Maintains:

- src/audio/AudioEngine.ts
- src/audio/temperatureMapping.ts
- src/config/audioMapping.ts
- src/types/audio.ts
- src/components/sonification/SoundLegend.tsx
- Audio engine and temperature mapping tests

### Playback controller owner

Maintains playback position, sequencing, pause/resume, seeking,
selected region, playback speed, and synchronization with visuals.

The audio engine does not maintain a dataset index or timeline position.

## 3. Input data

Temperature input:

- A finite number in degrees Celsius.
- null when an observation is missing.

Never pass:

- Kelvin values without conversion.
- NaN or Infinity.
- Missing data replaced with zero.
- A temperature anomaly to a mapping intended for absolute temperature.

The data pipeline is responsible for unit conversion and quality checks.

## 4. Default mapping

Mapping ID: sst-pitch-v1

- Minimum temperature: -2 degrees Celsius.
- Maximum temperature: 35 degrees Celsius.
- Minimum frequency: 220 Hz.
- Frequency range: two octaves, ending at 880 Hz.

Calculation:

u = clamp((temperatureC - minimumC) / (maximumC - minimumC), 0, 1)

frequencyHz = minimumFrequencyHz * 2^(octaves * u)

This is a project design choice, not a NASA-defined standard.

Use the same mapping across regions being compared.
Do not independently rescale each region.

Out-of-range temperatures are clipped for pitch only.
Preserve and display the original temperature and clipped flag.

### t2m-pitch-v1 (used for NASA POWER T2M)

- -40 °C → 220 Hz, 45 °C → 880 Hz (two octaves).
- Use this mapping for the app's T2M data; sst-pitch-v1 is kept for sea-surface data.

### Other sonified parameters (`client/src/config/parameters.ts`)

The same formula with the parameter's own unit in place of °C
(`minTemperatureC` / `maxTemperatureC` hold values in that unit):

| Mapping | Parameter | Range → 220–880 Hz |
|---|---|---|
| rain-pitch-v1 | NASA POWER PRECTOTCORR | 0 … 15 mm/day |
| co2-pitch-v1 | NOAA global CO₂ | 400 … 430 ppm |
| ch4-pitch-v1 | NOAA global CH₄ | 1830 … 1950 ppb |

Regional Compare and its stereo WAV use the same pan as live playback
(A −0.6, B +0.6).

## 5. Public engine methods

### start(): Promise<void>

Call directly from a user interaction, such as clicking Play.
Await completion before playing a numeric frequency.

The caller must catch errors and display a useful message.

### playTemperature(temperatureC, durationSeconds?, mapping?)

Maps and plays one observation.

Returns:
- originalTemperatureC
- normalizedValue
- frequencyHz
- clipped

Default duration: 0.5 seconds.

### playFrequency(frequencyHz, durationSeconds?)

Plays one frequency now, replacing the current note.
Also cancels any future scheduled notes.

- Supported frequency: 20–20000 Hz.
- Supported duration: 0.05–10 seconds.
- null stops the current sound.

Duration includes the attack and fade-out.

### getAudioTime(): number

Current audio-clock time in seconds (Tone.now()).
Use it as the base for all scheduled times.

### getPlaybackTime(): number

Time the listener is hearing now (Tone.immediate()).
getAudioTime() runs slightly ahead (look-ahead) for safe scheduling,
so use getPlaybackTime() to decide which observation to highlight.

### scheduleTemperature(temperatureC, startTime, durationSeconds, mapping?)

Maps one observation and schedules it at an absolute audio-clock time.
Returns the same mapping result as playTemperature().

null schedules no tone (a silent gap) but still returns a result,
so the controller keeps its timeline position.

### scheduleFrequency(frequencyHz, startTime, durationSeconds, pan?)

`pan` is the stereo position, −1 (left) … 0 (centre, default) … 1 (right).
Regional Compare uses −0.6 for location A and +0.6 for location B; the
Explorer and the sound legend play centred. Pitch never depends on pan.


Schedules one note at an absolute audio-clock time.

- startTime is absolute audio-clock seconds, not a delay.
- startTime must not be in the past.
- Notes must not overlap. Back-to-back notes are allowed:
  next startTime = previous startTime + previous duration.
- One voice only: the engine plays one note at a time.
- null schedules nothing.

Example for the controller:

    const t0 = engine.getAudioTime() + 0.1;
    observations.forEach((obs, i) => {
      engine.scheduleTemperature(obs.temperatureC, t0 + i * 0.5, 0.5, mapping);
    });

### setVolume(volume)

Accepts a finite number from 0 to 1.

- 0 means muted.
- 1 means the engine's maximum configured output.
- Volume may be set before initialization.

Volume is independent of temperature.

### stop()

Cancels the current note's automation and fades to silence.
Also cancels every future note scheduled with scheduleTemperature()
or scheduleFrequency().

After stop(), the controller may schedule again from a new time
(for example after a seek or region change).

Does not reset the dataset position.
Does not close the shared Tone.js audio context.

### dispose()

Releases this engine's audio nodes.

Call when the owning player is removed.
A disposed instance cannot be reused.

## 6. Playback integration rules

1. Create one engine for the owning player lifecycle.
2. Do not create a new engine on every React render.
3. Start audio from a user interaction.
4. After awaiting start(), confirm playback is still requested.
5. Read the selected observation.
6. Pass its Celsius value to playTemperature().
7. Use that same observation for the chart, map, and date label.
8. On pause, stop sound and retain the controller's position.
9. On stop, stop sound and reset position in the controller.
10. On seek or region change, cancel old controller callbacks.
11. Dispose the engine during lifecycle cleanup.

Use a generation token or equivalent cancellation mechanism so a
pending startup or old callback cannot restart playback after Stop.

In React development Strict Mode, cleanup may be followed by another
setup. A new setup must not reuse an already disposed engine.

## 7. Sound legend integration

Pass the same mapping configuration to the legend and engine.

Pass currentSound from the corresponding mapping result.

For preview:
- Pause timeline playback first.
- Initialize audio from the Listen button interaction.
- Play the selected reference temperature.
- Catch initialization or playback errors.
- Connect Stop preview to engine.stop().

The frontend owner controls placement and styling.

## 8. Timing

Sound timing is controlled by the audio clock, not by setInterval.

The controller should:

1. Read t0 = engine.getAudioTime() + a small lead time (about 0.1 s).
2. Schedule a batch of upcoming observations with absolute times.
3. Update visuals for observation i when the audio clock reaches
   t0 + i * stepSeconds (for example with requestAnimationFrame that
   compares against engine.getPlaybackTime()).
4. On pause, seek, speed change or region change: call stop(),
   then schedule again from the new position.

Visual updates follow screen refresh, so they can lag the sound by
one frame (about 16 ms). Do not claim sample-accurate synchronization.

The 20 ms fade-in and fade-out avoid clicks; the scheduled note
reaches full volume 20 ms after its start time.

## 9. Verification still required

- Confirm sound starts after clicking Play.
- Confirm missing observations stop the sound.
- Confirm volume and mute work.
- Confirm Stop works during a note.
- Confirm rapid Play/Stop does not restart unwanted playback.
- Confirm navigating away releases the engine.
- Check for audible clicks and uncomfortable output levels.

Mocked tests verify commands and lifecycle logic.
They do not verify real browser sound or perceived loudness.