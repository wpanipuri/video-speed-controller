<p align="center">
  <img src="assets/logo.png" width="110" alt="Video Speed Controller logo">
</p>

<h1 align="center">Video Speed Controller</h1>

<p align="center">
  Change the speed of <b>any</b> video or audio on <b>any</b> website. Simple. Fast. Private.
</p>

---

##  Features

-  Works on any page with an HTML5 video or audio player (including embedded players)
-  Speed shows **in the middle of the video** whenever you change it
- ⌨ Keys: **S** slower · **D** faster · **R** reset
-  0.1× to 16× with pitch correction
-  Remembers your speed
-  One switch to disable it on a site
-  No tracking, no network requests

##  Install

**Chrome / Edge / Brave / Opera**

1. Download and **unzip** this project.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and pick the **`extension`** folder (the one that contains `manifest.json`).
5. Pin the red icon to your toolbar.

**Firefox**

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and choose `extension/manifest.json`.

##  Use

| Do this | How |
| --- | --- |
| Faster | `D` or the **+** button |
| Slower | `S` or the **−** button |
| Normal speed | `R` or the **1×** preset |
| Pick a speed | Click a preset in the popup |
| Turn off on one site | Popup → **Disable on this site** |

Each change steps by 0.25×. Keys are ignored while you type in a text box.

##  Structure

```
extension/
  manifest.json   content.js   popup.html   popup.css   popup.js   icons/
assets/logo.png
README.md   LICENSE   CHANGELOG.md   .gitignore
```

##  Troubleshooting

- **Can't install?** Unzip first, then select the `extension` folder (not the zip, not the outer folder).
- **Nothing happens?** Reload the video page once after installing.
- **Keys don't work?** Click the page first, and don't be inside a text box.
- **Browser pages** (settings, extension store) block all extensions.

##  License

MIT — see [LICENSE](LICENSE).
