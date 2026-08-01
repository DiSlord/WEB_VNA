# 📡 Web VNA — S-Parameter File Viewer & Analyzer

**Web VNA** is a high-performance, browser-based Vector Network Analyzer viewer designed for visualizing, analyzing, and exporting S-parameter Touchstone files (`.s1p`, `.s2p`). 

Built with pure Vanilla JavaScript and HTML5 Canvas, it requires **no server, no build step, and no installation**. It runs entirely client-side, ensuring your measurement data remains private.

---

## ✨ Key Features

### 📊 Advanced Visualization Engine
* **Mathematically Precise Smith Charts:** Features an intelligent, unified rendering engine for all complex plane formats (Smith, Admittance, Polar, Cartesian). Labels are algebraically projected to the unit-circle boundary to prevent overlapping, ensuring perfect readability at any scale.
* **25+ Trace Formats:** LogMag, Phase, Group Delay, Linear, Real, Imaginary, SWR, R, X, |Z|, Z-Phase, Series/Parallel R-L-C, Q-factor, Conductance, Susceptance, |Y|, and S21-specific Series/Shunt equivalents.
* **Dynamic $Z_0$ Support:** All calculations and grid generations dynamically adapt to the system's characteristic impedance (default 50Ω, fully configurable).
* **Multi-Zone Layouts:** 6 preset configurations (1 to 4 simultaneous graphs) with independent trace types, channels, and zoom levels per zone.

### 🛠️ Professional Analysis Tools
* **Smart Markers:** Add, drag, and edit frequency markers with high-precision linear interpolation across all visible traces.
* **Real-Time Cursor Readout:** Hover over any graph to see a dynamic tooltip with exact frequency and calculated values for all active traces.
* **Interactive Zoom & Pan:** Drag axes to pan, scroll wheel to zoom (centered on cursor), with automatic "nice" tick scaling (1-2-2.5-5 sequence).
* **Live vs. Stored Comparison:** Overlay a "Live" measurement against up to 4 stored reference traces (M1–M4) simultaneously.

### ⚡ High Performance & Compatibility
* **Zero Dependencies:** 100% Vanilla JS. No frameworks, no bundlers.
* **HiDPI / Retina Ready:** Automatically scales to `window.devicePixelRatio` for crisp, anti-aliased lines and text.
* **Robust Parsing:** Native support for Touchstone files in **RI** (Real/Imaginary), **MA** (Magnitude/Angle), and **DB** formats, with automatic detection of frequency multipliers (Hz, kHz, MHz, GHz).

---

## 🚀 Quick Start

1. Download or clone this repository.
2. Open `web_vna.html` directly in any modern web browser (Chrome, Firefox, Edge, Safari).
3. Click **Test Data** to load a synthetic demo, or **Right-Click** a trace slot to load your own `.s1p` / `.s2p` file.

---

## 📖 User Guide

### 1. Loading Data
* **From File:** Right-click the **Live** (Slot 0) or **M1–M4** (Memory Slots) button in the side panel and select **Load .s1p/.s2p**.
* **Test Data:** Click the **Test Data** button to instantly load a synthetic dataset for UI exploration.

### 2. Trace Slots
The application provides **5 independent trace slots**:

| Slot | Name | Purpose |
| :--- | :--- | :--- |
| **0** | **Live** | Current measurement or primary loaded file. |
| **1–4** | **M1–M4** | Stored reference traces for before/after comparison. |

* Toggle visibility using the side-panel buttons (they turn **green** when active).
* **Right-click** any slot button for a context menu: **Copy Live → M(n)**, **Clear**, or **Export as .s1p / .s2p**.

### 3. Graph Areas & Trace Types
The main canvas is divided into graph areas. Each area has a top toolbar to select the **Trace Type** and toggle **Channels** (S11, S21, S12, S22). Click the **⟲** button to reset the view scale.

#### General (All Channels)
| Type | Description | Unit |
| :--- | :--- | :--- |
| **LOGMAG** | Logarithmic magnitude | dB |
| **PHASE** | Phase angle | ° |
| **DELAY** | Group delay | s |
| **LINEAR** | Linear magnitude | — |
| **REAL / IMAG** | Real / Imaginary part of S | — / j |

#### Reflection (S11, S22)
| Type | Description | Unit |
| :--- | :--- | :--- |
| **SMITH** | Complex Chart (R + jX), (G + jB) and more | — |
| **SWR** | Standing Wave Ratio | — |
| **R / X** | Series Resistance / Reactance | Ω |
| **Z / ZPHASE** | Impedance magnitude / phase | Ω / ° |
| **CS / LS** | Series Capacitance / Inductance | F / H |
| **RP / XP** | Parallel Resistance / Reactance | Ω |
| **CP / LP** | Parallel Capacitance / Inductance | F / H |
| **Q** | Quality Factor | — |
| **G / B** | Conductance / Susceptance | S |
| **Y** | Admittance magnitude | S |

#### Transmission (S21, S12)
| Type | Description | Unit |
| :--- | :--- | :--- |
| **SMITH** | Complex Chart Series R/X, Shunt R/X and more | — |
| **RSER / XSER / ZSER** | Series R / X / \|Z\| derived from S21 | Ω |
| **RSH / XSH / ZSH** | Shunt R / X / \|Z\| derived from S21 | Ω |
| **QS21** | Q Factor derived from S21 | — |

### 4. Markers & Cursor
* **Add:** Places a new marker at a distributed frequency within the current view.
* **Change:** Prompts for a specific frequency to move the selected marker.
* **Remove:** Deletes the selected marker.
* **Drag:** Click and drag a marker directly on the graph to snap it to the nearest data point.
* **Cursor:** Hover anywhere on the plot to see a crosshair and a tooltip with interpolated values for all visible traces.

### 5. Mouse & Touch Controls
| Action | Effect |
| :--- | :--- |
| **Hover on plot** | Shows cursor line + tooltip with frequency and values. |
| **Drag on marker** | Moves the nearest marker (within pickup radius). |
| **Drag on Y-axis** | Pans the vertical scale. |
| **Drag on X-axis** | Pans the horizontal (frequency) scale. |
| **Scroll on plot** | Zooms horizontally, centered on the cursor. |
| **Scroll on Y-axis** | Zooms vertically. |
| **Scroll on X-axis** | Zooms horizontally. |
| **Touch & Drag** | Fully supported for mobile/tablet devices. |

---

## 💡 Pro Tips for Beginners

1. **The Power of Multi-View:** Don't limit yourself to one graph type. Set Area 1 to **LOGMAG** to see return loss, Area 2 to **SMITH** to visualize impedance matching, and Area 3 to **DELAY** to check for filter group delay ripple—all for the exact same data simultaneously.
2. **Compare Before/After:** Load your initial measurement into **Live**. Right-click **M1** and select *Copy Live → M1*. Make your circuit adjustments, load the new file into **Live**, and watch the differences overlay in real-time.
3. **Zooming into Resonances:** Use the scroll wheel while hovering directly over the X-axis near a sharp resonance peak to zoom in horizontally and inspect the exact frequency and Q-factor.
4. **Exporting Results:** Once you've isolated a specific frequency range using markers and zoom, right-click the **Live** slot and choose **Export .s1p** to save just that processed data.

---

## ⚙️ Technical Highlights (For Developers)

* **Modular Architecture:** Strict separation of concerns. `VNAData` handles state/parsing, `VNA_MATH` handles pure RF calculations, and `VNAGraph`/`Area` handle the Canvas API.
* **Optimized Complex Rendering:** The `COMPLEX_PARAMS` engine uses algebraic inversion (e.g., $u = 1/nx$) to calculate Smith chart label intersections, eliminating heavy trigonometric functions and guaranteeing mathematical perfection.
* **Performance Fallbacks:** Circles with a normalized radius $> 100$ are automatically replaced with straight axes (`H_AXIS` / `V_AXIS`), preventing Canvas rendering artifacts and maintaining 60+ FPS during real-time updates.
* **Custom Formatter:** Includes a lightweight, `printf`-style `formatValue` engine supporting SI prefixes (`k`, `M`, `G`, `µ`, `n`, `p`), complex number formatting (`j`), and dynamic precision.

---

*Web VNA brings desktop-class RF analysis capabilities to the modern web browser with minimal footprint and maximum performance.*
