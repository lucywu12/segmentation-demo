import React, { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first");
      return;
    }
    console.log(file.type)

    try {
      // request presigned URL from backend
      const res = await fetch("/generate-presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_name: file.name }),
      });
      const data = await res.json();

      if (data.error) {
        setMessage(`Error: ${data.error}`);
        return;
      }

      // upload directly to S3
      const uploadRes = await fetch(data.url, {
        method: "PUT",
        body: file,
      });

      if (!uploadRes.ok) {
        setMessage("Upload to S3 failed - check your filetype to make sure it is a .gz file");
        return;
      }

      setMessage(`Upload successful! S3 key: ${data.s3_key}`);
    } catch (err) {
      console.error(err);
      setMessage("Upload failed");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>File Upload Demo (S3 Presigned)</h1>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} style={{ marginLeft: "1rem" }}>
        Upload
      </button>
      <p>{message}</p>
    </div>
  );
}

export default App;
