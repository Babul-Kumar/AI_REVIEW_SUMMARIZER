# 🚀 AI Product Review Analyzer

> ⚡ High-speed, production-grade AI system for analyzing product reviews with structured insights, sentiment analytics, and intelligent filtering.

---

## 🌐 Live Demo

👉 *Add your deployed link here (Vercel/Netlify)*
Example: https://ai-review-summarizer-git-main-bk7321634-3614s-projects.vercel.app/

---

## ✨ Overview

AI Product Review Analyzer is a modern AI-powered application that processes raw text and determines whether it is a valid product review. It extracts structured insights such as summary, pros, cons, and sentiment distribution using advanced NLP powered by **Gemini 3.1 Flash Lite**.

Built with a focus on **performance, reliability, and real-world usability**, this project goes beyond simple LLM usage by incorporating validation, caching strategies, and defensive UI design.

---

## 🔥 Key Features

### 🧠 Smart Review Detection

* Automatically identifies whether input is a valid product review
* Classifies out-of-scope content (coding, politics, finance, etc.)

### 📊 Structured Insight Extraction

* **Executive Summary** (1–2 sentences)
* **Pros & Cons Extraction**
* **Neutral Observations**

### 📈 Sentiment Analytics

* ⭐ Score (0–5 scale)
* 📊 Sentiment distribution (Positive / Neutral / Negative)
* 🎯 Confidence estimation

### ⚡ High Performance

* Uses `gemini-3.1-flash-lite-preview`
* Optimized with `ThinkingLevel.MINIMAL`
* Sub-second response time

### 🛡️ Defensive UI

* Handles incomplete/malformed AI responses
* Prevents runtime crashes
* Smooth UX with fallback logic

### 🎨 Modern UI/UX

* Dark & Light mode support
* Animated background (atoms & bubbles)
* Smooth micro-interactions using Framer Motion

---

## 🏗️ Tech Stack

| Category       | Technology                 |
| -------------- | -------------------------- |
| Frontend       | React 19, TypeScript, Vite |
| Styling        | Tailwind CSS               |
| Animations     | Framer Motion              |
| AI Integration | @google/genai (Gemini 3.1) |
| Icons          | Lucide React               |

---

## 📂 Project Structure

```
src/
 ├── App.tsx                # Main UI & state logic
 ├── services/
 │    └── geminiService.ts # AI logic, schema validation
 ├── components/           # UI components (if added)
 ├── index.css             # Tailwind styles
```

---

## ⚙️ Getting Started

### 🔐 1. Setup Environment

Create a `.env` file:

```
GEMINI_API_KEY=your_api_key_here
GEMINI_API_KEYS=backup_key_one,backup_key_two
```

`GEMINI_API_KEYS` is optional. If the active key hits quota or becomes invalid,
the app will automatically rotate to the next configured key.

Get your API key from:
👉 https://aistudio.google.com/app/apikey

---

### 📦 2. Install Dependencies

```bash
npm install
```

---

### ▶️ 3. Run Locally

```bash
npm run dev
```

Open:

```
http://localhost:5173
```

---

## 🚀 Deployment

### 🔥 Vercel (Recommended)

1. Push project to GitHub
2. Go to https://vercel.com
3. Import your repo
4. Add environment variable:

```
GEMINI_API_KEY=your_api_key
GEMINI_API_KEYS=backup_key_one,backup_key_two
```

5. Deploy 🎉

---

## 🧠 Architecture Highlights

### ⚡ Optimized AI Pipeline

* Minimal thinking level → faster responses
* Strict JSON schema → reliable output
* Retry + validation → stable system

### 🧩 Robust Design

* Service layer abstraction
* Defensive error handling
* Scalable structure for future features

### 🔁 Performance Enhancements

* Request optimization
* Controlled UI rendering
* Efficient state management

---

## 🔮 Future Improvements

* 📊 Multi-review aggregation (Amazon-style insights)
* 📈 Sentiment trend visualization (charts)
* 🧠 Fake review detection
* 📥 Export results (PDF / JSON)
* 🔐 Backend proxy for secure API handling

---

## 🤝 Contributing

Contributions are welcome!

```bash
git checkout -b feature/YourFeature
git commit -m "Add YourFeature"
git push origin feature/YourFeature
```

Then open a Pull Request 🚀

---

## 📜 License

This project is licensed under the MIT License.

---

## 💡 Author

**Babul Kumar**

---

## ⭐ Support

If you found this project useful:

👉 Star this repo
👉 Share it
👉 Use it in your portfolio

---

> ⚡ Built with precision, performance, and real-world AI system design in mind.
