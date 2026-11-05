---
name: Orbital Telemetry & Sonification
colors:
  surface: '#10131b'
  surface-dim: '#10131b'
  surface-bright: '#363942'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#181c23'
  surface-container: '#1c2027'
  surface-container-high: '#262a32'
  surface-container-highest: '#31353d'
  on-surface: '#e0e2ed'
  on-surface-variant: '#c3c6d5'
  inverse-surface: '#e0e2ed'
  inverse-on-surface: '#2d3039'
  outline: '#8d909e'
  outline-variant: '#434653'
  surface-tint: '#b0c6ff'
  primary: '#b0c6ff'
  on-primary: '#002d6f'
  primary-container: '#3a6fd8'
  on-primary-container: '#fcfaff'
  inverse-primary: '#1c59c1'
  secondary: '#b1c5ff'
  on-secondary: '#002c71'
  secondary-container: '#144296'
  on-secondary-container: '#97b3ff'
  tertiary: '#ffb4a6'
  on-tertiary: '#660700'
  tertiary-container: '#df270c'
  on-tertiary-container: '#fff9f8'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001945'
  on-primary-fixed-variant: '#00419c'
  secondary-fixed: '#dae2ff'
  secondary-fixed-dim: '#b1c5ff'
  on-secondary-fixed: '#001947'
  on-secondary-fixed-variant: '#144296'
  tertiary-fixed: '#ffdad4'
  tertiary-fixed-dim: '#ffb4a6'
  on-tertiary-fixed: '#3f0300'
  on-tertiary-fixed-variant: '#900f00'
  background: '#10131b'
  on-background: '#e0e2ed'
  surface-variant: '#31353d'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 3.5rem
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  telemetry-lg:
    fontFamily: JetBrains Mono
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  telemetry-md:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.04em
  telemetry-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: 0.08em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 0.625rem
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.12em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
This design system establishes a high-precision, deep-space scientific aesthetic engineered for Earth data sonification and orbital observation. Conceived at the intersection of mission control telemetry and tactile audio synthesizers, the design delivers uncompromised clarity, spatial focus, and technical authority. 

The aesthetic fuses **Modern Technical Minimalism** with **Tactile Instrument Glass**:
- Dark vacuum backgrounds create infinite perceptual depth, isolating acoustic frequencies and planetary telemetry.
- Precision framing, luminous instrumentation rings, and subtle electromagnetic glows guide user focus to dynamic planetary indicators.
- Information architecture treats every control like an authentic flight instrument, balancing absolute legibility with the sensory immediacy of an audio synthesizer workbench.

## Colors
The color palette reflects deep-space environments and NASA flight telemetry.

### Atmospheric Surfaces
- **Cosmic Void (`#05080F`)**: Canvas foundation representing deep space.
- **Orbital Baseline (`#0A1224`)**: Elevated background tier for structural grouping.
- **Flight Console (`#0F1A33`)**: Instrument panels, telemetry housings, and sonification racks.
- **Surface Hover (`#162447`)**: Interactive surface state for control surfaces.

### Scientific Accents & State
- **Active Signal (`#3A6FD8`)**: Primary action, audio head position, laser reticles, active track nodes.
- **Mission Deep Blue (`#0B3D91`)**: Primary brand base, structural indicators, dormant telemetry tags.
- **Critical Telemetry (`#FC3D21`)**: Primary warming alerts, anomaly thresholds, live recording states.
- **Instrument Cyan (`#00E5FF`)**: High-precision sonification frequencies, cursor targets, audio playheads.

### Thermal Anomaly Scale (Data Spectrum)
- **Cooler Extreme**: `#2E5BFF`
- **Cooler Nominal**: `#BFD4FF`
- **Planetary Baseline**: `#FFFFFF`
- **Warmer Nominal**: `#FFC2A8`
- **Warmer Warning**: `#FC3D21`
- **Thermal Extreme**: `#B3001B`

## Typography
Typographic hierarchy pairs structural UI neutrality with flight-deck alphanumeric clarity.

- **Inter**: Structural layout, natural prose, narrative tooltips, modal headers, and contextual onboarding. Designed for neutral scannability against deep-space backdrops.
- **JetBrains Mono**: Telemetry streams, UTC timestamps, latitude/longitude matrices, acoustic hertz reads, orbital altitudes, and raw sensor logs. Numerical glyphs feature tabular sizing (`tnum`) to eliminate layout shift during live data streaming.

## Layout & Spacing
The layout follows a responsive 12-column fluid grid system engineered for dual-purpose usage: dense mission operations and real-time canvas visualizations.

- **Desktop (≥ 1280px)**: 12-column dynamic framework with fixed telemetry docks (left: planetary parameter deck; right: audio frequency spectrum & waveform scrubbing). Outer margin is `3rem`, column gutters are `1.5rem`.
- **Tablet (768px – 1279px)**: 8-column layout. Waveform scrubbers collapse to a persistent bottom drawer; planetary viewports preserve full aspect ratios.
- **Mobile (< 768px)**: 4-column system. Controls reflow into vertical tabbed decks with swipeable sonification pads and full-bleed orbital viewports. Canvas margins drop to `1rem`.

## Elevation & Depth
Depth avoids heavy diffuse drop shadows, drawing instead from physical instrument consoles and electromagnetic illumination.

- **Panel Framing**: Every telemetry panel uses a baseline surface `#0F1A33` with a razor-thin border of `1px solid rgba(255, 255, 255, 0.08)`.
- **Instrument Luminescence**: Active nodes, selected sonification frequencies, and warning monitors emit a concentrated, short-radius edge glow: `box-shadow: 0 0 12px -2px rgba(58, 111, 216, 0.35)`.
- **Critical Threshold Glow**: Temperature alerts and audio clipping states trigger thermal rim lighting: `box-shadow: 0 0 16px -2px rgba(252, 61, 33, 0.45)`.
- **Z-Index Layering Hierarchy**:
  - `Base`: Planetary Globe / Map Canvas (`#05080F`)
  - `Level 1`: Telemetry Panes & Waveform Racks (`#0F1A33`)
  - `Level 2`: Scrubbing Handles, Floating Audio Docks, Tooltips (`#162447` with cyan rim illumination)
  - `Level 3`: Emergency Anomaly Modals & System Alerts

## Shapes
Shapes emphasize precision engineering. Soft, rounded curves are eschewed in favor of disciplined geometry:
- **Panels, Racks, & Canvases**: Soft radius (`0.25rem` / 4px) to retain structural rigidity while preventing pixel clipping on high-DPI displays.
- **Chips & Telemetry Status Tags**: Strict `0.125rem` (2px) micro-corners or true 45-degree chamfers on specialized flight displays.
- **Rotary & Continuous Controls**: Knobs, sonification node dials, and orbital coordinate points remain perfect geometric circles.

## Components

### Buttons & Trigger Controls
- **Primary Telemetry Button**: Background `#3A6FD8`, foreground `#FFFFFF`, border `1px solid rgba(255, 255, 255, 0.2)`. On hover, emit cyan-tinted edge illumination (`0 0 14px rgba(0, 229, 255, 0.4)`).
- **Secondary Instrument Button**: Background `rgba(15, 26, 51, 0.8)`, border `1px solid rgba(255, 255, 255, 0.12)`, foreground `#BFD4FF`. Hover state shifts border to `#3A6FD8`.
- **Anomaly / Abort Action**: Background `rgba(252, 61, 33, 0.15)`, border `1px solid #FC3D21`, text `#FC3D21`.

### Tactile Audio Scrubber & Timeline
- **Track Rail**: Height `4px`, color `rgba(255, 255, 255, 0.1)`. Past playhead fills with a gradient spanning `#0B3D91` to `#3A6FD8`.
- **Playhead Needle**: Vertical hairline (`1px width`) rendered in `#00E5FF`, topped with a precision reticle thumb (`12px × 12px` diamond or rectangle with 1px border and glowing center dot).
- **Time/Frequency Rulers**: Calibrated tick marks rendered every 10 units via `JetBrains Mono` at `label-caps` size.

### Mission Telemetry Chips & Tags
- Compact tags formatted in `telemetry-sm`.
- Static data: Border `1px solid rgba(255, 255, 255, 0.08)`, background `rgba(5, 8, 15, 0.6)`, text `#BFD4FF`.
- Dynamic / Live streaming: Flashing beacon dot (`6px` diameter) in `#00E5FF` or `#FC3D21` next to tabular numerical readouts.

### Instrument Cards & Sensor Panels
- Contained by `#0F1A33` with `1px border rgba(255, 255, 255, 0.08)`.
- Panel headers feature upper-case telemetry labels (`label-caps`), subtle top-left corner index marks (e.g., `SEC-04 // AUDIO_SONIFICATION`), and collapsible visualizer states.

### Sliders, Dials & Frequency Knobs
- Dual-scale continuous rotary dials for sonification parameters (frequency band, pitch offset, resonance).
- Center readouts display numerical Hz or dB values in `JetBrains Mono`. Rings fill via SVG arc strokes referencing the Thermal Anomaly color scale based on temperature inputs.