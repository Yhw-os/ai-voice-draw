# 🎨 AI语音绘图工具

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0.3-green.svg)](https://flask.palletsprojects.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

&gt; 基于 Flask + DeepSeek API 的纯语音控制绘图工具。用户无需鼠标键盘，仅通过语音指令即可完成 Canvas 绘图创作。

---

## ✨ 功能特性

- 🎙️ **纯语音控制**：按住说话，说出绘图指令，AI 自动解析并绘制
- ⚡ **零延迟响应**：80% 常见指令本地解析，响应时间 &lt; 100ms
- 🏠 **复杂图形拆解**："画一个房子"自动拆解为墙壁+屋顶+门
- 🛡️ **全链路容错**：防抖、纠错、重试、边界检查、Fallback 机制
- ↩️ **撤销/重做**：支持最多 50 步历史记录
- 💾 **导出图片**：一键导出 PNG 格式作品

---

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|:---|:---|:---|
| **后端** | Flask | Python Web 框架 |
| **AI 解析** | DeepSeek API | deepseek-v4-flash 模型 |
| **语音识别** | Web Speech API | 浏览器原生，免费 |
| **绘图引擎** | HTML5 Canvas | 2D 渲染，纯前端 |
| **样式** | CSS3 | 响应式布局 |

---

## 📦 安装与运行

### 环境要求
- Python 3.8+
- Edge / Chrome 浏览器（支持 Web Speech API）

1. 克隆仓库
git clone https://github.com/Yhw-os/ai-voice-draw.git
cd ai-voice-draw
2. 创建虚拟环境
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
3. 安装依赖
pip install -r requirements.txt
4. 配置环境变量
复制 .env.example 为 .env，填入你的 DeepSeek API Key：
cp .env.example .env
编辑 .env：
env
DEEPSEEK_API_KEY=sk-your-api-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
5. 启动服务
python app.py
6. 浏览器访问
http://localhost:5000

## 🏗️ 项目架构
ai-voice-draw/
├── app.py                 # Flask 后端主入口
├── requirements.txt       # Python 依赖
├── .env                  # 环境变量
├── .gitignore            # Git 忽略规则
├── README.md             # 项目说明
├── docs/
│   ├── design.md         # 设计文档
│   └── pr/               # PR 说明补充
├── templates/
│   └── index.html        # 主页面
└── static/
    ├── css/
    │   └── style.css     # 样式文件
    └── js/
        ├── canvas.js     # Canvas 绘图引擎
        ├── voice.js      # Web Speech API 语音输入
        └── app.js        # 主应用逻辑

## 🔌 API 接口文档        
健康检查
http
GET /api/health
响应：
JSON
{
  "status": "ok",
  "deepseek_configured": true
}
指令解析
http
POST /api/parse
Content-Type: application/json
请求体：
JSON
{
  "text": "画一个红色的圆在中心"
}
响应：
JSON
{
  "action": "draw",
  "shapes": [
    {
      "type": "circle",
      "params": {
        "x": 400,
        "y": 300,
        "radius": 50,
        "color": "red",
        "fill": true
      }
    }
  ],
  "response_text": "好的，我在画布中心画了一个红色的圆。"
}
🎬 演示视频 
https://www.bilibili.com/video/BV1SQJF6KEnk/?vd_source=5bea27644f81e8946059ccd33d22adae
演示内容：
基础图形绘制（圆、矩形、三角形）
位置与大小控制
复杂图形拆解（房子、笑脸、太阳）
语音识别纠错演示
断网 Fallback 演示
📋 指令示例
| 指令            | 效果           |
| :------------ | :----------- |
| "画一个红色的圆"     | 在画布中心画红色圆形   |
| "在左上角画一个蓝色矩形" | 左上角画蓝色矩形     |
| "画一个大三角形"     | 画布中心画大三角形    |
| "画一个房子"       | 自动拆解为墙壁+屋顶+门 |
| "画一个笑脸"       | 自动拆解为脸+眼睛+嘴  |
| "清空画布"        | 清空所有图形       |
| "撤销"          | 撤销上一步操作      |
| "导出图片"        | 下载 PNG 图片    |
🤝 贡献指南
本项目为七牛云×XEngineer 暑期实习项目参赛作品。
核心自主开发：
语音指令解析管道（本地解析 + 缓存 + API 调用）
Canvas 绘图引擎（含边界检查）
复杂图形拆解算法（system prompt 设计）
全链路容错机制（防抖、纠错、重试、Fallback）
🙏 致谢
DeepSeek - 提供 AI 指令解析能力
Flask - Web 框架
Web Speech API - 浏览器语音识别