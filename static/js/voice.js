/**
 * 语音输入模块
 * 基于浏览器 Web Speech API
 */

class VoiceInput {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.onResultCallback = null;
        this.onErrorCallback = null;
        
        this.init();
    }

    init() {
        // 检查浏览器支持
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('浏览器不支持 Web Speech API');
            this.updateStatus('error', '当前浏览器不支持语音识别，请使用Chrome或Edge');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'zh-CN';  // 中文
        this.recognition.continuous = false;  // 单次识别
        this.recognition.interimResults = true;  // 返回临时结果
        this.recognition.maxAlternatives = 1;

        // 开始识别
        this.recognition.onstart = () => {
            this.isRecording = true;
            this.updateStatus('recording');
        };

        // 识别结果
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // 显示临时结果
            if (interimTranscript) {
                this.showRecognizedText(interimTranscript, true);
            }

            // 最终结果
            if (finalTranscript && this.onResultCallback) {
                this.showRecognizedText(finalTranscript, false);
                this.onResultCallback(finalTranscript);
            }
        };

        // 识别结束
        this.recognition.onend = () => {
            this.isRecording = false;
            this.updateStatus('idle');
        };

        // 错误处理
        this.recognition.onerror = (event) => {
            this.isRecording = false;
            this.updateStatus('error');
            
            let errorMsg = '语音识别出错';
            switch(event.error) {
                case 'no-speech':
                    errorMsg = '没有检测到语音，请重试';
                    break;
                case 'audio-capture':
                    errorMsg = '无法访问麦克风';
                    break;
                case 'not-allowed':
                    errorMsg = '麦克风权限被拒绝';
                    break;
                case 'network':
                    errorMsg = '网络错误，请检查连接';
                    break;
            }
            
            if (this.onErrorCallback) {
                this.onErrorCallback(errorMsg);
            }
        };

        this.updateStatus('ready');
    }

    /**
     * 开始录音
     */
    start() {
        if (!this.recognition) {
            alert('浏览器不支持语音识别');
            return;
        }
        
        if (this.isRecording) return;
        
        try {
            this.recognition.start();
        } catch (e) {
            console.error('启动识别失败:', e);
        }
    }

    /**
     * 停止录音
     */
    stop() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }
    }

    /**
     * 设置识别结果回调
     */
    onResult(callback) {
        this.onResultCallback = callback;
    }

    /**
     * 设置错误回调
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }

    /**
     * 更新麦克风状态显示
     */
    updateStatus(status) {
        const indicator = document.getElementById('mic-status');
        if (!indicator) return;

        const states = {
            ready: { text: '🎤 麦克风：就绪', class: '' },
            recording: { text: '🔴 正在录音...', class: 'active' },
            idle: { text: '🎤 麦克风：就绪', class: '' },
            error: { text: '❌ 麦克风：不可用', class: 'error' }
        };

        const state = states[status] || states.ready;
        indicator.textContent = state.text;
        indicator.className = 'status-indicator ' + state.class;
    }

    /**
     * 显示识别文本
     */
    showRecognizedText(text, isInterim) {
        const el = document.getElementById('recognized-text');
        if (!el) return;
        
        el.textContent = isInterim ? `识别中：${text}` : `识别结果：${text}`;
        el.classList.add('show');
    }
}

// 全局实例
let voiceInput;