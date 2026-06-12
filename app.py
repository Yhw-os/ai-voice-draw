import os
from flask import Flask, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")


@app.route("/")
def index():
    return "AI语音绘图工具后端服务运行中"


@app.route("/api/health", methods=["GET"])
def health():
    """健康检查接口"""
    return jsonify({
        "status": "ok",
        "deepseek_configured": bool(DEEPSEEK_API_KEY)
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)