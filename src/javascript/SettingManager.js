const { ipcRenderer, shell } = require("electron");

class SettingManager {
    // 默认值常量
    static DEFAULT_PRIMARY_COLOR = "#ad6eca";
    static DEFAULT_SECONDARY_COLOR = "#3b91d8";
    static DEFAULT_FONT_FAMILY_CUSTOM = "HarmonyOS_Sans";
    static DEFAULT_FONT_FAMILY_FALLBACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell";

    // 深浅模式下的主题默认色（供色板网格显示与重置回退）
    static THEME_DEFAULTS = {
        dark: {
            primaryColor: "#ad6eca",
            secondaryColor: "#3b91d8",
            customBgColor: "#1c1c1c",
            customTextColor: "#ffffff",
            customBorderColor: "#ffffff",
            customPanelColor: "#1c1c1c",
            customMutedColor: "#ffffff",
            customDangerColor: "#ff3b30",
            customSuccessColor: "#4caf50",
            customWarningColor: "#ff9500",
            lyricHighlightColor: "#3b91d8"
        },
        light: {
            primaryColor: "#ad6eca",
            secondaryColor: "#3b91d8",
            customBgColor: "#ffffff",
            customTextColor: "#222222",
            customBorderColor: "#000000",
            customPanelColor: "#ffffff",
            customMutedColor: "#000000",
            customDangerColor: "#dc3545",
            customSuccessColor: "#198754",
            customWarningColor: "#ffc107",
            lyricHighlightColor: "#3b91d8"
        }
    };

    // 风格化主题预设（colors = 一套完整色板，classic 不带 colors 表示跟随深浅模式默认）
    static THEME_PRESETS = [
        { id: "classic", name: "经典" },
        {
            id: "shibuyaNight",
            name: "涩谷霓虹",
            colors: {
                accent: "#ff2f98", secondary: "#18d5f4",
                bg: "#070411", panel: "#170f26", text: "#f0e5ff", muted: "#c7b5e4", border: "#43307a",
                danger: "#ff5c7a", success: "#5ee6c8", warning: "#ffc15e"
            }
        },
        {
            id: "oceanStudio",
            name: "海洋录音室",
            colors: {
                accent: "#68b4d4", secondary: "#9aa7e8",
                bg: "#0f151b", panel: "#1e2a34", text: "#d4e5ef", muted: "#a9bfce", border: "#33485a",
                danger: "#e05d6f", success: "#63c7a9", warning: "#e8b45a"
            }
        },
        {
            id: "rosewoodVinyl",
            name: "玫瑰黑胶",
            colors: {
                accent: "#d4827b", secondary: "#d2a45c",
                bg: "#140f10", panel: "#2a1d1d", text: "#ebd1cb", muted: "#c7aaa3", border: "#4a3232",
                danger: "#e0605a", success: "#9cc48a", warning: "#d9a45c"
            }
        },
        {
            id: "amberNoir",
            name: "琥珀黑胶",
            colors: {
                accent: "#d4a64c", secondary: "#b88763",
                bg: "#11100e", panel: "#26221b", text: "#ead9bd", muted: "#c3ad8d", border: "#4a4034",
                danger: "#e2574c", success: "#7fb069", warning: "#e0a458"
            }
        },
        {
            id: "sakuraMilk",
            name: "樱花奶昔",
            colors: {
                accent: "#cf5d7d", secondary: "#5f9fad",
                bg: "#fff6f9", panel: "#fffdfe", text: "#55333f", muted: "#765b66", border: "#e8cdd8",
                danger: "#d94f66", success: "#5f9f6e", warning: "#c98f3a"
            }
        },
        {
            id: "mintCandy",
            name: "薄荷糖果",
            colors: {
                accent: "#3f9274", secondary: "#b95168",
                bg: "#f6fff8", panel: "#fdfffa", text: "#33493e", muted: "#556f63", border: "#d2e6d8",
                danger: "#d9505f", success: "#3f9274", warning: "#c08a2e"
            }
        }
    ];

    static DEFAULT_VALUES = {
        theme: "dark",
        hideSidebar: false,
        hideTitbar: false,
        primaryColor: SettingManager.DEFAULT_PRIMARY_COLOR, // 默认主色
        secondaryColor: SettingManager.DEFAULT_SECONDARY_COLOR, // 默认次色
        micaOpacity: 0.5, // 默认Mica透明度
        bgBlurAmount: 20, // 默认背景模糊强度
        background: "video",
        glassEffect: true, // 毛玻璃效果（默认开启，恢复早期 ECHO 版本观感；关闭时纯半透明）
        autoMaximize: false,

        fontFamilyCustom: SettingManager.DEFAULT_FONT_FAMILY_CUSTOM,
        lyricLineFontSize: 24,

        lyricsEnabled: true,
        lyricSource: "netease", // 歌词来源 可选值: netease(网易云), bilibili(B站字幕), smart(智能获取)
        autoPlayOnStartup: false, // 自动播放
        loopLyricsEnabled: true, // 循环歌单歌词同步功能 默认开启
        desktopLyricsEnabled: false,
        desktopLyricsColor: "#7eb8ff", // 桌面歌词当前行颜色
        desktopLyricsTranslationColor: "#aab2c0", // 桌面歌词翻译行颜色
        desktopLyricsOutlineSize: 1, // 桌面歌词外描边粗细（px，0=关闭）
        desktopLyricsOutlineColor: "#000000", // 桌面歌词外描边颜色
        customBgColor: null, // 界面背景色（null = 跟随主题）
        customTextColor: null, // 界面文字色（null = 跟随主题）
        customBorderColor: null, // 界面边框色（null = 跟随主题）
        customDangerColor: null, // 危险/错误色（null = 跟随主题）
        customSuccessColor: null, // 成功色（null = 跟随主题）
        customWarningColor: null, // 警告色（null = 跟随主题）
        customPanelColor: null, // 面板/浮层底色（null = 跟随背景）
        customMutedColor: null, // 次文字色（null = 跟随文字）
        themePreset: "classic", // 当前主题预设 id（classic = 跟随深浅模式默认）
        lyricHighlightColor: null, // 主界面歌词高亮色（null = 跟随次色）
        fadeEnabled: true, // 音频淡入淡出效果

        lyricSearchType: "custom",
        extractTitle: "auto",
        videoQuality: 64, // 背景视频清晰度 默认720P
        cacheEnabled: false,

        fontFamilyFallback: SettingManager.DEFAULT_FONT_FAMILY_FALLBACK,
        devToolsEnabled: false, // 开发者工具设置

        volume: 50, // 音量设置
        restoreWindowState: true, // 记忆窗口状态，默认启用
        sidebarWidth: 260, // 侧栏宽度设置
        echo: false, // 回声效果设置
        convolver: false, // 混响效果设置

        bilibiliCookies: "" // B站Cookies设置
    };

    constructor() {
        this.settings = { ...SettingManager.DEFAULT_VALUES };
        this.listeners = new Map();
        this.STORAGE_KEY = "app_settings";
        this.ipcRenderer = ipcRenderer; // 供桌面歌词样式通知使用
        this.loadSettings();
        this.setupSettingListeners();
        this.setupWindowStateSettings(); // 设置窗口状态记忆
        this.setupAboutLinks();
        this.setAppVersion();
        this.setupCustomThemeControls();
        this.applyFontFamily();
        this.applyFontSize();
        this.fetchContributors(); // 获取项目贡献者信息
        this.uiManager = null; // 初始化为null，后续设置
    }

    // 添加setter方法用于设置UIManager引用
    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem(this.STORAGE_KEY);
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                for (const k in parsed)
                    if (Object.prototype.hasOwnProperty.call(parsed, k))
                        this.settings[k] = parsed[k];
            }
            // 纯色背景已废弃，旧数据自动迁移为封面背景
            if (this.settings.background === "none") {
                this.settings.background = "cover";
                this.saveSettings();
            }
        } catch (error) {
            console.error("加载设置失败:", error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
        } catch (error) {
            console.error("保存设置失败:", error);
        }
    }

    getSetting(name) {
        return this.settings[name];
    }

    setSetting(name, value) {
        const oldValue = this.settings[name];
        this.settings[name] = value;

        this.notifyListeners(name, value, oldValue);
        this.saveSettings();
    }

    addListener(settingName, callback) {
        if (!this.listeners.has(settingName)) {
            this.listeners.set(settingName, new Set());
        }
        this.listeners.get(settingName).add(callback);
    }

    notifyListeners(settingName, newValue, oldValue) {
        if (this.listeners.has(settingName)) {
            this.listeners.get(settingName).forEach((callback) => {
                callback(newValue, oldValue);
            });
        }
    }

    setupSettingListeners() {
        // 初始化各 nav 开关的 active 状态（与已保存设置一致，覆盖 HTML 写死的 active）并绑定点击
        document.querySelectorAll("nav a[data-key]").forEach((element) => {
            const key = element.getAttribute("data-key");
            const value = element.getAttribute("data-value");
            if (String(this.settings[key]) === value) {
                const navParent = element.parentElement;
                navParent.querySelectorAll("a").forEach((a) => a.classList.remove("active"));
                element.classList.add("active");
            }

            element.addEventListener("click", (e) => {
                const key = e.target.getAttribute("data-key");
                const value = e.target.getAttribute("data-value");

                const finalValue = this.processSettingValue(key, value);

                // 更新UI
                const navParent = e.target.parentElement;
                navParent.querySelectorAll("a").forEach((a) => a.classList.remove("active"));
                e.target.classList.add("active");

                // 保存设置
                this.setSetting(key, finalValue);

                // 应用设置
                this.applySettingChange(key, finalValue);
            });
        });

        // 监听设置文本输入完成
        document.querySelectorAll("nav input[data-key]").forEach((element) => {
            const key = element.getAttribute("data-key");
            element.value = this.settings[key];

            element.addEventListener("blur", (e) => {
                const key = e.target.getAttribute("data-key");
                const value = e.target.value;

                const finalValue = this.processSettingValue(key, value);

                // 保存设置
                this.setSetting(key, finalValue);

                // 应用设置
                this.applySettingChange(key, finalValue);
            });
        });

        // 清除缓存按钮事件
        const clearCacheBtn = document.getElementById("clearCache");
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener("click", () => {
                this.clearCache();
            });
        }
    }

    processSettingValue(key, value) {
        switch (key) {
            // 对于videoQuality，需要转换为数字
            case "videoQuality":
                return parseInt(value);
            // 布尔开关："true"/"false" 字符串转为布尔
            case "glassEffect":
                return value === "true";
            // 字体
            case "fontFamilyCustom":
            case "fontFamilyFallback":
                return value.trim();
            case "bilibiliCookies":
                return value.trim();
            // 其他不变
            default:
                return value;
        }
    }

    setupCustomThemeControls() {
        // ===== 主题中心：预设卡片 + 自定义色板网格 =====
        const isDark = document.documentElement.className !== "light";
        const defs = SettingManager.THEME_DEFAULTS[isDark ? "dark" : "light"];
        const paletteMap = [
            { pickerId: "paletteAccent", key: "primaryColor", apply: () => this.applyThemeColors() },
            { pickerId: "paletteSecondary", key: "secondaryColor", apply: () => this.applyThemeColors() },
            { pickerId: "paletteBg", key: "customBgColor", apply: () => this.applyCustomColors() },
            { pickerId: "paletteText", key: "customTextColor", apply: () => this.applyCustomColors() },
            { pickerId: "paletteBorder", key: "customBorderColor", apply: () => this.applyCustomColors() },
            { pickerId: "palettePanel", key: "customPanelColor", apply: () => this.applyCustomColors() },
            { pickerId: "paletteMuted", key: "customMutedColor", apply: () => this.applyCustomColors() },
            { pickerId: "paletteDanger", key: "customDangerColor", apply: () => this.applyCustomColors() },
            { pickerId: "paletteSuccess", key: "customSuccessColor", apply: () => this.applyCustomColors() },
            { pickerId: "paletteWarning", key: "customWarningColor", apply: () => this.applyCustomColors() },
            { pickerId: "paletteLyric", key: "lyricHighlightColor", apply: () => this.applyCustomColors() }
        ];

        const refreshPickers = () => {
            paletteMap.forEach(({ pickerId, key }) => {
                const picker = document.getElementById(pickerId);
                if (picker) picker.value = this.settings[key] || defs[key];
            });
            this.refreshPresetActive();
        };
        // 供模式切换等外部刷新（重建 defs 指向新模式默认）
        this.refreshPalettePickers = () => {
            const isDarkNow = document.documentElement.className !== "light";
            const newDefs = SettingManager.THEME_DEFAULTS[isDarkNow ? "dark" : "light"];
            paletteMap.forEach(({ pickerId, key }) => {
                const picker = document.getElementById(pickerId);
                if (picker) picker.value = this.settings[key] || newDefs[key];
            });
            this.refreshPresetActive();
        };

        paletteMap.forEach(({ pickerId, key, apply }) => {
            const picker = document.getElementById(pickerId);
            if (!picker) return;
            picker.value = this.settings[key] || defs[key];
            picker.addEventListener("change", (e) => {
                this.setSetting(key, e.target.value);
                apply();
                this.notifyDesktopLyricsStyleRefresh();
            });
        });

        // 渲染预设卡片（单源：THEME_PRESETS，样式经 --pc-a/--pc-b/--pc-bg 预览）
        const presetRowEl = document.getElementById("themePresetRow");
        if (presetRowEl) {
            presetRowEl.innerHTML = SettingManager.THEME_PRESETS.map((p) => {
                const c = p.colors || { accent: "#ad6eca", secondary: "#3b91d8", bg: "#1c1c1c" };
                return `<button type="button" class="theme-preset-card" data-preset="${p.id}" style="--pc-a:${c.accent};--pc-b:${c.secondary};--pc-bg:${c.bg}">
                    <span class="theme-preset-swatch"></span><span class="theme-preset-label">${p.name}</span></button>`;
            }).join("");
        }

        // 预设卡片点击换肤
        const presetRow = document.getElementById("themePresetRow");
        if (presetRow) {
            presetRow.addEventListener("click", (e) => {
                const card = e.target.closest("[data-preset]");
                if (!card) return;
                this.applyThemePreset(card.dataset.preset);
                refreshPickers();
                if (this.uiManager) {
                    const preset = SettingManager.THEME_PRESETS.find((p) => p.id === card.dataset.preset);
                    if (preset) this.uiManager.showNotification(`已应用主题：${preset.name}`, "success");
                }
            });
        }

        // 重置全部颜色（回跟随主题默认）
        const resetThemePaletteBtn = document.getElementById("resetThemePalette");
        if (resetThemePaletteBtn) {
            resetThemePaletteBtn.addEventListener("click", () => {
                this.applyThemePreset("classic");
                refreshPickers();
                if (this.uiManager) this.uiManager.showNotification("配色已重置为当前主题默认", "success");
            });
        }

        // 初始应用
        this.applyThemeColors();
        this.applyCustomColors();
        this.refreshPresetActive();
        this.applyGlassEffect();

        // 桌面歌词颜色选择器
        const desktopLyricsColorPicker = document.getElementById("desktopLyricsColor");
        const desktopLyricsTransColorPicker = document.getElementById("desktopLyricsTranslationColor");

        if (desktopLyricsColorPicker) {
            desktopLyricsColorPicker.value = this.settings.desktopLyricsColor;
            desktopLyricsColorPicker.addEventListener("change", (e) => {
                this.setSetting("desktopLyricsColor", e.target.value);
                this.notifyDesktopLyricsStyleRefresh();
            });
        }

        if (desktopLyricsTransColorPicker) {
            desktopLyricsTransColorPicker.value = this.settings.desktopLyricsTranslationColor;
            desktopLyricsTransColorPicker.addEventListener("change", (e) => {
                this.setSetting("desktopLyricsTranslationColor", e.target.value);
                this.notifyDesktopLyricsStyleRefresh();
            });
        }

        const resetDesktopLyricsColorsBtn = document.getElementById("resetDesktopLyricsColors");
        if (resetDesktopLyricsColorsBtn) {
            resetDesktopLyricsColorsBtn.addEventListener("click", () => {
                const defLine = "#7eb8ff";
                const defTrans = "#aab2c0";
                this.setSetting("desktopLyricsColor", defLine);
                this.setSetting("desktopLyricsTranslationColor", defTrans);
                if (desktopLyricsColorPicker) desktopLyricsColorPicker.value = defLine;
                if (desktopLyricsTransColorPicker) desktopLyricsTransColorPicker.value = defTrans;
                this.notifyDesktopLyricsStyleRefresh();
            });
        }

        // 桌面歌词外描边：粗细（0=关）+ 颜色
        const outlineSizeSlider = document.getElementById("desktopLyricsOutlineSize");
        const outlineSizeValue = document.getElementById("desktopLyricsOutlineSizeValue");
        const outlineColorPicker = document.getElementById("desktopLyricsOutlineColor");
        const resetOutlineBtn = document.getElementById("desktopLyricsOutlineReset");

        if (outlineSizeSlider) {
            const renderSize = (v) => {
                if (outlineSizeValue) outlineSizeValue.textContent = v > 0 ? `${v}px` : "关";
            };
            outlineSizeSlider.value = this.settings.desktopLyricsOutlineSize;
            renderSize(this.settings.desktopLyricsOutlineSize);
            outlineSizeSlider.addEventListener("input", (e) => {
                const v = parseFloat(e.target.value);
                this.setSetting("desktopLyricsOutlineSize", v);
                renderSize(v);
                this.notifyDesktopLyricsStyleRefresh();
            });
        }

        if (outlineColorPicker) {
            outlineColorPicker.value = this.settings.desktopLyricsOutlineColor;
            outlineColorPicker.addEventListener("change", (e) => {
                this.setSetting("desktopLyricsOutlineColor", e.target.value);
                this.notifyDesktopLyricsStyleRefresh();
            });
        }

        if (resetOutlineBtn) {
            resetOutlineBtn.addEventListener("click", () => {
                this.setSetting("desktopLyricsOutlineSize", 1);
                this.setSetting("desktopLyricsOutlineColor", "#000000");
                if (outlineSizeSlider) outlineSizeSlider.value = 1;
                if (outlineSizeValue) outlineSizeValue.textContent = "1px";
                if (outlineColorPicker) outlineColorPicker.value = "#000000";
                this.notifyDesktopLyricsStyleRefresh();
            });
        }

        this.sliderSetting(
            "micaOpacity",
            "50%",
            "透明度已重置",
            (value) => `${Math.round(value * 100)}%`,
            () => this.applyMicaOpacity()
        );

        this.sliderSetting(
            "bgBlurAmount",
            20,
            "背景模糊强度已重置",
            (value) => `${value}px`,
            () => this.applyBgBlur()
        );

        this.sliderSetting(
            "lyricLineFontSize",
            "24",
            "歌词字体大小已重置",
            (value) => `${value}px`,
            () => this.applyFontSize()
        );
    }

    sliderSetting(id, defaultValue, resetText, value2display, afterValueApply) {
        const slider = document.getElementById(id);
        const value = document.getElementById(id + "Value");
        const reset = document.getElementById(id + "Reset");

        if (slider) {
            slider.value = this.settings[id];
            value.textContent = value2display(this.settings[id]);

            slider.addEventListener("input", (e) => {
                const v = parseFloat(e.target.value);
                value.textContent = value2display(v);
                this.setSetting(id, v);
                afterValueApply();
            });
        }
        if (reset) {
            reset.addEventListener("click", () => {
                this.setSetting(id, defaultValue);

                // 更新UI
                if (slider) slider.value = defaultValue;
                if (value) value.textContent = value2display(defaultValue);

                // 应用更改
                afterValueApply();

                // 显示通知
                if (this.uiManager) {
                    this.uiManager.showNotification(resetText, "success");
                }
            });
        }
        afterValueApply();
    }

    applyThemeColors() {
        const root = document.documentElement;
        root.style.setProperty("--primary-color", this.settings.primaryColor);
        root.style.setProperty("--secondary-color", this.settings.secondaryColor);
        // rgb 通道：供 rgba(var(--theme-x-rgb), alpha) 光晕/层次派生
        root.style.setProperty("--theme-1-rgb", this.hexToRgbString(this.settings.primaryColor));
        root.style.setProperty("--theme-2-rgb", this.hexToRgbString(this.settings.secondaryColor));
    }

    // 应用主题预设：classic = 清空所有覆写回主题默认；其它 = 整板写入
    applyThemePreset(id) {
        const preset = SettingManager.THEME_PRESETS.find((p) => p.id === id) || null;
        this.setSetting("themePreset", preset ? id : "classic");

        const paletteKeys = [
            ["primaryColor", "accent"],
            ["secondaryColor", "secondary"],
            ["customBgColor", "bg"],
            ["customTextColor", "text"],
            ["customBorderColor", "border"],
            ["customPanelColor", "panel"],
            ["customMutedColor", "muted"],
            ["customDangerColor", "danger"],
            ["customSuccessColor", "success"],
            ["customWarningColor", "warning"]
        ];

        if (preset && preset.colors) {
            paletteKeys.forEach(([key, colorKey]) => {
                const v = preset.colors[colorKey];
                if (v) this.setSetting(key, v);
            });
        } else {
            // 经典：主次色回默认常量，其余清空覆写跟随主题模式
            this.setSetting("primaryColor", SettingManager.DEFAULT_PRIMARY_COLOR);
            this.setSetting("secondaryColor", SettingManager.DEFAULT_SECONDARY_COLOR);
            paletteKeys.slice(2).forEach(([key]) => this.setSetting(key, null));
        }

        this.applyThemeColors();
        this.applyCustomColors();
        this.refreshPresetActive();
        this.notifyDesktopLyricsStyleRefresh();
    }

    // 预设卡激活态同步（settings.themePreset 与预设卡片高亮对应）
    refreshPresetActive() {
        const row = document.getElementById("themePresetRow");
        if (!row) return;
        row.querySelectorAll("[data-preset]").forEach((card) => {
            card.classList.toggle("active", card.dataset.preset === this.settings.themePreset);
        });
    }

    // 应用自定义基础色与歌词色（null 时移除覆盖，回退主题默认）
    applyCustomColors() {
        const root = document.documentElement;

        const bg = this.settings.customBgColor;
        if (bg) {
            root.style.setProperty("--custom-bg-rgb", this.hexToRgbString(bg));
        } else {
            root.style.removeProperty("--custom-bg-rgb");
        }

        const text = this.settings.customTextColor;
        if (text) {
            root.style.setProperty("--custom-text", text);
            root.style.setProperty("--custom-text-rgb", this.hexToRgbString(text));
        } else {
            root.style.removeProperty("--custom-text");
            root.style.removeProperty("--custom-text-rgb");
        }

        const border = this.settings.customBorderColor;
        if (border) {
            root.style.setProperty("--custom-border", border);
        } else {
            root.style.removeProperty("--custom-border");
        }

        // 面板/次文字：通道化（null 时回退主题默认，默认分别跟随背景与文字）
        const panel = this.settings.customPanelColor;
        if (panel) {
            root.style.setProperty("--custom-panel-rgb", this.hexToRgbString(panel));
        } else {
            root.style.removeProperty("--custom-panel-rgb");
        }

        const muted = this.settings.customMutedColor;
        if (muted) {
            root.style.setProperty("--custom-muted-rgb", this.hexToRgbString(muted));
        } else {
            root.style.removeProperty("--custom-muted-rgb");
        }

        // 状态色（危险/成功/警告）：覆写 --error/--success/--warning 及其 rgb 通道
        const statusPairs = [
            { key: "customDangerColor", cssVar: "--error", rgbVar: "--error-rgb" },
            { key: "customSuccessColor", cssVar: "--success", rgbVar: "--success-rgb" },
            { key: "customWarningColor", cssVar: "--warning", rgbVar: "--warning-rgb" }
        ];
        statusPairs.forEach(({ key, cssVar, rgbVar }) => {
            const value = this.settings[key];
            if (value) {
                root.style.setProperty(cssVar, value);
                root.style.setProperty(rgbVar, this.hexToRgbString(value));
            } else {
                root.style.removeProperty(cssVar);
                root.style.removeProperty(rgbVar);
            }
        });

        const lyric = this.settings.lyricHighlightColor;
        if (lyric) {
            root.style.setProperty("--lyric-highlight", lyric);
            root.style.setProperty("--lyric-highlight-rgb", this.hexToRgbString(lyric));
            root.style.setProperty("--lyric-grad-a", this.mixWithWhite(lyric, 0.85));
            root.style.setProperty("--lyric-grad-b", lyric);
        } else {
            root.style.removeProperty("--lyric-highlight");
            root.style.removeProperty("--lyric-highlight-rgb");
            root.style.removeProperty("--lyric-grad-a");
            root.style.removeProperty("--lyric-grad-b");
        }
    }

    // "#rrggbb" → "r, g, b"（供 rgba(var(...), alpha) 衍生透明度）
    hexToRgbString(hex) {
        const h = hex.replace("#", "");
        return `${parseInt(h.substring(0, 2), 16)}, ${parseInt(h.substring(2, 4), 16)}, ${parseInt(h.substring(4, 6), 16)}`;
    }

    // 将颜色与白色按 weight:(1-weight) 混合，返回 rgb() 字符串（用于逐字渐变起始色）
    mixWithWhite(hex, weight) {
        const h = hex.replace("#", "");
        const r = Math.round(parseInt(h.substring(0, 2), 16) * weight + 255 * (1 - weight));
        const g = Math.round(parseInt(h.substring(2, 4), 16) * weight + 255 * (1 - weight));
        const b = Math.round(parseInt(h.substring(4, 6), 16) * weight + 255 * (1 - weight));
        return `rgb(${r}, ${g}, ${b})`;
    }

    // 桌面歌词颜色变化：通知主窗口 LyricsPlayer 刷新桌面歌词样式
    notifyDesktopLyricsStyleRefresh() {
        try {
            if (this.ipcRenderer) {
                this.ipcRenderer.send("desktop-lyrics-color-changed");
            }
        } catch (e) {
            console.error("通知桌面歌词样式刷新失败", e);
        }
    }

    applyMicaOpacity() {
        const root = document.documentElement;
        root.style.setProperty("--mica-opacity", this.settings.micaOpacity);
    }

    applyBgBlur() {
        const root = document.documentElement;
        root.style.setProperty("--bg-blur-amount", `${this.settings.bgBlurAmount}px`);
    }

    applyFontFamily() {
        const root = document.documentElement;
        let c = this.settings.fontFamilyCustom;
        if (typeof c === "string" && c.trim().length > 0) c = `${c}, `;
        root.style.setProperty("--font-family-custom", c);
        root.style.setProperty("--font-family-fallback", this.settings.fontFamilyFallback);
    }

    applyFontSize() {
        const root = document.documentElement;
        root.style.setProperty("--lyric-line-font-size", `${this.settings.lyricLineFontSize}px`);
    }

    applySettingChange(key, value) {
        switch (key) {
            case "theme":
                this.applyTheme(value);
                break;
            case "background":
                // 应用背景设置
                this.applyBackground(value);
                break;
            case "glassEffect":
                this.applyGlassEffect();
                break;
            case "primaryColor":
            case "secondaryColor":
                this.applyThemeColors();
                break;
            case "micaOpacity":
                this.applyMicaOpacity();
                break;
            case "bgBlurAmount":
                this.applyBgBlur();
                break;
            case "videoQuality":
                // 视频质量变更时无需即时应用，下次加载视频时会使用新设置
                if (this.uiManager) {
                    this.uiManager.showNotification(`背景视频质量已设置为 ${this.getQualityName(value)}`, "success");
                }
                break;
            case "fontFamilyCustom":
            case "fontFamilyFallback":
                this.applyFontFamily();
                break;
            case "restoreWindowState":
                // 将设置同步到主进程
                ipcRenderer.send("set-restore-window-state", value === "true");
                break;
            case "bilibiliCookies":
                // 处理B站Cookies设置变更
                this.applyBilibiliCookies(value);
                break;
            // 其他设置的处理...
        }
    }

    // 应用B站Cookies设置
    applyBilibiliCookies(value) {
        // 如果Cookies为空，则使用默认的登录方式
        if (!value || value.trim() === "") {
            // 发送消息到主进程，使用默认的Cookies获取方式
            ipcRenderer.send("use-default-cookies");
        } else {
            // 设置自定义Cookies
            ipcRenderer.send("set-custom-cookies", value);
        }
    
        // 显示通知
        if (this.uiManager) {
            this.uiManager.showNotification(value ? "B站Cookies已更新" : "已恢复默认登录方式", "success");
        }
    }

    applyTheme(theme) {
        const root = document.documentElement;
        if (theme === "auto") {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            root.className = prefersDark ? "dark" : "light";
        } else {
            root.className = theme;
        }
        // 模式切换：刷新色板网格默认值显示 + 桌面歌词换肤
        if (this.refreshPalettePickers) this.refreshPalettePickers();
        this.notifyDesktopLyricsStyleRefresh();
    }

    applyBackground(type) {
        // 获取当前播放的歌曲信息
        const getSongInfo = () => {
            try {
                const savedPlaylist = localStorage.getItem("nbmusic_playlist");
                if (!savedPlaylist) return null;

                const playlist = JSON.parse(savedPlaylist);
                const playingNowIndex = localStorage.getItem("nbmusic_playing_now") || 0;
                return playlist[playingNowIndex];
            } catch (error) {
                console.error("获取当前歌曲信息失败:", error);
                return null;
            }
        };

        // 获取当前音频播放进度
        const getCurrentAudioTime = () => {
            const audioPlayer = document.querySelector("audio");
            return audioPlayer ? audioPlayer.currentTime : 0;
        };

        // 切换背景类型
        switch (type) {
            case "none": {
                // 移除视频背景
                this.cleanupVideoBackgrounds();
                document.querySelector("html").style.removeProperty("--bgul");
                break;
            }
            case "cover": {
                // 封面背景：html 背景被 .mica 半透明层蒙住，透明度随 Mica 透明度调节
                this.cleanupVideoBackgrounds();
                const coverSong = getSongInfo();
                if (coverSong && coverSong.poster) {
                    document.querySelector("html").style.setProperty("--bgul", `url(${coverSong.poster})`);
                }
                break;
            }
            case "video": {
                // 视频背景：不显示封面残留
                document.querySelector("html").style.removeProperty("--bgul");
                // 设置视频背景
                const currentSong = getSongInfo();
                const currentTime = getCurrentAudioTime();

                if (currentSong && currentSong.video) {
                    // 清除旧视频
                    this.cleanupVideoBackgrounds();

                    // 创建新视频元素（挂到 body、置于 .mica 之后，让蒙黑毛玻璃罩住视频，与封面模式一致）
                    const video = document.createElement("video");
                    video.autoplay = false; // 不自动播放，等待加载后再播放
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.style.position = "fixed";
                    video.style.width = "100%";
                    video.style.height = "100%";
                    video.style.zIndex = "-1"; // 低于 .mica，被其半透明蒙黑盖住
                    video.style.bottom = "0";
                    video.style.objectFit = "cover";
                    video.src = currentSong.video;

                    // 视频加载完成后设置时间：音频在播则播，暂停则显示静止帧（清掉封面后立即可见）
                    video.addEventListener("loadedmetadata", () => {
                        // 同步当前音频进度
                        video.currentTime = currentTime;

                        // 音画同步：音频在播才播视频
                        const audioPlayer = document.querySelector("audio");
                        if (audioPlayer && !audioPlayer.paused) {
                            video.play().catch((err) => console.warn("视频自动播放失败:", err));
                        }
                    });

                    // 添加同步事件（播放/暂停/进度全联动）
                    const audioPlayer = document.querySelector("audio");
                    if (audioPlayer) {
                        const syncVideo = () => {
                            // 确保视频跟随音频进度
                            if (Math.abs(video.currentTime - audioPlayer.currentTime) > 0.5) {
                                video.currentTime = audioPlayer.currentTime;
                            }
                        };

                        audioPlayer.addEventListener("play", () => video.play().catch(() => {}));
                        audioPlayer.addEventListener("pause", () => video.pause());
                        audioPlayer.addEventListener("seeking", syncVideo);

                        // 每5秒同步一次进度，防止长时间播放出现偏移
                        const syncInterval = setInterval(syncVideo, 5000);
                        video.addEventListener("remove", () => clearInterval(syncInterval), { once: true });
                    }

                    // 挂载到 body（.mica 之后）
                    document.body.appendChild(video);
                }
                break;
            }
        }

        // 广播背景切换事件（供播放条背景切换按钮同步状态）
        window.dispatchEvent(new CustomEvent("app-background-changed", { detail: type }));
    }

    // 新增方法：清理所有视频背景
    cleanupVideoBackgrounds() {
        // 兼容旧挂载点（body）与新挂载点（.mica 主体区）
        const oldVideos = document.querySelectorAll("body > video, .mica > video");
        oldVideos.forEach((video) => {
            video.pause();
            video.remove();
        });
    }

    // 毛玻璃开关：关闭（默认）时加 no-glass，所有 backdrop-filter 失效
    applyGlassEffect() {
        const root = document.documentElement;
        // 兼容布尔与字符串 "true"/"false"（旧数据可能存了字符串）
        const enabled = this.settings.glassEffect === true || this.settings.glassEffect === "true";
        if (enabled) {
            root.classList.remove("no-glass");
        } else {
            root.classList.add("no-glass");
        }
    }

    clearCache() {
        try {
            // 清除应用缓存
            localStorage.removeItem("songCache");
            localStorage.removeItem("videoCache");

            // 显示通知
            if (this.uiManager) {
                this.uiManager.showNotification("缓存已清除", "success");
            }

            // 可以添加其他缓存清理逻辑
            if (window.app && window.app.cacheManager) {
                window.app.cacheManager.clearCache();
            }
        } catch (error) {
            console.error("清除缓存失败:", error);
            if (this.uiManager) {
                this.uiManager.showNotification("清除缓存失败", "error");
            }
        }
    }

    setupAboutLinks() {
        // GitHub仓库链接
        document.getElementById("github-link")?.addEventListener("click", (e) => {
            e.preventDefault();
            shell.openExternal("https://github.com/NB-Group/NB_Music");
        });

        // 报告问题链接
        document.getElementById("report-bug")?.addEventListener("click", (e) => {
            e.preventDefault();
            shell.openExternal("https://github.com/NB-Group/NB_Music/issues/new");
        });

        // 检查更新按钮
        document.getElementById("check-update")?.addEventListener("click", (e) => {
            e.preventDefault();

            // 发送检查更新事件
            ipcRenderer.send("check-for-updates");

            // 显示更新界面
            if (window.app && window.app.updateManager) {
                window.app.updateManager.show();
                window.app.updateManager.showStatus("正在检查更新...");
            } else {
                if (this.uiManager) {
                    this.uiManager.showNotification("更新管理器未初始化", "error");
                }
            }
        });

        // 打开欢迎指南
        document.getElementById("open-welcome")?.addEventListener("click", (e) => {
            e.preventDefault();
            if (window.app) {
                window.app.showWelcomeDialog();
            }
        });
    }

    setAppVersion() {
        // 从package.json获取版本号
        const versionElement = document.getElementById("app-version");
        if (versionElement) {
            ipcRenderer.invoke("get-app-version").then((version) => {
                versionElement.textContent = version || "1.0.0";
            });
        }
    }

    // 新增：获取清晰度名称的辅助方法
    getQualityName(quality) {
        const qualityMap = {
            16: "360P",
            32: "480P",
            64: "720P",
            80: "1080P",
            112: "1080P+",
            116: "1080P60",
            120: "4K",
            125: "HDR",
            126: "杜比视界",
            127: "8K"
        };
        return qualityMap[quality] || "未知";
    }

    // 新增：获取项目贡献者信息的方法
    fetchContributors() {
        const contributorsContainer = document.getElementById("contributors-container");
        if (!contributorsContainer) return;
        
        contributorsContainer.innerHTML = '<div class="loading-contributors">加载中...</div>';
        
        // 从GitHub API获取贡献者信息
        fetch('https://api.github.com/repos/NB-Group/NB_Music/contributors')
            .then(response => {
                if (!response.ok) {
                    throw new Error('获取贡献者信息失败');
                }
                return response.json();
            })
            .then(contributors => {
                // 处理获取到的贡献者信息
                contributorsContainer.innerHTML = '';
                
                // 显示最多8个主要贡献者
                const mainContributors = contributors.slice(0, 8);
                
                mainContributors.forEach(contributor => {
                    const contributorEl = document.createElement('div');
                    contributorEl.className = 'contributor';
                    contributorEl.innerHTML = `
                        <a href="${contributor.html_url}" title="${contributor.login}" class="contributor-link">
                            <img src="${contributor.avatar_url}" alt="${contributor.login}" class="contributor-avatar" />
                            <div class="contributor-info">
                                <div class="contributor-name">${contributor.login}</div>
                                <div class="contributor-commits">${contributor.contributions} 次贡献</div>
                            </div>
                        </a>
                    `;
                    
                    contributorEl.querySelector('a').addEventListener('click', (e) => {
                        e.preventDefault();
                        shell.openExternal(contributor.html_url);
                    });
                    
                    contributorsContainer.appendChild(contributorEl);
                });
                
                // 如果贡献者超过8个，添加查看更多按钮
                if (contributors.length > 8) {
                    const viewMoreEl = document.createElement('div');
                    viewMoreEl.className = 'view-more-contributors';
                    viewMoreEl.innerHTML = `<a href="#" id="view-all-contributors">+${contributors.length - 8} 查看全部</a>`;
                    contributorsContainer.appendChild(viewMoreEl);
                    
                    // 添加事件监听
                    viewMoreEl.querySelector('a').addEventListener('click', (e) => {
                        e.preventDefault();
                        shell.openExternal("https://github.com/NB-Group/NB_Music/graphs/contributors");
                    });
                }
            })
            .catch(error => {
                console.error('获取贡献者失败:', error);
                contributorsContainer.innerHTML = `
                    <div class="contributors-error">
                        <i class="bi bi-exclamation-triangle"></i>
                        <div>加载贡献者信息失败</div>
                        <a href="#" id="retry-fetch-contributors">重试</a>
                    </div>
                `;
                
                document.getElementById('retry-fetch-contributors')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.fetchContributors();
                });
            });
    }

    // 新增方法：设置窗口状态记忆
    setupWindowStateSettings() {
        // 从主进程获取当前的窗口状态设置
        ipcRenderer.invoke("get-restore-window-state").then(value => {
            this.settings.restoreWindowState = value;
            
            // 更新UI
            const navElement = document.querySelector(`[data-key="restoreWindowState"][data-value="${value}"]`);
            if (navElement) {
                const navParent = navElement.parentElement;
                navParent.querySelectorAll("a").forEach(a => a.classList.remove("active"));
                navElement.classList.add("active");
            }
        }).catch(error => {
            console.error("获取窗口状态设置失败:", error);
        });
    }
}

module.exports = SettingManager;
