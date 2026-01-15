import React, { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("https://your-backend.onrender.com/upload", {
      method: "POST",
      body: formData,
      headers: { "Authorization": "Bearer my-demo-api-key-123" },
    });
    const data = await res.json();
    console.log(data);
  };

  return (
    <div>
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}

export default App;
