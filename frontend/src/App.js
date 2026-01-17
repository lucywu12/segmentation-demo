import React, { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [zipFilename, setZipFilename] = useState(null); // store the prepared zip name

  // Upload file to S3
  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first");
      return;
    }

    try {
      const res = await fetch("/generate-presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: file.name }),
      });
      const data = await res.json();

      const uploadRes = await fetch(data.url, { method: "PUT", body: file });
      if (!uploadRes.ok) throw new Error("Upload failed");

      setMessage(`Upload successful! S3 key: ${data.s3_key}`);
    } catch (err) {
      console.error(err);
      setMessage("Upload failed");
    }
  };

  // Run inference via EC2 SSM
  const handleRunInference = async () => {
    try {
      const res = await fetch("/run-inference", { method: "POST" });
      const data = await res.json();
      setMessage(data.status || "Inference started");
    } catch (err) {
      console.error(err);
      setMessage("Inference failed");
    }
  };

  // Prepare zip & upload to S3
  const handlePrepareDownload = async () => {
    try {
      const res = await fetch("/prepare-download", { method: "POST" });
      const data = await res.json();

      if (data.filename) {
        setZipFilename(data.filename);
        setMessage(`Output prepared: ${data.filename}. You can now download it.`);
      } else {
        setMessage("Failed to prepare output.");
        console.error(data);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error preparing download.");
    }
  };

  // Generate presigned URL & download
  const handleDownload = async () => {
    if (!zipFilename) {
      setMessage("No prepared file available. Please prepare download first.");
      return;
    }

    try {
      const res = await fetch(`/download-prepared-output?filename=${zipFilename}`);
      const data = await res.json();

      if (data.url) {
        const link = document.createElement("a");
        link.href = data.url;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error("No URL returned", data);
        setMessage("Download failed.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Download failed.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>AI Inference for Segmentation</h1>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} style={{ marginLeft: "1rem" }}>
        Upload
      </button>

      <button onClick={handleRunInference} style={{ marginLeft: "1rem" }}>
        Run Inference
      </button>

      <button onClick={handlePrepareDownload} style={{ marginLeft: "1rem" }}>
        Prepare Download
      </button>

      <button onClick={handleDownload} style={{ marginLeft: "1rem" }}>
        Download Output
      </button>

      <p>{message}</p>
    </div>
  );
}

export default App;
