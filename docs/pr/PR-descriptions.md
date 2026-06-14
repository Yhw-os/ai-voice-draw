# PR 说明补充

由于开发过程中直接在命令行合并到 main，未在 GitHub 上创建 PR，现补充 PR 说明。

## PR1: feature/flask-backend

**Title:** `feat: 添加Flask后端与DeepSeek API指令解析接口`

**Description:**
```
## 功能描述
添加Flask后端服务，提供健康检查接口和DeepSeek语音指令解析接口，为前端提供AI绘图指令解析能力。

## 实现思路
- 使用Flask框架搭建RESTful API服务
- 集成python-dotenv管理环境变量（DeepSeek API Key）
- 调用DeepSeek v4-flash模型，通过system prompt约束输出JSON格式
- 添加15秒超时和异常处理，防止网络异常导致服务卡死

## 测试方式
1. `python app.py` 启动服务
2. 浏览器访问 `http://localhost:5000/api/health` 确认API配置状态
3. POST请求 `/api/parse` 测试指令解析，验证返回JSON格式正确
```

---

## PR2: feature/canvas-engine

**Title:** `feat: 实现Canvas绘图引擎与前端语音交互UI`

**Description:**
```
## 功能描述
实现前端Canvas绘图引擎、浏览器语音识别（Web Speech API）和完整UI交互，构建语音到绘图的完整管道。

## 实现思路
- CanvasEngine类封装所有图形绘制（圆、矩形、线、三角形、文字）
- 使用HTML5 Canvas 2D API实现绘制，所有操作本地执行
- 集成Web Speech API实现浏览器端中文语音识别
- 历史栈管理实现撤销/重做功能（最多50步）
- 响应式UI布局，指令日志实时反馈

## 测试方式
1. 启动后端服务 `python app.py`
2. 浏览器访问 `http://localhost:5000`
3. 点击"按住说话"按钮，说出"画一个红色的圆"
4. 验证：语音识别 → AI解析 → Canvas绘制 → 日志显示 全流程正常
```

---

## PR3: feature/complex-commands

**Title:** `feat: 支持复杂图形指令自动拆解与绘制`

**Description:**
```
## 功能描述
扩展AI指令解析能力，支持"画一个房子"、"画一个笑脸"等复杂自然语言指令，自动拆解为多个基础图形组合绘制。

## 实现思路
- 扩展system prompt，添加复杂图形拆解示例（房子=墙壁+屋顶+门）
- DeepSeek模型根据示例类推，将抽象描述转为具体图形列表
- 前端遍历shapes数组依次绘制，保持组合整体性
- 限制拆解为2-5个基础图形，避免过度复杂

## 测试方式
1. 说出"画一个房子" → 验证拆解为3个图形（矩形+三角形+矩形门）
2. 说出"画一个笑脸" → 验证拆解为4个图形（圆+两眼+嘴）
3. 说出"画一个太阳" → 验证拆解为5个图形（圆心+4条光芒）
4. 检查坐标是否合理，图形不重叠
```

---

## PR4: feature/robustness

**Title:** `feat: 鲁棒性增强 - 防抖、纠错、本地解析与缓存优化`

**Description:**
```
## 功能描述
全面提升系统稳定性和响应速度：添加语音输入防抖、语音识别纠错、本地指令解析、API结果缓存、Canvas边界检查和失败Fallback机制。

## 实现思路
- 防抖：记录lastStopTime，3秒内重复触发忽略
- 纠错：建立常见语音识别错误映射表（"买一个"→"画一个"）
- 本地解析：80%常见指令（圆/矩形/三角/线）直接前端解析，零延迟
- 三级策略：本地解析 → 缓存命中 → API调用 → Fallback灰色圆
- 边界检查：clamp函数确保所有图形在800x600画布内
- API重试：max_retries=2，500错误自动重试

## 测试方式
1. 快速连续点击按钮 → 验证只触发一次（防抖）
2. 说"买一个房子" → 验证纠正为"画一个房子"（纠错）
3. 说"画一个红色的圆" → 验证瞬间响应，无API调用（本地解析）
4. 重复说"画一个房子" → 验证第二次缓存命中（缓存）
5. 断开网络说指令 → 验证画灰色圆（Fallback）
6. 说"在左上角画一个很大的圆" → 验证图形不超出画布（边界检查）
```