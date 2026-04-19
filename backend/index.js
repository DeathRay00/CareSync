import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

// ✅ AI test route (very important)
app.get("/test", async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "models/gemini-1.5-flash",
    });

    const result = await model.generateContent("Say hello");
    const reply = result.response.text();

    res.send(reply);
  } catch (err) {
    console.error("TEST ERROR:", err);
    res.send("AI test failed ❌");
  }
});

// ✅ Chat route (MAIN)
app.post("/chat", async (req, res) => {
    console.log("🔥 CHAT ROUTE HIT");
    console.log("Message:", req.body);
  try {
    const { message } = req.body;

    console.log("📩 Received message:", message); // 👈 DEBUG

    if (!message) {
      return res.status(400).json({ reply: "No message provided" });
    }

    const model = genAI.getGenerativeModel({
      model: "models/gemini-1.5-flash",
    });

    const result = await model.generateContent(message);
    const reply = result.response.text();

    console.log("🤖 AI reply:", reply); // 👈 DEBUG

    res.json({ reply });

  } catch (err) {
    console.error("❌ AI ERROR:", err); // 👈 IMPORTANT
    res.status(500).json({
      reply: "AI failed. Check backend terminal.",
    });
  }
});

// ✅ Start server
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});