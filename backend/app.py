from flask import Flask, request, jsonify
from dotenv import load_dotenv
import boto3
import os
import time
import subprocess
import traceback

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
            Params={"Bucket": S3_BUCKET, "Key": s3_key, "ContentType": "application/x-gzip"},
            ExpiresIn=300
        )
        return jsonify({"url": url, "s3_key": s3_key})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

##############################################

# Initialize SSM client
ssm = boto3.client("ssm", region_name="us-east-1") 
EC2_INSTANCE_ID = "i-092e2d815d17b926b"

# Run inference on EC2 via SSM
@app.route("/run-inference", methods=["POST"])
def run_inference():
    try:
        # Command to pull S3 files and run Docker inference
        command = """
        aws s3 sync s3://segmentation-demo-s3/inputs/ /home/ec2-user/suprem/inputs &&
        sudo docker container run --gpus "device=0" -m 128G --rm \
        -v /home/ec2-user/suprem/inputs:/workspace/inputs \
        -v /home/ec2-user/suprem/outputs:/workspace/outputs \
        qchen99/suprem:v1 /bin/bash -c "sh predict.sh"
        """

        response = ssm.send_command(
            InstanceIds=[EC2_INSTANCE_ID],
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": [command]},
            TimeoutSeconds=3600,
        )

        return jsonify({"status": "Inference started", "command_id": response["Command"]["CommandId"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
##############################################