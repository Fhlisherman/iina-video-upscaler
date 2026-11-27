"use strict";
(() => {
  // src/main.ts
  var { core, mpv, http, file, sidebar, menu, event: iinaEvent } = iina;
  var PLUGIN_DATA_DIR = "~/Library/Application Support/com.colliderli.iina/plugins/.data/com.github.Fhlisherman.iina-video-upscaler";
  var SHADERS = {
    ["FSRCNNX" /* FSRCNNX */]: {
      url: "https://github.com/igv/FSRCNN-TensorFlow/releases/download/1.1/FSRCNNX_x2_8-0-4-1.glsl",
      local: "@data/FSRCNNX.glsl",
      mpvPath: `${PLUGIN_DATA_DIR}/FSRCNNX.glsl`,
      name: "Live Action Specialist (FSRCNNX)",
      shortName: "Live Action"
    },
    ["Anime4K" /* Anime4K */]: {
      url: "https://raw.githubusercontent.com/bloc97/Anime4K/master/glsl/Upscale/Anime4K_Upscale_CNN_x2_L.glsl",
      local: "@data/Anime4K.glsl",
      mpvPath: `${PLUGIN_DATA_DIR}/Anime4K.glsl`,
      name: "Animation Specialist (Anime4K)",
      shortName: "Anime"
    },
    ["FSR" /* FSR */]: {
      url: "https://gist.githubusercontent.com/agyild/82219c545228d70c5604f865ce0b0ce5/raw/FSR.glsl",
      local: "@data/FSR.glsl",
      mpvPath: `${PLUGIN_DATA_DIR}/FSR.glsl`,
      name: "Text Specialist (FSR)",
      shortName: "Text"
    },
    ["SSimDownscaler" /* SSimDownscaler */]: {
      url: "https://gist.githubusercontent.com/igv/36508af3ffc84410fe39761d6969be10/raw/SSimDownscaler.glsl",
      local: "@data/SSimDownscaler.glsl",
      mpvPath: `${PLUGIN_DATA_DIR}/SSimDownscaler.glsl`,
      name: "Downscaler (SSim)",
      shortName: "Downscaler"
    },
    ["Denoise" /* Denoise */]: {
      url: "https://raw.githubusercontent.com/bloc97/Anime4K/master/glsl/Denoise/Anime4K_Denoise_Bilateral_Mode.glsl",
      local: "@data/Denoise.glsl",
      mpvPath: `${PLUGIN_DATA_DIR}/Denoise.glsl`,
      name: "Bilateral Denoiser",
      shortName: "Denoiser"
    }
  };
  var state = {
    mode: "none",
    denoiserEnabled: false,
    upscalingRequired: false,
    scalingInfo: null
  };
  var scalingUpdateTimer = null;
  var applyRevision = 0;
  function getScalingInfo() {
    const videoWidth = core.status.videoWidth;
    const videoHeight = core.status.videoHeight;
    const viewportWidth = mpv.getNumber("osd-width");
    const viewportHeight = mpv.getNumber("osd-height");
    if (!videoWidth || !videoHeight || !Number.isFinite(videoWidth) || !Number.isFinite(videoHeight) || !Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) {
      return null;
    }
    const scale = Math.min(viewportWidth / videoWidth, viewportHeight / videoHeight);
    return {
      videoWidth,
      videoHeight,
      viewportWidth,
      viewportHeight,
      shouldUpscale: scale > 1
    };
  }
  function updateScalingStatus() {
    const scalingInfo = getScalingInfo();
    const upscalingRequired = scalingInfo?.shouldUpscale ?? false;
    const changed = state.upscalingRequired !== upscalingRequired;
    state.upscalingRequired = upscalingRequired;
    state.scalingInfo = scalingInfo;
    updateSidebar();
    return changed;
  }
  function scheduleScalingUpdate() {
    if (scalingUpdateTimer)
      clearTimeout(scalingUpdateTimer);
    scalingUpdateTimer = setTimeout(() => {
      scalingUpdateTimer = null;
      try {
        if (updateScalingStatus()) {
          applyShaders(false);
        }
      } catch (error) {
        console.error("Failed to detect video scaling requirements:", error);
      }
    }, 100);
  }
  async function ensureShader(mode) {
    const config = SHADERS[mode];
    if (file.exists(config.local))
      return true;
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
  async function applyShaders(showOSD = true) {
    const revision = ++applyRevision;
    try {
      updateScalingStatus();
      mpv.command("change-list", ["glsl-shaders", "clr", ""]);
      mpv.set("dscale", "hermite");
      mpv.set("linear-downscaling", "yes");
      mpv.set("profile", "default");
      const activeNames = [];
      if (state.mode === "SSimDownscaler" /* SSimDownscaler */) {
        const available = await ensureShader("SSimDownscaler" /* SSimDownscaler */);
        if (revision !== applyRevision)
          return;
        if (available) {
          mpv.command("change-list", ["glsl-shaders", "append", SHADERS["SSimDownscaler" /* SSimDownscaler */].mpvPath]);
          mpv.set("dscale", "mitchell");
          mpv.set("linear-downscaling", "no");
          if (showOSD) {
            const msg = state.denoiserEnabled ? "Downscaler Active (Denoiser Ignored)" : "Downscaler Active";
            core.osd(msg);
          }
        } else {
          state.mode = "none";
        }
        updateSidebar();
        return;
      }
      if (state.denoiserEnabled) {
        const available = await ensureShader("Denoise" /* Denoise */);
        if (revision !== applyRevision)
          return;
        if (available) {
          const denoisePath = SHADERS["Denoise" /* Denoise */].mpvPath;
          mpv.command("change-list", ["glsl-shaders", "append", denoisePath]);
          mpv.command("change-list", ["glsl-shaders", "append", denoisePath]);
          mpv.command("change-list", ["glsl-shaders", "append", denoisePath]);
          activeNames.push("Denoiser (x3)");
        } else {
          state.denoiserEnabled = false;
        }
      }
      if (state.mode !== "none" && state.upscalingRequired) {
        const mode = state.mode;
        const available = await ensureShader(mode);
        if (revision !== applyRevision)
          return;
        if (available) {
          mpv.command("change-list", ["glsl-shaders", "append", SHADERS[mode].mpvPath]);
          mpv.set("profile", "gpu-hq");
          activeNames.push(SHADERS[mode].shortName);
        } else {
          state.mode = "none";
        }
      }
      if (showOSD) {
        if (activeNames.length > 0 && state.upscalingRequired && state.mode !== "none") {
          core.osd(`${activeNames.join(" + ")}: Active`);
        } else if (activeNames.length > 0) {
          core.osd(`${activeNames.join(" + ")} + Default IINA Scaler`);
        } else {
          core.osd("Default IINA Scaler");
        }
      }
      updateSidebar();
    } catch (error) {
      console.error("Failed to apply shaders:", error);
      core.osd("CRASH: Error applying shaders");
    }
  }
  function updateSidebar() {
    try {
      sidebar.postMessage("update", {
        currentMode: state.mode,
        denoiserEnabled: state.denoiserEnabled,
        upscalingRequired: state.upscalingRequired,
        scalingInfo: state.scalingInfo
      });
    } catch (e) {
    }
  }
  function initializePlugin() {
    iinaEvent.on("iina.window-loaded", () => {
      sidebar.loadFile("sidebar.html");
      scheduleScalingUpdate();
      iinaEvent.on("iina.file-loaded", scheduleScalingUpdate);
      iinaEvent.on("iina.file-started", scheduleScalingUpdate);
      iinaEvent.on("iina.window-resized", scheduleScalingUpdate);
      iinaEvent.on("iina.window-size-adjusted", scheduleScalingUpdate);
      iinaEvent.on("iina.window-fs.changed", scheduleScalingUpdate);
      iinaEvent.on("iina.window-screen.changed", scheduleScalingUpdate);
      iinaEvent.on("mpv.video-params.changed", scheduleScalingUpdate);
      iinaEvent.on("mpv.osd-width.changed", scheduleScalingUpdate);
      iinaEvent.on("mpv.osd-height.changed", scheduleScalingUpdate);
      sidebar.onMessage("ready", () => {
        updateSidebar();
      });
      sidebar.onMessage("apply", (msg) => {
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
})();
