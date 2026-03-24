declare const iina: any;

const { menu, core, mpv, http, file } = iina;

interface ShaderConfig {
  url: string;
  local: string;
  mpvPath: string;
  name: string;
}

const PLUGIN_DATA_DIR = "~/Library/Application Support/com.colliderli.iina/plugins/.data/com.github.Fhlisherman.iina-video-upscaler";

const SHADERS: Record<string, ShaderConfig> = {
  fsrcnnx: {
    url: "https://github.com/igv/FSRCNN-TensorFlow/releases/download/1.1/FSRCNNX_x2_8-0-4-1.glsl",
    local: "@data/FSRCNNX.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/FSRCNNX.glsl`,
    name: "Live Action Specialist (FSRCNNX)",
  },
  anime4k: {
    url: "https://raw.githubusercontent.com/bloc97/Anime4K/master/glsl/Upscale/Anime4K_Upscale_CNN_x2_M.glsl",
    local: "@data/Anime4K.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/Anime4K.glsl`,
    name: "Animation Specialist (Anime4K)",
  },
  cas: {
    url: "https://gist.githubusercontent.com/agyild/bbb4e58298b2f86aa24da3032a0d2ee6/raw/CAS.glsl",
    local: "@data/CAS.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/CAS.glsl`,
    name: "Text Specialist (CAS)",
  },
  downscale: {
    url: "https://gist.githubusercontent.com/igv/36508af3ffc84410fe39761d6969be10/raw/SSimDownscaler.glsl",
    local: "@data/SSimDownscaler.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/SSimDownscaler.glsl`,
    name: "Downscaler (SSim)",
  },
};

type ShaderMode = "fsrcnnx" | "anime4k" | "cas" | "downscale";
let currentMode: "none" | ShaderMode = "none";
try {
  async function ensureShader(mode: ShaderMode): Promise<boolean> {
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

  async function applyShader(mode: ShaderMode) {
    if (currentMode === mode) {
      mpv.command("change-list", ["glsl-shaders", "clr", ""]);
      currentMode = "none";
      core.osd("GPU Processing: Disabled");
    } else {
      const ready = await ensureShader(mode);
      if (!ready) return;

      mpv.command("change-list", ["glsl-shaders", "set", SHADERS[mode].mpvPath]);
      mpv.set("profile", "gpu-hq");
      currentMode = mode;
      core.osd(`${SHADERS[mode].name}: Enabled`);
    }
    updateMenu();
  }

  function updateMenu(): void {
    menu.removeAllItems();
    menu.addItem(
      menu.item(SHADERS.fsrcnnx.name, () => applyShader("fsrcnnx"), {
        selected: currentMode === "fsrcnnx",
      }),
    );
    menu.addItem(
      menu.item(SHADERS.anime4k.name, () => applyShader("anime4k"), {
        selected: currentMode === "anime4k",
      }),
    );
    menu.addItem(
      menu.item(SHADERS.cas.name, () => applyShader("cas"), {
        selected: currentMode === "cas",
      }),
    );
    menu.addItem(
      menu.item(SHADERS.downscale.name, () => applyShader("downscale"), {
        selected: currentMode === "downscale",
      }),
    );
    menu.addItem(menu.separator());
    menu.addItem(
      menu.item("Disable GPU Effects", () => {
        mpv.command("change-list", ["glsl-shaders", "clr", ""]);
        currentMode = "none";
        updateMenu();
      }),
    );
  }

  updateMenu();
} catch (error: any) {
  core.osd(`CRASH: ${error.message || error}`);
  console.error("Plugin crashed:", error);
}