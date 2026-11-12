# DATATYPE.NetBox — NetBox DCIM Synch & Exporter

**Wiki:** [Documentation/README.md](Documentation/README.md) — principles, architecture, delivery.

NetBox DCIM Synchronizer & Exporter: synchronizes devices, interfaces, cables, and IP addresses with NetBox DCIM via REST API and exports NetBox-compliant CSV inventories.

| | |
|---|---|
| **Opens** | the OS shell (Pipeline → Translators & Formats), or `index.html` standalone |
| **Build** | none — plain web files; `npm test` |
| **Ships** | baked into WEB.Frontend-Assets (`up-stack.sh WEB.Frontend-Assets`), served at `:8080/Softapps/DATATYPE/DATATYPE.NetBox/` |
