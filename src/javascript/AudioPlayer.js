class AudioPlayer {
    // error 事件自动恢复次数上限（超出后只提示，不再自动重播）
    static MAX_ERROR_RECOVERIES = 2;

    /**
     * 音频播放组件
     * @param {import("./PlaylistManager.js")} playlistManager
     */
    constructor(playlistManager) {
        this.playlistManager = playlistManager;
        this.audio = new Audio();
        // 挂载到 DOM：供 document.querySelector("audio") 使用（视频背景音画同步等依赖）
        try {
            this.audio.style.display = "none";
            document.body.appendChild(this.audio);
        } catch (e) {}
        this.audio.autoplay = false;
        this.audio.loop = false;
        this.audio.volume = 0; // 将由setSettingManager覆盖
        this.volumeInterval = null;
        /**
         * @type {import("./SettingManager.js")}
         */
        this.settingManager = null; // 将在初始化时设置
        this.lastProgressSaveTime = 0;
        this.isPlayRequestPending = false; // 跟踪播放请求状态
        this.userPaused = false; // 用户主动暂停后，禁止一切自动重试
        this.errorRecoveryCount = 0; // error 自动恢复计数（有上限，避免 CDN 故障时无限重播开头）
        /**
         * @type {import("./UIManager.js")}
         */
        this.uimanager = null; // 将由UIManager设置
        
        this.audio.addEventListener("timeupdate", () => {
            // 增加保存频率：每10秒保存一次进度
            const now = Date.now();
            if ((now - this.lastProgressSaveTime) > 10000) {
                this.playlistManager.savePlaylists();
                this.lastProgressSaveTime = now;
            }
        });

        // 在暂停时保存进度
        this.audio.addEventListener("pause", () => {
            this.playlistManager.savePlaylists();
            this.lastProgressSaveTime = Date.now();
            this.isPlayRequestPending = false; // 重置请求状态
        });
        
        // 在播放结束时保存进度
        this.audio.addEventListener('ended', () => {
            this.playlistManager.savePlaylists();
            this.lastProgressSaveTime = Date.now();
            this.isPlayRequestPending = false; // 重置请求状态
            this.next();
        });
        
        // 监听错误事件
        this.audio.addEventListener('error', (e) => {
            console.error('音频播放错误:', e);
            this.isPlayRequestPending = false;

            // 用户已主动暂停，不再自动恢复
            if (this.userPaused) return;

            // 自动恢复次数用尽，只提示，避免 CDN 故障时无限重播开头
            if (this.errorRecoveryCount >= AudioPlayer.MAX_ERROR_RECOVERIES) {
                if (this.uimanager) {
                    this.uimanager.showNotification('音频加载失败，请稍后重试或手动切歌', 'error');
                }
                return;
            }
            this.errorRecoveryCount++;

            if (this.uimanager) {
                this.uimanager.showNotification('播放出错，正在尝试恢复...', 'warning');
            }
            // 延迟后重新加载当前歌曲
            setTimeout(() => {
                if (this.userPaused) return; // 延迟期间用户可能已暂停
                if (this.playlistManager && this.playlistManager.playlist.length > 0) {
                    this.playlistManager.tryPlayWithRetry(
                        this.playlistManager.playlist[this.playlistManager.playingNow]
                    );
                }
            }, 1000);
        });
        
        // 在离开页面前保存进度
        window.addEventListener('beforeunload', () => {
            this.playlistManager.savePlaylists();
        });

        if ("mediaSession" in navigator) {
            navigator.mediaSession.setActionHandler("play", () => {
                this.play();
            });
            navigator.mediaSession.setActionHandler("pause", () => {
                this.audioPause();
            });
            navigator.mediaSession.setActionHandler("previoustrack", () => {
                this.prev();
            });
            navigator.mediaSession.setActionHandler("nexttrack", () => {
                this.next();
            });
        }

        this.audio.addEventListener("play", () => {
            if ("mediaSession" in navigator) {
                navigator.mediaSession.playbackState = "playing";
            }
            // 新增音量同步逻辑
            if (this.settingManager) {
                this.audio.volume = this.getNormalizedVolume();
            }
            this.isPlayRequestPending = false;
            // 播放真正开始：重置自动恢复计数并清除暂停意图
            this.userPaused = false;
            this.errorRecoveryCount = 0;
        });

        this.audio.addEventListener("pause", () => {
            if ("mediaSession" in navigator) {
                navigator.mediaSession.playbackState = "paused";
            }
            // 新增音量同步逻辑
            if (this.settingManager) {
                this.audio.volume = this.getNormalizedVolume();
            }
        });
    }

    async audioPlay() {
        // 防止重复请求
        if (this.isPlayRequestPending) return;
        this.isPlayRequestPending = true;

        // 用户主动播放：清除暂停意图并重置自动恢复计数
        this.userPaused = false;
        this.errorRecoveryCount = 0;
        
        try {
            // 检查是否启用了淡入淡出效果
            const fadeEnabled = this.settingManager && 
                this.settingManager.getSetting('fadeEnabled') === 'true';

            // 清除现有间隔
            if (this.volumeInterval) {
                clearInterval(this.volumeInterval);
                this.volumeInterval = null;
            }

            // 获取当前音量设置
            const currentVolume = this.getNormalizedVolume();

            // 如果音量为0或禁用了淡入淡出效果，直接设置音量为当前音量并播放
            if (!fadeEnabled || currentVolume === 0) {
                this.audio.volume = currentVolume;
                await this.audio.play();
                this.isPlayRequestPending = false;
                return;
            }

            // 启用淡入淡出时的逻辑
            this.audio.volume = 0.01; // 从最低可听音量开始
            await this.audio.play();
            
            this.volumeInterval = window.setInterval(() => {
                this.audio.volume = Math.min(currentVolume, this.audio.volume + 0.01);
                if (this.audio.volume >= currentVolume) {
                    clearInterval(this.volumeInterval);
                    this.volumeInterval = null;
                    this.isPlayRequestPending = false;
                }
            }, 6);
        } catch (error) {
            console.error('播放失败:', error);
            this.isPlayRequestPending = false;
            if (this.uimanager) {
                this.uimanager.showNotification('播放失败，正在重试...', 'error');
            }
            if (!this.userPaused) {
                this.playlistManager.tryPlayWithRetry(this.playlistManager.playlist[this.playlistManager.playingNow]);
            }
        }
    }

    audioPause() {
        // 用户主动暂停：最高优先级，立即标记并取消进行中的加载/自动重试
        this.userPaused = true;
        if (this.playlistManager && typeof this.playlistManager.cancelPlayRetry === 'function') {
            this.playlistManager.cancelPlayRetry();
        }

        // 清除现有音量渐变间隔
        if (this.volumeInterval) {
            clearInterval(this.volumeInterval);
            this.volumeInterval = null;
        }

        // 检查是否启用了淡入淡出效果
        const fadeEnabled = this.settingManager &&
            this.settingManager.getSetting('fadeEnabled') === 'true';

        // 获取当前音量设置
        const currentVolume = this.getNormalizedVolume();

        // 如果音量为0或禁用了淡入淡出效果，直接暂停
        if (!fadeEnabled || currentVolume === 0) {
            this.audio.pause();
            this.isPlayRequestPending = false;
            return;
        }

        // 已经处于暂停状态则无需淡出
        if (this.audio.paused) {
            this.isPlayRequestPending = false;
            return;
        }

        // 保存当前音量，用于淡出后重置
        const originalVolume = this.audio.volume;

        // 启用淡入淡出时的逻辑
        this.volumeInterval = window.setInterval(() => {
            this.audio.volume = Math.max(0, this.audio.volume - 0.01);
            if (this.audio.volume <= 0.02) {
                this.audio.volume = 0;
                this.audio.pause();
                // 重置音量为原始值，以便下次播放
                this.audio.volume = originalVolume;
                clearInterval(this.volumeInterval);
                this.volumeInterval = null;
                this.isPlayRequestPending = false;
            }
        }, 6);
    }

    async play() {
        try {
            if (!this.audio.getAttribute('src')) {
                if (this.uimanager) {
                    this.uimanager.showNotification("无音频链接", "warning");
                }
                return;
            }
            
            const playButton = document.querySelector(".control>.buttons>.play");

            // 播放/重试/加载进行中时，点击按钮一律视为「中止」，避免暂停被当成重新播放
            const busy = this.isPlayRequestPending || (this.playlistManager && this.playlistManager.isRetrying);

            if (this.audio.paused && !busy) {
                // 立即更新UI，提供即时反馈
                playButton.classList = "play playing";
                await this.audioPlay();
                playButton.classList = "play played";
            } else {
                // 立即更新UI，提供即时反馈
                playButton.classList = "play pausing";
                this.audioPause();
                playButton.classList = "play paused";
            }
        } catch (e) {
            console.error("播放控制错误:", e);
            document.querySelector(".control>.buttons>.play").classList = "play paused";
            this.isPlayRequestPending = false;
            if (this.uimanager) {
                this.uimanager.showNotification("播放失败，正在重试...", "error");
            }
            // 添加短暂延迟再重试，避免立即重试可能导致的同样错误
            setTimeout(() => {
                if (this.userPaused) return; // 用户可能已暂停
                this.playlistManager.tryPlayWithRetry(this.playlistManager.playlist[this.playlistManager.playingNow]);
            }, 1000);
        }
    }

    prev() {
        // 检查是否有请求正在处理中
        if (this.isPlayRequestPending || this.playlistManager.isLoading) {
            return;
        }
        
        // 重置音量和清除间隔
        if (this.volumeInterval) {
            clearInterval(this.volumeInterval);
            this.volumeInterval = null;
        }
        // 使用当前音量设置而不是强制设为1
        const currentVolume = this.getNormalizedVolume();
        this.audio.volume = currentVolume;
    
        let prevIndex;
        if (this.playlistManager.playMode === 'shuffle') {
            // 预随机：按洗牌序列后退
            const prev = this.playlistManager.getShufflePrevIndex();
            this.playlistManager._autoAdvancing = true;
            this.playlistManager.setPlayingNow(prev);
            this.playlistManager._autoAdvancing = false;
            return;
        } else {
            // 列表循环和单曲循环模式下都使用相同的上一首逻辑
            prevIndex = this.playlistManager.playingNow > 0 ? 
                this.playlistManager.playingNow - 1 : 
                this.playlistManager.playlist.length - 1;
        }
        
        this.playlistManager.setPlayingNow(prevIndex);
    }
    
    next() {
        // 检查是否有请求正在处理中
        if (this.isPlayRequestPending || this.playlistManager.isLoading) {
            return;
        }
        
        // 重置音量和清除间隔
        if (this.volumeInterval) {
            clearInterval(this.volumeInterval);
            this.volumeInterval = null;
        }
        // 使用当前音量设置而不是强制设为1
        const currentVolume = this.getNormalizedVolume();
        this.audio.volume = currentVolume;
    
        let nextIndex;
        switch (this.playlistManager.playMode) {
            case 'shuffle': {
                // 预随机：按洗牌序列前进
                const next = this.playlistManager.getShuffleNextIndex();
                this.playlistManager._autoAdvancing = true;
                this.playlistManager.setPlayingNow(next);
                this.playlistManager._autoAdvancing = false;
                return;
            }
            case 'repeat': {
                // 列表循环模式下使用下一首逻辑
                nextIndex = this.playlistManager.playingNow < this.playlistManager.playlist.length - 1 ?
                    this.playlistManager.playingNow + 1 :
                    0;
                break;
            }
            default: {
                nextIndex = this.playlistManager.playingNow;
            }
        }
        this.playlistManager.setPlayingNow(nextIndex);
    }

    // 归一化音量（设置值 0-100 → 0-1）
    getNormalizedVolume() {
        return this.settingManager ? Math.max(0, this.settingManager.getSetting("volume") / 100) : 1;
    }

    // 设置 settingManager 的方法
    setSettingManager(settingManager) {
        this.settingManager = settingManager;
        // 当settingManager被设置时，立即更新音量
        if (this.settingManager) {
            const currentVolume = this.getNormalizedVolume();
            this.audio.volume = currentVolume === 0 ? 0 : currentVolume;
        }
    }
    
    // 设置 uiManager 引用
    setUiManager(uiManager) {
        this.uimanager = uiManager;
    }
    
    // 重置播放状态
    resetPlayState() {
        this.isPlayRequestPending = false;
        this.userPaused = false;
        this.errorRecoveryCount = 0;
        if (this.volumeInterval) {
            clearInterval(this.volumeInterval);
            this.volumeInterval = null;
        }
        // 使用当前音量设置
        const currentVolume = this.getNormalizedVolume();
        this.audio.volume = currentVolume;
    }
}

module.exports = AudioPlayer;
