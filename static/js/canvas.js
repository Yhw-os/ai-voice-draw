/**
 * Canvas绘图引擎
 * 负责所有图形绘制、撤销/重做、导出
 */

class CanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.history = [];      // 绘图历史（用于撤销）
        this.historyStep = -1;  // 当前历史位置
        
        // 初始化空白画布
        this.clear(false);
    }

    /**
     * 清空画布
     * @param {boolean} saveHistory 是否保存到历史记录
     */
    clear(saveHistory = true) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (saveHistory) {
            this.saveState();
        }
    }

    /**
     * 保存当前画布状态到历史
     */
    saveState() {
        // 删除当前位置之后的历史（如果有）
        this.history = this.history.slice(0, this.historyStep + 1);
        this.history.push(this.canvas.toDataURL());
        this.historyStep++;
        
        // 限制历史记录数量（防止内存溢出）
        if (this.history.length > 50) {
            this.history.shift();
            this.historyStep--;
        }
    }

    /**
     * 撤销
     */
    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState(this.history[this.historyStep]);
            return true;
        }
        return false;
    }

    /**
     * 恢复画布状态
     */
    restoreState(dataUrl) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
    }

    /**
     * 边界检查：确保坐标在画布内
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 绘制圆形
     */
    drawCircle(x, y, radius, color, fill = true) {
        // 边界检查：确保圆在画布内
        x = this.clamp(x, radius, this.canvas.width - radius);
        y = this.clamp(y, radius, this.canvas.height - radius);
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        if (fill) {
            this.ctx.fillStyle = color;
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        this.saveState();
    }

    /**
     * 绘制矩形
     */
    drawRectangle(x, y, width, height, color, fill = true) {
        // 边界检查：确保矩形在画布内
        x = this.clamp(x, 0, this.canvas.width - width);
        y = this.clamp(y, 0, this.canvas.height - height);
        
        if (fill) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, width, height);
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, width, height);
        }
        
        this.saveState();
    }

    /**
     * 绘制线段
     */
    drawLine(x1, y1, x2, y2, color, lineWidth = 2) {
        // 边界检查：确保线段端点在画布内
        x1 = this.clamp(x1, 0, this.canvas.width);
        y1 = this.clamp(y1, 0, this.canvas.height);
        x2 = this.clamp(x2, 0, this.canvas.width);
        y2 = this.clamp(y2, 0, this.canvas.height);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();
        
        this.saveState();
    }

    /**
     * 绘制三角形
     */
    drawTriangle(x, y, size, color, fill = true) {
        // 边界检查：确保三角形在画布内
        x = this.clamp(x, size, this.canvas.width - size);
        y = this.clamp(y, size, this.canvas.height - size);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - size);
        this.ctx.lineTo(x - size, y + size);
        this.ctx.lineTo(x + size, y + size);
        this.ctx.closePath();
        
        if (fill) {
            this.ctx.fillStyle = color;
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        this.saveState();
    }

    /**
     * 绘制文字
     */
    drawText(text, x, y, color, fontSize = 20) {
        // 边界检查：确保文字在画布内
        x = this.clamp(x, fontSize, this.canvas.width - fontSize);
        y = this.clamp(y, fontSize, this.canvas.height - fontSize);
        
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x, y);
        
        this.saveState();
    }

    /**
     * 导出图片
     */
    exportImage() {
        const link = document.createElement('a');
        link.download = `ai-drawing-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    /**
     * 获取画布数据（用于调试）
     */
    getCanvasData() {
        return this.canvas.toDataURL();
    }
}

// 全局实例
let engine;

// PR说明: 本分支实现Canvas绘图引擎与前端UI