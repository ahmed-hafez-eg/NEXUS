# 🪐 NEXUS

**NEXUS** is an offline-first visual knowledge mapping and learning roadmap application built specifically for software engineers, self-taught developers, and technical learners.

Traditional learning tools force you into flat, linear checklists. NEXUS breaks this mold by turning curricula into interactive, connectable node-graphs on an infinite canvas. It bridges the gap between learning theory and actual coding output.

### 🚀 Core Highlights
- **Visual Learning Graphs:** Map courses, topics, and sub-tasks as draggable nodes with connection ports to express deep prerequisites and learning paths.
- **Cross-Space Interoperability (SpaceLinks):** A strict single-source-of-truth architecture. Project nodes from one workspace into another without duplicating data, preventing circular dependencies.
- **Dual-Source Quantified Tracking:** Vertically stacked activity heatmaps tracking both local study progress (SQLite) and real-world repository contributions (GitHub API).
- **Offline-First & High Performance:** Powered by Tauri 2, Rust, and a local SQLite engine. Zero cloud lock-in, minimal memory footprint, and full data ownership.

### 🛠️ Tech Stack
- **Frontend:** React, TypeScript, TailwindCSS, React Flow, GSAP
- **Core/Desktop:** Tauri 2, Rust
- **Database:** SQLite (`@tauri-apps/plugin-sql`)
