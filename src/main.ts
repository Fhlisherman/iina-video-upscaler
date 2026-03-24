/// <reference types="iina-plugin-definition" />

const { core, mpv, http, file, sidebar, menu, event: iinaEvent } = iina;

interface ShaderConfig {
  url: string;
  local: string;
  mpvPath: string;
  name: string;
}

enum ShaderNames {
  FSRCNNX = "FSRCNNX",
  Anime4K = "Anime4K",
  CAS = "CAS",
  SSimDownscaler = "SSimDownscaler",
}

const PLUGIN_DATA_DIR = "~/Library/Application Support/com.colliderli.iina/plugins/.data/com.github.Fhlisherman.iina-video-upscaler";

const SHADERS: Record<ShaderNames, ShaderConfig> = {
  [ShaderNames.FSRCNNX]: {
    url: "https://github.com/igv/FSRCNN-TensorFlow/releases/download/1.1/FSRCNNX_x2_8-0-4-1.glsl",
    local: "@data/FSRCNNX.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/FSRCNNX.glsl`,
    name: "Live Action Specialist (FSRCNNX)",
  },
  [ShaderNames.Anime4K]: {
    url: "https://raw.githubusercontent.com/bloc97/Anime4K/master/glsl/Upscale/Anime4K_Upscale_CNN_x2_M.glsl",
    local: "@data/Anime4K.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/Anime4K.glsl`,
    name: "Animation Specialist (Anime4K)",
  },
  [ShaderNames.CAS]: {
    url: "https://gist.githubusercontent.com/agyild/bbb4e58298b2f86aa24da3032a0d2ee6/raw/CAS.glsl",
    local: "@data/CAS.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/CAS.glsl`,
    name: "Text Specialist (CAS)",
  },
  [ShaderNames.SSimDownscaler]: {
    url: "https://gist.githubusercontent.com/igv/36508af3ffc84410fe39761d6969be10/raw/SSimDownscaler.glsl",
    local: "@data/SSimDownscaler.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/SSimDownscaler.glsl`,
    name: "Downscaler (SSim)",
  },
};

let currentMode: "none" | ShaderNames = "none";
try {
  async function ensureShader(mode: ShaderNames): Promise<boolean> {
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

  async function applyShader(mode: ShaderNames) {
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
    updateSidebar();
  }

  function updateSidebar(): void {
    try {
      sidebar.postMessage("update", { currentMode });
    } catch (e) {
      // Sidebar might not be open yet
    }
  }

  iinaEvent.on("iina.window-loaded", () => {
    sidebar.loadFile("sidebar.html");
    
    sidebar.onMessage("apply", (msg: any) => {
      if (msg.mode === "none") {
        if (currentMode !== "none") {
          mpv.command("change-list", ["glsl-shaders", "clr", ""]);
          currentMode = "none";
          core.osd("GPU Processing: Disabled");
          updateSidebar();
        }
      } else {
        applyShader(msg.mode as ShaderNames);
      }
    });

    updateSidebar();
  });

  menu.addItem(
    menu.item("Open Sidebar", () => {
      sidebar.show();
    })
  );
} catch (error: any) {
  core.osd(`CRASH: ${error.message || error}`);
  console.error("Plugin crashed:", error);
}