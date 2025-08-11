const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Your API keys — not recommended for production!
const GEMINI_API_KEY = "AIzaSyCX2Iaj5M6rwV5enikVyc4Gn6MRPsvTAj4";
const ELEVENLABS_API_KEY = "sk_4405c05ca25318e922210fbdaca91319c22cd89afca5de29";
const ELEVENLABS_VOICE_ID = "emSmWzY0c0xtx5IFMCVv";

// Middleware
app.use(express.json());

// Route: Home (serves HTML/JS/CSS all in one)
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Winter AI</title>
<style>
  body {
    font-family: Arial, sans-serif;
    margin: 20px;
    background: #1e1e1e;
    color: #fff;
  }
  h1 { text-align: center; }
  .container {
    display: flex;
    border: 2px solid #fff;
    height: 80vh;
  }
  #model-container {
    flex: 1;
    border: 2px solid #fff;
    margin: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: black;
  }
  #model-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: black;
  }
  #chat-container {
    flex: 2;
    border: 2px solid #fff;
    margin: 5px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  #chat {
    flex: 1;
    border-bottom: 1px solid #555;
    padding: 10px;
    overflow-y: auto;
    background: #2b2b2b;
  }
  .msg { margin: 5px 0; }
  .user { color: white; }
  .ai { color: #03a9f4; }
  .input-area {
    display: flex;
    padding: 10px;
    gap: 5px;
  }
  #prompt {
    flex: 1;
    padding: 8px;
    font-size: 1em;
    border: 1px solid #555;
    background: #111;
    color: #fff;
  }
  button {
    padding: 8px 16px;
    font-size: 1em;
    background: #03a9f4;
    color: #fff;
    border: none;
    cursor: pointer;
  }
  button:hover {
    background: #0288d1;
  }
</style>
</head>
<body>
<h1>Winter AI</h1>
<div class="container">
  <div id="model-container">
    <video id="model-video" autoplay loop muted playsinline>
      <source src="https://raw.githubusercontent.com/darrk5200/notani/main/idle_02.mp4" type="video/mp4">
    </video>
  </div>
  <div id="chat-container">
    <div id="chat"></div>
    <div class="input-area">
      <input type="text" id="prompt" placeholder="Type your message..." />
      <button onclick="sendMessage()">Send</button>
    </div>
  </div>
</div>
<script>
const idleVideo = "https://raw.githubusercontent.com/darrk5200/notani/main/idle_02.mp4";
const talkVideo = "https://raw.githubusercontent.com/darrk5200/notani/main/talk_01.mp4";
const waveVideo = "https://raw.githubusercontent.com/darrk5200/notani/main/wave_01.mp4";
const modelVideo = document.getElementById("model-video");

let conversationHistory = [];

window.addEventListener("DOMContentLoaded", () => {
  modelVideo.src = waveVideo;
  modelVideo.loop = false;
  modelVideo.play();
  modelVideo.onended = () => {
    playVideo(idleVideo);
  };
});

function playVideo(src) {
  modelVideo.src = src;
  modelVideo.loop = true;
  modelVideo.play();
}

function addMessage(sender, text, cls) {
  const chat = document.getElementById("chat");
  const div = document.createElement("div");
  div.className = \`msg \${cls}\`;
  div.innerHTML = \`<strong>\${sender}:</strong> \${text}\`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("prompt");
  const userText = input.value.trim();
  if (!userText) return;

  addMessage("You", userText, "user");
  conversationHistory.push({ role: "User", text: userText });
  input.value = "";

  const placeholderDiv = document.createElement("div");
  placeholderDiv.className = "msg ai";
  placeholderDiv.innerHTML = "<strong>Winter:</strong> <em>Winter is thinking...</em>";
  document.getElementById("chat").appendChild(placeholderDiv);
  document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;

  try {
    const chatRes = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userText })
    });
    const chatData = await chatRes.json();
    const reply = chatData.reply;

    placeholderDiv.innerHTML = \`<strong>Winter:</strong> \${reply}\`;
    conversationHistory.push({ role: "You", text: reply });

    const audioRes = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: reply })
    });
    const audioBlob = await audioRes.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);
    audio.onplay = () => playVideo(talkVideo);
    audio.onended = () => playVideo(idleVideo);
    audio.play();

  } catch (err) {
    addMessage("Error", err.message, "ai");
  }
}

document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
});
</script>
</body>
</html>
`);
});

// Route: Gemini AI
app.post("/api/chat", async (req, res) => {
  const userPrompt = req.body.prompt;
  const fullPrompt = `Prompt: ${userPrompt}
You are Winter, a lively 17-year-old girl. Keep it casual and short.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 200 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "(No reply)";
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route: ElevenLabs
app.post("/api/speech", async (req, res) => {
  const text = req.body.text;
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.1, similarity_boost: 0.7 }
      })
    });

    const buffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(\`✅ Winter AI running at http://localhost:\${PORT}\`);
});
