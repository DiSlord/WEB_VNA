# Web VNA — S1P/S2P File Viewer & Analyzer

**Web VNA** is a browser-based vector network analyzer viewer designed for viewing and analyzing S-parameter touchstone files (`.s1p`, `.s2p`).

### File Support
- **Import**: Parses standard Touchstone files (`.s1p`, `.s2p`) in **RI**, **MA**, and **dB** formats, with automatic detection of frequency units (Hz, kHz, MHz, GHz).
- **Export**: Saves trace data back to `.s1p` or `.s2p` Touchstone format.
- **Storage**: Up to **5 independent trace slots** (1 Live + 4 Memory slots M1–M4), each holding full S11/S21/S12/S22 complex data.

### Visualization
- **25+ trace formats**: LogMag, Phase, Delay, Linear, Real, Imag, SWR, Smith Chart, R, X, |Z|, Z-Phase, Series/Parallel R-L-C, Q-factor, Conductance, Susceptance, |Y|, and S21-specific series/shunt equivalents.
- **Multi-zone layouts**: 6 preset configurations (1, 2, 3, or 4 simultaneous graphs) with independent trace type and channel selection per zone.
- **4 channels per slot**: S11, S21, S12, S22 can be toggled independently for any trace type.
- **Theme support**: Multiple color themes (dark/light) with distinct trace colors for easy comparison.

### Analysis Tools
- **Markers**: Add, drag, and edit frequency markers with interpolated values across all visible traces.
- **Cursor readout**: Real-time frequency and value display for all active traces while hovering.
- **Interactive zoom/pan**: Drag axes to pan, scroll wheel to zoom (centered on cursor), with automatic "nice" tick scaling (1-2-2.5-5 sequence).
- **Live vs. stored comparison**: Overlay Live measurement against up to 4 stored reference traces simultaneously.

### Key Features
- Pure client-side — no server required, runs entirely in the browser.
- Responsive canvas rendering with crisp lines and HiDPI support.
- Persistent UI state (theme and layout saved in `localStorage`).
 
# Web VNA — User Guide

## Overview

Web VNA is a browser-based viewer and analyzer for S-parameter Touchstone files (`.s1p`, `.s2p`). It runs entirely client-side — no server or installation required. Simply open the HTML file in any modern browser.

## Loading Data

### From File
1.  Right Click **Live** (slot 0) or **M1–M4** (memory slots 1–4). and select load data from snp
2. The file is parsed automatically. Supported formats:
   - **Frequency units**: Hz, kHz, MHz, GHz
   - **Data formats**: RI (Real/Imaginary), MA (Magnitude/Angle), DB (dB/Angle)

### Test Data
Click **Test data** to load a synthetic demo dataset into the Live slot for quick exploration.

## Trace Slots

The application provides **5 independent trace slots**:

| Slot | Name   | Purpose |
|------|--------|---------|
| 0    | Live   | Current measurement / loaded file |
| 1–4  | M1–M4  | Stored reference traces for comparison |

- Toggle slot visibility using the **Live / M1 / M2 / M3 / M4** buttons in the side panel.
- A button turns **green** when the slot contains data and is visible.
- Right-click a slot button for a context menu: **Copy Live → M(n)**, **Clear**, **Export as .s1p / .s2p**.

## Graph Areas

The main canvas is divided into one or more **graph areas**. Each area independently displays:
- A trace **type** (e.g., LOGMAG, SMITH, SWR)
- One or more **channels** (S11, S21, S12, S22)
- Its own **scale and zoom**

### Area Toolbar
Each area has a toolbar at the top with:
- **Type dropdown** — select the trace format
- **Channel checkboxes** — toggle S11 / S21 / S12 / S22 (only channels supported by the selected type are enabled)
- **⟲ button** — reset the view to default scale

### Available Trace Types

**General (all channels)**
| Type | Description | Unit |
|------|-------------|------|
| LOGMAG | Logarithmic magnitude | dB |
| PHASE | Phase angle | ° |
| DELAY | Group delay | s |
| LINEAR | Linear magnitude | — |
| REAL | Real part of S | — |
| IMAG | Imaginary part of S | j |

**Reflection (S11, S22)**
| Type | Description | Unit |
|------|-------------|------|
| SMITH | Smith chart | — |
| SWR | Standing wave ratio | — |
| R | Series resistance | Ω |
| X | Series reactance | Ω |
| Z | Impedance magnitude | Ω |
| ZPHASE | Impedance phase | ° |
| CS / LS | Series capacitance / inductance | F / H |
| RP / XP | Parallel resistance / reactance | Ω |
| CP / LP | Parallel capacitance / inductance | F / H |
| Q | Quality factor | — |
| G / B | Conductance / susceptance | S |
| Y | Admittance magnitude | S |

**Transmission (S21, S12)**
| Type | Description | Unit |
|------|-------------|------|
| RSER / XSER / ZSER | Series R / X / \|Z\| from S21 | Ω |
| RSH / XSH / ZSH | Shunt R / X / \|Z\| from S21 | Ω |
| QS21 | Q factor from S21 | — |

## Markers

Markers let you pin specific frequencies and read interpolated values across all visible traces.

| Button | Action |
|--------|--------|
| **Add** | Place a new marker at a distributed frequency within the current view |
| **Change** | Edit the frequency of the selected marker (prompts for input) |
| **Remove** | Delete the selected marker |

- Click a marker row in the table to select it.
- Drag a marker horizontally on the graph to reposition it.
- The active marker is highlighted in red; inactive markers are gray.

## Mouse Controls

| Action | Effect |
|--------|--------|
| **Hover on plot** | Shows cursor line + tooltip with frequency and values of all visible traces |
| **Drag on plot near marker** | Moves the nearest marker (within pickup radius) |
| **Drag on Y-axis** | Pans the vertical scale |
| **Drag on X-axis** | Pans the horizontal (frequency) scale |
| **Scroll wheel on plot** | Zooms horizontally, centered on cursor |
| **Scroll wheel on Y-axis** | Zooms vertically |
| **Scroll wheel on X-axis** | Zooms horizontally |

The X-axis is clamped to non-negative frequencies.

## Themes

Use the **Theme** dropdown in the top bar to switch between color themes. The selection is saved in `localStorage` and restored on next visit.

## Export

Right-click a trace slot button and choose:
- **Export .s1p** — exports S11 data in Touchstone format (Hz, RI, R=50)
- **Export .s2p** — exports all 4 S-parameters (if available)

## Keyboard / URL

The app is fully self-contained. No keyboard shortcuts are currently defined. All state (theme) persists via `localStorage`.

## Tips

- **Compare traces**: Load a reference into M1, then load a new measurement into Live. Both will overlay on the graph.
- **Multi-view analysis**: Use different trace types in different areas (e.g., LOGMAG on top, SMITH on bottom) to analyze the same data from multiple perspectives.
- **Zoom in on resonances**: Scroll-wheel over the X-axis near a resonance to inspect fine details.
- **Marker precision**: Drag a marker directly onto a peak or dip for accurate frequency readout.
