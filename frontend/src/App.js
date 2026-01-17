import React, { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [zipFilename, setZipFilename] = useState(null);
  const [inferenceStarted, setInferenceStarted] = useState(false);
  const [s3Files, setS3Files] = useState([]);

  // Step 0: Upload file
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

  // Step 1: Run inference
  const handleRunInference = async () => {
    try {
      const res = await fetch("/run-inference", { method: "POST" });
      const data = await res.json();
      setMessage(data.status || "Inference started");
      setInferenceStarted(true);
      setZipFilename(null); // clear old zip if any
    } catch (err) {
      console.error(err);
      setMessage("Inference failed");
    }
  };

  // Step 2: Prepare output zip
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

  // Step 3: Download zip
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

  // List files in S3 bucket
  const handleListFiles = async () => {
    try {
      const res = await fetch("/list-s3-files");
      const data = await res.json();
      if (data.files) {
        setS3Files(data.files);
        setMessage(`Found ${data.files.length} files.`);
      } else {
        setMessage("No files found or failed to list.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to list input files.");
    }
  };

  // Clear S3 and EC2 inputs/outputs folders
  const handleClearFolders = async () => {
    if (!window.confirm("Are you sure you want to clear existing inputs/outputs? This cannot be undone.")) return;
    try {
      const res = await fetch("/clear-folders", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage("Files cleared. You can start fresh.");
        setInferenceStarted(false);
        setZipFilename(null);
      } else {
        setMessage("Failed to clear folders.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error clearing folders.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "800px", margin: "auto" }}>
      <h1>AI Segmentation Demo</h1>

      <p><strong>Instructions:</strong></p>
      <ol>
        <li>Upload input files (must be .gz only).</li>
        <li>Run inference.</li>
        <li>Prepare outputs as a zip file.</li>
        <li>Download the prepared zip.</li>
      </ol>

      <div style={{ marginBottom: "1rem" }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleUpload} style={{ marginLeft: "1rem" }}>Upload</button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleRunInference} disabled={!file}>Run Inference</button>
        <button onClick={handlePrepareDownload} disabled={!inferenceStarted} style={{ marginLeft: "1rem" }}>
          Prepare Download
        </button>
        <button onClick={handleDownload} disabled={!zipFilename} style={{ marginLeft: "1rem" }}>
          Download Output
        </button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleListFiles}>List Files</button>
        <button onClick={handleClearFolders} style={{ marginLeft: "1rem", color: "red" }}>
          Clear Files
        </button>
      </div>

      {s3Files.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <strong>Files:</strong>
          <ul>
            {s3Files.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}

      <p><strong>Status:</strong> {message}</p>
    </div>
  );
}

export default App;
