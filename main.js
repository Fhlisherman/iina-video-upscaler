"use strict";
(() => {
  // src/main.ts
  var { menu, core, mpv, http, file } = iina;
  var SHADERS = {
    upscale: {
      url: "https://github.com/igv/FSRCNN-TensorFlow/releases/download/1.1/FSRCNNX_x2_8-0-4-1.glsl",
      local: "@data/FSRCNNX.glsl",
      name: "FSRCNNX Upscaler"
    },
    downscale: {
      url: "https://gist.githubusercontent.com/igv/36508af3ffc84410fe39761d6969be10/raw/SSimDownscaler.glsl",
      local: "@data/SSimDownscaler.glsl",
      name: "SSim Downscaler"
    }
  };
  var currentMode = "none";
  try {
    let updateMenu = function() {
      menu.removeAllItems();
      menu.addItem(
        menu.item("Enable GPU Upscale (FSRCNNX)", () => applyShader("upscale"), {
          selected: currentMode === "upscale"
        })
      );
      menu.addItem(
        menu.item("Enable GPU Downscale (SSim)", () => applyShader("downscale"), {
          selected: currentMode === "downscale"
        })
      );
      menu.addItem(menu.separator());
      menu.addItem(
        menu.item("Disable GPU Effects", () => {
          mpv.command("change-list", ["glsl-shaders", "clr", ""]);
          currentMode = "none";
          updateMenu();
        })
      );
    };
    updateMenu2 = updateMenu;
    async function ensureShader(mode) {
      const config = SHADERS[mode];
      if (!file.exists(config.local)) {
        core.osd(`Downloading ${config.name}...`);
        try {
          await http.download(config.url, config.local);
          core.osd(`${config.name} Ready!`);
          return true;
        } catch (err) {
          core.osd("Download failed.");
          return false;
        }
      }
      return true;
    }
    async function applyShader(mode) {
      if (currentMode === mode) {
        mpv.command("change-list", ["glsl-shaders", "clr", ""]);
        currentMode = "none";
        core.osd("GPU Processing: Disabled");
      } else {
        const ready = await ensureShader(mode);
        if (!ready)
          return;
        const absolutePath = file.resolve(SHADERS[mode].local);
        mpv.command("change-list", ["glsl-shaders", "set", absolutePath]);
        mpv.set("profile", "gpu-hq");
        currentMode = mode;
        core.osd(`GPU ${mode.toUpperCase()}: Enabled`);
      }
      updateMenu();
    }
    updateMenu();
  } catch (error) {
    core.osd(`CRASH: ${error.message || error}`);
    console.error("Plugin crashed:", error);
  }
  var updateMenu2;
})();
