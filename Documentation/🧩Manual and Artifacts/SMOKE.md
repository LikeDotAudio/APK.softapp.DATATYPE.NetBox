# Smoke test — DATATYPE.NetBox

Is `DATATYPE.NetBox` deployed? Written by `.apk.scripts/smoke.py` from the module's own shape; what each check means is in that script's header.

← [Wiki home](../README.md)

**❌ FAIL** — 2/3 checks, since 2026-11-12 00:16 EST

| Check | Target | Result | Detail |
|---|---|---|---|
| pushed | [APK.softapp.DATATYPE.NetBox](https://github.com/LikeDotAudio/APK.softapp.DATATYPE.NetBox.git) | ❌ | 1 commit(s) not pushed |
| web | [index.html](https://apk.audio/APK%3ASoftapps/DATATYPE/DATATYPE.NetBox/index.html) | ✅ | HTTP 200 |
| app | `OS/NetBox DCIM` → `PODS/POD.THIN/Softapps/DATATYPE/DATATYPE.NetBox/index.html` | ✅ | present |

Re-run: `python3 .apk.scripts/smoke.py PODS/POD.THIN/Softapps/DATATYPE/DATATYPE.NetBox`

<!-- smoke:sig 11e31983f2b7 since 2026-11-12 00:16 EST -->
