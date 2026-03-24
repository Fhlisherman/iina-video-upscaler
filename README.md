# IINA Video Upscaler

GPU-accelerated video upscaling and downscaling for the [IINA](https://iina.io/) media player.

This plugin seamlessly integrates specialized GLSL shaders (such as `FSRCNNX` for upscaling and `SSimDownscaler` for downscaling) directly into IINA's `mpv` rendering engine. By applying neural-network-driven video scaling, it preserves incredibly sharp edges and avoids ringing artifacts compared to standard upscalers, greatly enhancing the visual quality of videos that fall below your native display resolution.

## Installation

### Method 1: Install via GitHub Link (Recommended)
1. Open IINA and go to **Settings** -> **Plugins** (or **Preferences** -> **Plugins**).
2. Click the downward arrow next to the `Install` button, and choose **Install from GitHub...**.
3. Enter `Fhlisherman/iina-video-upscaler` and hit **Install**.

### Method 2: GitHub Releases
1. Go to the [Releases](https://github.com/Fhlisherman/iina-video-upscaler/releases) page.
2. Download the latest `Video-Upscaler.iinaplgz` asset.
3. Once downloaded, simply double-click the `.iinaplgz` file. IINA will automatically launch and prompt you to install it.

## Usage

1. Open any video in IINA.
2. Click on the **Settings/Plugin Sidebar** icon at the bottom right of the video player to open IINA's Sidebar.
3. Select the **Video Upscaler** tab and choose your desired mode:
   - **Live Action Specialist (FSRCNNX)**: Ideal for significantly sharper visuals when watching 1080p, 720p, or 480p live-action videos on a 4K/1440p monitor.
   - **Animation Specialist (Anime4K)**: Custom-built neural network optimized strictly for drawings, cartoons, and anime to boost sharpness and completely eliminate line blurring.
   - **Text Specialist (CAS)**: Contrast Adaptive Sharpening, highly recommended for screencasts, coding tutorials, or any video where text readability is extremely important.
   - **Downscaler (SSim)**: Optimizes visual quality when shrinking a high-resolution 4K video down to a smaller player window or screen.
   - **Disable GPU Effects**: Immediately disables the custom shaders and reverts to IINA's default high-quality scaler.

*Note: You may see a temporary on-screen display (OSD) verifying the shader is downloading prior to its very first initialization. Subsequent uses will load it instantly.*

## Requirements

- [IINA](https://iina.io/) Player (Version 1.4.0 or newer).
- An Apple Silicon or capable Intel Mac GPU to run the shaders without stuttering.