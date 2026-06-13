import os
import json
import requests
from flask import Flask, request, jsonify,render_template
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")

# DeepSeek 系统提示词：定义指令解析规则
SYSTEM_PROMPT = """你是一个语音绘图指令解析器。将用户的自然语言指令转换为严格的JSON格式。

可用图形类型：circle（圆）、rectangle（矩形）、line（线段）、triangle（三角形）、text（文字）

JSON输出格式：
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

坐标规则（画布800x600）：
- "左上角" ≈ x:100, y:100
- "右上角" ≈ x:700, y:100
- "左下角" ≈ x:100, y:500
- "右下角" ≈ x:700, y:500
- "中心" ≈ x:400, y:300
- "上方" ≈ y:100, "下方" ≈ y:500
- "左边" ≈ x:100, "右边" ≈ x:700

大小规则：
- "小" ≈ 半径20 / 宽高40
- "中" ≈ 半径50 / 宽高100
- "大" ≈ 半径80 / 宽高160
- "很大" ≈ 半径120 / 宽高240

复杂图形拆解规则：
当用户要求绘制复杂图形时，自动拆解为多个基础图形组合：

"画一个房子" → 
{
    "action": "draw",
    "shapes": [
        {"type": "rectangle", "params": {"x": 350, "y": 300, "width": 100, "height": 100, "color": "brown", "fill": true}},
        {"type": "triangle", "params": {"x": 400, "y": 250, "size": 60, "color": "red", "fill": true}},
        {"type": "rectangle", "params": {"x": 380, "y": 340, "width": 20, "height": 30, "color": "yellow", "fill": true}}
    ],
    "response_text": "好的，我画了一个房子，包括棕色的墙壁、红色的屋顶和黄色的门。"
}

"画一个笑脸" →
{
    "action": "draw",
    "shapes": [
        {"type": "circle", "params": {"x": 400, "y": 300, "radius": 80, "color": "yellow", "fill": true}},
        {"type": "circle", "params": {"x": 370, "y": 270, "radius": 10, "color": "black", "fill": true}},
        {"type": "circle", "params": {"x": 430, "y": 270, "radius": 10, "color": "black", "fill": true}},
        {"type": "circle", "params": {"x": 400, "y": 320, "radius": 30, "color": "red", "fill": false}}
    ],
    "response_text": "好的，我画了一个笑脸。"
}

"画一个太阳" →
{
    "action": "draw",
    "shapes": [
        {"type": "circle", "params": {"x": 400, "y": 300, "radius": 60, "color": "orange", "fill": true}},
        {"type": "line", "params": {"x1": 400, "y1": 200, "x2": 400, "y2": 150, "color": "orange", "lineWidth": 3}},
        {"type": "line", "params": {"x1": 400, "y1": 400, "x2": 400, "y2": 450, "color": "orange", "lineWidth": 3}},
        {"type": "line", "params": {"x1": 300, "y1": 300, "x2": 250, "y2": 300, "color": "orange", "lineWidth": 3}},
        {"type": "line", "params": {"x1": 500, "y1": 300, "x2": 550, "y2": 300, "color": "orange", "lineWidth": 3}}
    ],
    "response_text": "好的，我画了一个太阳。"
}

特殊指令：
- "清空画布" → {"action": "clear", "response_text": "画布已清空。"}
- "撤销" → {"action": "undo", "response_text": "已撤销上一步操作。"}
- "导出图片" → {"action": "export", "response_text": "图片已导出。"}

注意：
1. 必须返回合法JSON，不要包含markdown代码块标记
2. 如果指令模糊，做合理推断
3. 如果完全无法理解，返回：{"action": "unknown", "response_text": "抱歉，我没有理解您的指令，请尝试说'画一个红色的圆'。"}
4. 复杂图形尽量拆解为2-5个基础图形，坐标要合理分布不重叠
5. 每次绘制新图形前，先清空画布（调用clear），再绘制新图形，避免叠加混乱
"""

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/health", methods=["GET"])
def health():
    """健康检查接口"""
    return jsonify({
        "status": "ok",
        "deepseek_configured": bool(DEEPSEEK_API_KEY)
    })


@app.route("/api/parse", methods=["POST"])
def parse_command():
    """接收语音文本，调用DeepSeek解析为绘图指令"""
    data = request.get_json()
    user_text = data.get("text", "").strip()
    
    if not user_text:
        return jsonify({"error": "Empty text"}), 400
    
    # 语音识别纠错：常见错误映射
    corrections = {
        "买一个": "画一个",
        "买": "画",
        "话一个": "画一个",
        "化一个": "画一个",
        "花一个": "画一个",
        "在左下脚": "在左下角",
        "在右下脚": "在右下角",
        "在左上脚": "在左上角",
        "在右上脚": "在右上角",
        "圆型": "圆形",
        "矩型": "矩形",
        "三角型": "三角形",
        "型": "形",
    }
    
    original_text = user_text
    for wrong, correct in corrections.items():
        user_text = user_text.replace(wrong, correct)
    
    if user_text != original_text:
        print(f"语音识别纠错: '{original_text}' -> '{user_text}'")
    
    if not DEEPSEEK_API_KEY:
        return jsonify({"error": "DeepSeek API Key not configured"}), 500
    
    max_retries = 2
    response = None
    
    for attempt in range(max_retries + 1):
        try:
            response = requests.post(
                DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-v4-flash",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_text}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500
                },
                timeout=15
            )
            response.raise_for_status()
            break  # 成功就跳出循环
            
        except requests.exceptions.Timeout:
            if attempt < max_retries:
                print(f"请求超时，第{attempt + 2}次重试...")
                continue
            return jsonify({
                "action": "error",
                "response_text": "网络请求超时，请稍后再试。"
            }), 504
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 500 and attempt < max_retries:
                print(f"服务器错误(500)，第{attempt + 2}次重试...")
                continue
            # 打印详细错误
            error_detail = ""
            try:
                error_detail = e.response.json()
            except:
                error_detail = e.response.text
            print(f"=== DeepSeek HTTP Error ===")
            print(f"Status: {e.response.status_code}")
            print(f"Response: {error_detail}")
            print("===========================")
            return jsonify({
                "action": "error",
                "response_text": f"API服务暂时不可用({e.response.status_code})，请重试"
            }), 500
    
    # 解析成功响应
    try:
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return jsonify(parsed)
    except Exception as e:
        print(f"解析响应失败: {str(e)}")
        return jsonify({
            "action": "error",
            "response_text": f"解析AI响应失败：{str(e)}"
        }), 500
        



if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)