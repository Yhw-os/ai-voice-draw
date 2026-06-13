/**
 * 主应用逻辑
 * 连接语音输入、AI解析、Canvas绘图
 */

// 常见指令缓存（避免重复调用API）
const commandCache = {
    "画一个红色的圆": {"action":"draw","shapes":[{"type":"circle","params":{"x":400,"y":300,"radius":50,"color":"red","fill":true}}],"response_text":"好的，我画了一个红色的圆。"},
    "画一个蓝色的矩形": {"action":"draw","shapes":[{"type":"rectangle","params":{"x":350,"y":250,"width":100,"height":100,"color":"blue","fill":true}}],"response_text":"好的，我画了一个蓝色的矩形。"},
    "画一个绿色的三角形": {"action":"draw","shapes":[{"type":"triangle","params":{"x":400,"y":300,"size":50,"color":"green","fill":true}}],"response_text":"好的，我画了一个绿色的三角形。"},
    "清空画布": {"action":"clear","response_text":"画布已清空。"},
    "撤销": {"action":"undo","response_text":"已撤销上一步操作。"},
};

/**
 * 本地指令解析（无需API，瞬时响应）
 */
function parseCommandLocal(text) {
    text = text.trim();
    
    // 颜色映射
    const colorMap = {
        '红': 'red', '红色': 'red',
        '蓝': 'blue', '蓝色': 'blue',
        '绿': 'green', '绿色': 'green',
        '黄': 'yellow', '黄色': 'yellow',
        '黑': 'black', '黑色': 'black',
        '白': 'white', '白色': 'white',
        '橙': 'orange', '橙色': 'orange',
        '紫': 'purple', '紫色': 'purple',
        '粉': 'pink', '粉色': 'pink',
        '棕': 'brown', '棕色': 'brown',
    };
    
    // 位置映射
    const posMap = {
        '中心': {x: 400, y: 300},
        '左上角': {x: 150, y: 150},
        '右上角': {x: 650, y: 150},
        '左下角': {x: 150, y: 450},
        '右下角': {x: 650, y: 450},
        '上方': {x: 400, y: 150},
        '下方': {x: 400, y: 450},
        '左边': {x: 150, y: 300},
        '右边': {x: 650, y: 300},
    };
    
    // 大小映射
    const sizeMap = {
        '小': 30, '小的': 30,
        '中': 50, '中的': 50, '中等': 50,
        '大': 80, '大的': 80,
        '很大': 120, '非常大': 120,
    };
    
    // 特殊指令
    if (text.includes('清空') || text.includes('清除')) {
        return {action: 'clear', response_text: '画布已清空。'};
    }
    if (text.includes('撤销') || text.includes('取消')) {
        return {action: 'undo', response_text: '已撤销上一步操作。'};
    }
    if (text.includes('导出') || text.includes('保存')) {
        return {action: 'export', response_text: '图片已导出。'};
    }
    
    // 解析颜色
    let color = 'red';
    for (const [cn, en] of Object.entries(colorMap)) {
        if (text.includes(cn)) {
            color = en;
            break;
        }
    }
    
    // 解析位置
    let x = 400, y = 300;
    for (const [pos, coord] of Object.entries(posMap)) {
        if (text.includes(pos)) {
            x = coord.x;
            y = coord.y;
            break;
        }
    }
    
    // 解析大小
    let size = 50;
    for (const [s, val] of Object.entries(sizeMap)) {
        if (text.includes(s)) {
            size = val;
            break;
        }
    }
    
    // 解析图形类型
    if (text.includes('圆') || text.includes('圆形')) {
        return {
            action: 'draw',
            shapes: [{type: 'circle', params: {x, y, radius: size, color, fill: true}}],
            response_text: `好的，我画了一个${color === 'red' ? '红' : color === 'blue' ? '蓝' : color === 'green' ? '绿' : ''}色的圆。`
        };
    }
    if (text.includes('矩形') || text.includes('长方形') || text.includes('方块')) {
        return {
            action: 'draw',
            shapes: [{type: 'rectangle', params: {x: x - size, y: y - size, width: size * 2, height: size * 2, color, fill: true}}],
            response_text: `好的，我画了一个矩形。`
        };
    }
    if (text.includes('三角') || text.includes('三角形')) {
        return {
            action: 'draw',
            shapes: [{type: 'triangle', params: {x, y, size, color, fill: true}}],
            response_text: `好的，我画了一个三角形。`
        };
    }
    if (text.includes('线') || text.includes('线段')) {
        return {
            action: 'draw',
            shapes: [{type: 'line', params: {x1: x - size, y1: y, x2: x + size, y2: y, color, lineWidth: 3}}],
            response_text: `好的，我画了一条线。`
        };
    }
    
    // 无法本地解析，返回null，走API
    return null;
}

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
    
    // Step 1: 本地解析（零延迟）
    const localResult = parseCommandLocal(text);
    if (localResult) {
        console.log('本地解析命中:', text);
        executeCommand(localResult);
        addLog('⚡ 本地解析，零延迟响应', 'success');
        return;
    }
    
    // Step 2: 检查缓存
    if (commandCache[text]) {
        console.log('缓存命中:', text);
        executeCommand(commandCache[text]);
        addLog('⚡ 缓存命中，零延迟响应', 'success');
        return;
    }
    
    // Step 3: 调用DeepSeek API
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
        
        // 缓存结果
        commandCache[text] = data;
        
        executeCommand(data);

    } catch (error) {
        console.error('解析失败:', error);
        addLog(`❌ 网络错误：${error.message}`, 'error');
        updateAIResponse('网络连接失败，使用默认图形');
        
        // Fallback: 画一个灰色圆
        const fallback = {
            action: 'draw',
            shapes: [{type: 'circle', params: {x: 400, y: 300, radius: 50, color: 'gray', fill: true}}],
            response_text: '网络不稳定，我画了一个默认的圆。'
        };
        executeCommand(fallback);
        
    } finally {
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