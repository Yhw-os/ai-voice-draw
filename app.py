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

特殊指令：
- "清空画布" → {"action": "clear", "response_text": "画布已清空。"}
- "撤销" → {"action": "undo", "response_text": "已撤销上一步操作。"}
- "导出图片" → {"action": "export", "response_text": "图片已导出。"}

注意：
1. 必须返回合法JSON，不要包含markdown代码块标记
2. 如果指令模糊，做合理推断
3. 如果完全无法理解，返回：{"action": "unknown", "response_text": "抱歉，我没有理解您的指令，请尝试说'画一个红色的圆'。"}
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
    
    if not DEEPSEEK_API_KEY:
        return jsonify({"error": "DeepSeek API Key not configured"}), 500
    
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
                "max_tokens": 500,
                "response_format": {"type": "json_object"}
            },
            timeout=15
        )
        response.raise_for_status()
        result = response.json()
        
        content = result["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return jsonify(parsed)
        
    except requests.exceptions.Timeout:
        return jsonify({
            "action": "error",
            "response_text": "网络请求超时，请稍后再试。"
        }), 504
    except Exception as e:
        return jsonify({
            "action": "error",
            "response_text": f"指令解析出错：{str(e)}"
        }), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)