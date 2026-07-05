# Klock Architecture Diagrams

All diagrams are in **Mermaid** format — Figma supports them via the [Mermaid Plugin](https://www.figma.com/community/plugin/1098510189128133614).

## Diagrams

| File | Description |
|------|-------------|
| `architecture.mmd` | Full system architecture — frontend, backend, services, external systems |
| `config-workflow.mmd` | Sequence diagram: connection setup, test, browse, deploy flows |
| `system-architecture.mmd` | High-level layer diagram: client → gateway → services → storage → external |
| `settings-workflow.mmd` | Settings page workflow: tab selection, config, test, browse, save, deploy |
| `data-flow.mmd` | Data flow: input → processing → storage → output |

## How to use in Figma

1. Open Figma → install **Mermaid Plugin** from community
2. Copy the `.mmd` file content
3. Paste into the plugin → renders as vector graphics
4. Ungroup and restyle to match your design system

## How to view locally

Use any Mermaid renderer:
- VS Code: install "Mermaid Preview" extension
- CLI: `npm i -g @mermaid-js/mermaid-cli && mmdc -i architecture.mmd -o architecture.svg`
- Web: paste into [mermaid.live](https://mermaid.live)
