class VideoPlayerManager {
    /**
     * 背景视频切换按钮管理
     * （原"视频播放器对话框"子系统无任何调用者，整体移除）
     * @param {import("./PlaylistManager.js")} playlistManager
     * @param {import("./UIManager.js")} uiManager
     */
    constructor(playlistManager, uiManager) {
        this.playlistManager = playlistManager;
        this.uiManager = uiManager;

        // 使用DOMContentLoaded事件确保DOM已完全加载
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                this.initializeEvents();
            });
        } else {
            // 如果DOM已加载，立即初始化
            this.initializeEvents();
        }
    }

    initializeEvents() {
        // 缓存绑定副本：add/remove 必须用同一引用，否则 removeEventListener 永远移除不掉（原型方法 ≠ bind 副本）
        this._onPlayBtnClick ??= this.handlePlayButtonClick.bind(this);

        // 播放条背景切换按钮
        const playVideoBtn = document.getElementById("playVideoBtn");
        if (playVideoBtn) {
            playVideoBtn.removeEventListener("click", this._onPlayBtnClick);
            playVideoBtn.addEventListener("click", this._onPlayBtnClick);
        }

        // 背景切换后同步按钮状态（设置面板 / 播放条按钮都会触发）
        window.removeEventListener("app-background-changed", this._onBackgroundChanged);
        this._onBackgroundChanged = () => this.updateVideoButtonState();
        window.addEventListener("app-background-changed", this._onBackgroundChanged);

        console.log("背景切换按钮事件初始化完成");
    }

    handlePlayButtonClick() {
        // 功能：切换视频背景 / 封面背景（不再打开视频播放器）
        const settingManager = this.playlistManager?.settingManager;
        if (!settingManager) {
            this.uiManager.showNotification("背景设置不可用", "error");
            return;
        }
        const current = settingManager.getSetting("background");
        const next = current === "video" ? "cover" : "video";
        settingManager.setSetting("background", next);
        settingManager.applySettingChange("background", next);
        this.updateVideoButtonState();
        this.uiManager.showNotification(
            next === "video" ? "已切换为视频背景" : "已切换为封面背景",
            "info"
        );
    }

    /**
     * 更新背景切换按钮状态（读当前 background 设置，不再检查视频可用性）
     */
    updateVideoButtonState() {
        const playVideoBtn = document.getElementById("playVideoBtn");
        if (!playVideoBtn) return;
        try {
            const settingManager = this.playlistManager?.settingManager;
            const isVideoBg = settingManager && settingManager.getSetting("background") === "video";

            playVideoBtn.classList.remove("checking");
            playVideoBtn.classList.remove("disabled");

            if (isVideoBg) {
                playVideoBtn.setAttribute("title", "视频背景（点击切换为封面背景）");
                playVideoBtn.innerHTML = '<i class="bi bi-film"></i>';
            } else {
                playVideoBtn.setAttribute("title", "封面背景（点击切换为视频背景）");
                playVideoBtn.innerHTML = '<i class="bi bi-film-slash"></i>';
            }
        } catch (error) {
            console.error("更新背景切换按钮状态失败:", error);
        }
    }
}

module.exports = VideoPlayerManager;
