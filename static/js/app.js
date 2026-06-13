/**
 * 主应用逻辑
 * 连接语音输入、AI解析、Canvas绘图
 */

document.addEventListener('DOMContentLoaded', () => {
    // 初始化模块
    engine = new CanvasEngine('drawCanvas');
    voiceInput = new VoiceInput();

    // 绑定语音结果回调
    voiceInput.onResult(handleVoiceResult);
    voiceInput.onError(handleVoiceError);

    // 绑定录音按钮
    const recordBtn = document.getElementById('btn-record');
    let isPressed = false;

    // 鼠标/触摸按下开始录音
    recordBtn.addEventListener('mousedown', startRecording);
    recordBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startRecording();
    });

    // 鼠标/触摸松开结束录音
    recordBtn.addEventListener('mouseup', stopRecording);
    recordBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopRecording();
    });

    // 鼠标移出也停止
    recordBtn.addEventListener('mouseleave', () => {
        if (isPressed) stopRecording();
    });

    function startRecording() {
        if (isPressed) return;
        isPressed = true;
        recordBtn.classList.add('recording');
        voiceInput.start();
        addLog('🎤 开始录音...', 'pending');
    }

    function stopRecording() {
        if (!isPressed) return;
        isPressed = false;
        recordBtn.classList.remove('recording');
        voiceInput.stop();
    }

    // 检测API状态
    checkApiStatus();

    console.log('🎨 AI语音绘图工具已初始化');
});

/**
 * 处理语音识别结果
 */
async function handleVoiceResult(text) {
    addLog(`🗣️ "${text}"`, 'pending');
    updateAIResponse('正在解析指令...');
    
    // 显示加载动画
    showLoading(true);

    try {
        const response = await fetch('/api/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        console.log('AI解析结果:', data);
        executeCommand(data);

    } catch (error) {
        console.error('解析失败:', error);
        addLog(`❌ 网络错误：${error.message}`, 'error');
        updateAIResponse('网络连接失败，请检查后端服务是否运行');
    } finally {
        // 隐藏加载动画
        showLoading(false);
    }
}

/**
 * 处理语音错误
 */
function handleVoiceError(msg) {
    addLog(`❌ ${msg}`, 'error');
    updateAIResponse(msg);
}

/**
 * 执行AI解析后的绘图指令
 */
function executeCommand(data) {
    const { action, shapes, response_text } = data;

    // 更新AI反馈文本
    updateAIResponse(response_text || '指令已执行');

    switch (action) {
        case 'clear':
            engine.clear();
            addLog('🗑️ 清空画布', 'success');
            break;

        case 'undo':
            const undone = engine.undo();
            addLog(undone ? '↩️ 撤销成功' : '⚠️ 没有可撤销的操作', 'success');
            break;

        case 'export':
            engine.exportImage();
            addLog('💾 图片已导出', 'success');
            break;

        case 'draw':
            if (shapes && shapes.length > 0) {
                shapes.forEach(shape => drawShape(shape));
                addLog(`✅ 绘制了 ${shapes.length} 个图形`, 'success');
            } else {
                addLog('⚠️ 没有可绘制的图形', 'error');
            }
            break;

        case 'unknown':
            addLog(`❓ ${response_text}`, 'error');
            break;

        case 'error':
            addLog(`❌ ${response_text}`, 'error');
            break;

        default:
            addLog(`⚠️ 未知指令: ${action}`, 'error');
    }
}

/**
 * 绘制单个图形
 */
function drawShape(shape) {
    const { type, params } = shape;
    const { x, y, color, fill } = params;

    switch (type) {
        case 'circle':
            engine.drawCircle(x, y, params.radius, color, fill);
            break;

        case 'rectangle':
            engine.drawRectangle(x, y, params.width, params.height, color, fill);
            break;

        case 'line':
            engine.drawLine(params.x1, params.y1, params.x2, params.y2, color, params.lineWidth);
            break;

        case 'triangle':
            engine.drawTriangle(x, y, params.size, color, fill);
            break;

        case 'text':
            engine.drawText(params.text, x, y, color, params.fontSize);
            break;

        default:
            console.warn('未知图形类型:', type);
    }
}

/**
 * 添加日志
 */
function addLog(message, type) {
    const logContainer = document.getElementById('command-log');
    if (!logContainer) return;

    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    item.textContent = message;
    
    logContainer.insertBefore(item, logContainer.firstChild);

    // 限制日志数量
    while (logContainer.children.length > 20) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

/**
 * 更新AI反馈
 */
function updateAIResponse(text) {
    const el = document.querySelector('.ai-text');
    if (el) {
        el.textContent = text;
    }
}

/**
 * 检测API状态
 */
async function checkApiStatus() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        const indicator = document.getElementById('api-status');
        if (indicator) {
            if (data.deepseek_configured) {
                indicator.textContent = '🔌 API：已配置';
                indicator.classList.add('active');
            } else {
                indicator.textContent = '⚠️ API：未配置';
                indicator.classList.add('error');
            }
        }
    } catch (e) {
        const indicator = document.getElementById('api-status');
        if (indicator) {
            indicator.textContent = '❌ API：连接失败';
            indicator.classList.add('error');
        }
    }
}

/**
 * 快捷操作：清空画布
 */
function clearCanvas() {
    engine.clear();
    addLog('🗑️ 手动清空画布', 'success');
    updateAIResponse('画布已清空');
}

/**
 * 快捷操作：撤销
 */
function undoLast() {
    const undone = engine.undo();
    addLog(undone ? '↩️ 手动撤销' : '⚠️ 没有可撤销的操作', 'success');
}

/**
 * 快捷操作：导出图片
 */
function exportImage() {
    engine.exportImage();
    addLog('💾 图片已导出', 'success');
}
/**
 * 显示/隐藏加载动画
 */
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.toggle('show', show);
    }
}