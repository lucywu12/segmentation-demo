from flask import Flask, request, jsonify
from dotenv import load_dotenv
import boto3
import os
import time

app = Flask(__name__, static_folder="../frontend/build")

# S3 configuration
S3_BUCKET = "segmentation-demo-s3"
S3_REGION = "us-east-1"

load_dotenv() 

s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_DEFAULT_REGION")
)

# Serve React app
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        from flask import send_from_directory
        return send_from_directory(app.static_folder, path)
    else:
        from flask import send_from_directory
        return send_from_directory(app.static_folder, "index.html")


# Generate presigned URL for upload
@app.route("/generate-presigned-url", methods=["POST"])
def generate_presigned_url():
    data = request.json
    if not data or "file_name" not in data:
        return jsonify({"error": "file_name is required"}), 400

    file_name = data["file_name"]
    timestamp = int(time.time())
    file_name = file_name.replace(" ", "_") # for valid presigned URL
    s3_key = f"inputs/{os.path.splitext(file_name)[0]}_{timestamp}/{file_name}"

    try:
        url = s3_client.generate_presigned_url(
            "put_object",
            Params={"Bucket": S3_BUCKET, "Key": s3_key, "ContentType": "application/gzip"},
            ExpiresIn=300  # 5 minutes
        )
        return jsonify({"url": url, "s3_key": s3_key})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# if __name__ == "__main__":
#     app.run(debug=True, port=8000)
