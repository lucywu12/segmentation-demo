import os
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

EC2_URL = os.environ.get("EC2_URL")      # EC2 container URL
API_KEY = os.environ.get("API_KEY")      # API key shared with EC2

@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    # Optional: check Authorization header
    # token = request.headers.get("Authorization")
    # if token != f"Bearer {API_KEY}":
    #     return jsonify({"error": "Unauthorized"}), 401

    file = request.files["file"]
    files = {"file": (file.filename, file.stream, file.content_type)}

    try:
        resp = requests.post(EC2_URL, files=files)
        resp.raise_for_status()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"ec2_response": resp.json()})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
