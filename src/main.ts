/// <reference types="iina-plugin-definition" />

const { core, mpv, http, file, sidebar, menu, event: iinaEvent } = iina;

enum ShaderNames {
  FSRCNNX = "FSRCNNX",
  Anime4K = "Anime4K",
  FSR = "FSR",
  SSimDownscaler = "SSimDownscaler",
  Denoise = "Denoise",
}

interface ShaderConfig {
  url: string;
  local: string;
  mpvPath: string;
  name: string;
  shortName: string;
}

const PLUGIN_DATA_DIR = "~/Library/Application Support/com.colliderli.iina/plugins/.data/com.github.Fhlisherman.iina-video-upscaler";

const SHADERS: Record<ShaderNames, ShaderConfig> = {
  [ShaderNames.FSRCNNX]: {
    url: "https://github.com/igv/FSRCNN-TensorFlow/releases/download/1.1/FSRCNNX_x2_8-0-4-1.glsl",
    local: "@data/FSRCNNX.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/FSRCNNX.glsl`,
    name: "Live Action Specialist (FSRCNNX)",
    shortName: "Live Action",
  },
  [ShaderNames.Anime4K]: {
    url: "https://raw.githubusercontent.com/bloc97/Anime4K/master/glsl/Upscale/Anime4K_Upscale_CNN_x2_L.glsl",
    local: "@data/Anime4K.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/Anime4K.glsl`,
    name: "Animation Specialist (Anime4K)",
    shortName: "Anime",
  },
  [ShaderNames.FSR]: {
    url: "https://gist.githubusercontent.com/agyild/82219c545228d70c5604f865ce0b0ce5/raw/FSR.glsl",
    local: "@data/FSR.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/FSR.glsl`,
    name: "Text Specialist (FSR)",
    shortName: "Text",
  },
  [ShaderNames.SSimDownscaler]: {
    url: "https://gist.githubusercontent.com/igv/36508af3ffc84410fe39761d6969be10/raw/SSimDownscaler.glsl",
    local: "@data/SSimDownscaler.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/SSimDownscaler.glsl`,
    name: "Downscaler (SSim)",
    shortName: "Downscaler",
  },
  [ShaderNames.Denoise]: {
    url: "https://raw.githubusercontent.com/bloc97/Anime4K/master/glsl/Denoise/Anime4K_Denoise_Bilateral_Mode.glsl",
    local: "@data/Denoise.glsl",
    mpvPath: `${PLUGIN_DATA_DIR}/Denoise.glsl`,
    name: "Bilateral Denoiser",
    shortName: "Denoiser",
  },
};

const state = {
  mode: "none" as "none" | ShaderNames,
  denoiserEnabled: false,
};

async function ensureShader(mode: ShaderNames): Promise<boolean> {
  const config = SHADERS[mode];
  if (file.exists(config.local)) return true;

  core.osd(`Downloading ${config.shortName}...`);
  try {
    await http.download(config.url, config.local);
    return true;
  } catch (err) {
    console.error(`Failed to download ${config.name}:`, err);
    core.osd(`Error: Download failed for ${config.shortName}`);
    return false;
  }
}

async function applyShaders(): Promise<void> {
  try {
    mpv.command("change-list", ["glsl-shaders", "clr", ""]);
    mpv.set("dscale", "hermite");
    mpv.set("linear-downscaling", "yes");
    mpv.set("profile", "default");

    const activeNames: string[] = [];

    if (state.mode === ShaderNames.SSimDownscaler) {
      if (await ensureShader(ShaderNames.SSimDownscaler)) {
        mpv.command("change-list", ["glsl-shaders", "append", SHADERS[ShaderNames.SSimDownscaler].mpvPath]);
        mpv.set("dscale", "mitchell");
        mpv.set("linear-downscaling", "no");
        
        const msg = state.denoiserEnabled ? "Downscaler Active (Denoiser Ignored)" : "Downscaler Active";
        core.osd(msg);
      } else {
        state.mode = "none";
      }
      updateSidebar();
      return;
    }

    if (state.denoiserEnabled) {
      if (await ensureShader(ShaderNames.Denoise)) {
        const denoisePath = SHADERS[ShaderNames.Denoise].mpvPath;
        mpv.command("change-list", ["glsl-shaders", "append", denoisePath]);
        mpv.command("change-list", ["glsl-shaders", "append", denoisePath]);
        mpv.command("change-list", ["glsl-shaders", "append", denoisePath]);
        activeNames.push("Denoiser (x3)");
      } else {
        state.denoiserEnabled = false;
      }
    }

    if (state.mode !== "none") {
      if (await ensureShader(state.mode)) {
        mpv.command("change-list", ["glsl-shaders", "append", SHADERS[state.mode].mpvPath]);
        mpv.set("profile", "gpu-hq");
        activeNames.push(SHADERS[state.mode].shortName);
      } else {
        state.mode = "none";
      }
    }

    if (activeNames.length > 0) {
      core.osd(`${activeNames.join(" + ")}: Active`);
    } else {
      core.osd("Default IINA Scaler");
    }

    updateSidebar();
  } catch (error) {
    console.error("Failed to apply shaders:", error);
    core.osd("CRASH: Error applying shaders");
  }
}

function updateSidebar(): void {
  try {
    sidebar.postMessage("update", { 
      currentMode: state.mode, 
      denoiserEnabled: state.denoiserEnabled 
    });
  } catch (e) {
    // Expected behavior if the sidebar is not currently open
  }
}

function initializePlugin(): void {
  iinaEvent.on("iina.window-loaded", () => {
    sidebar.loadFile("sidebar.html");

    sidebar.onMessage("ready", () => {
      updateSidebar();
    });

   sidebar.onMessage("apply", (msg: { mode: "none" | ShaderNames }) => {
      if (state.mode === msg.mode && msg.mode !== "none") {
        state.mode = "none";
      } else {
        state.mode = msg.mode;
      }
      
      applyShaders(); 
    });

    sidebar.onMessage("toggleDenoiser", () => {
      state.denoiserEnabled = !state.denoiserEnabled;
      applyShaders(); 
    });
  });

  menu.addItem(
    menu.item("Open Sidebar", () => {
      sidebar.show();
    })
  );
}

try {
  initializePlugin();
} catch (error) {
  console.error("Plugin failed to initialize:", error);
}