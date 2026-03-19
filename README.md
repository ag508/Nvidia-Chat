# 🟢 NVIDIA Chat

A sleek, dark-themed AI chat application with NVIDIA branding, built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**. Connect to any OpenAI-compatible API — NVIDIA NIM, OpenAI, Groq, Together AI, OpenRouter, Ollama, or your own endpoint — and chat with streaming responses, image understanding, web search, and persistent conversation history.

<br>

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **Streaming Chat** | Real-time token-by-token streaming with markdown rendering, syntax-highlighted code blocks, and a copy-to-clipboard button |
| 🧠 **Reasoning / Thinking** | Collapsible "show thinking" panel for models that return chain-of-thought reasoning (e.g. `reasoning_content`) |
| 🌐 **Web Search** | Toggle web search to ground responses with real-time results from DuckDuckGo — sources are cited inline and displayed as clickable chips |
| 📎 **File & Image Attachments** | Attach images (sent as base64 for vision-capable models) and files to your messages |
| 🗄️ **Persistent History** | All conversations and messages are stored in a local SQLite database (`better-sqlite3`) — survive restarts |
| ⚙️ **Multi-Model Management** | Add, edit, and remove any number of models with different providers and API keys from the Settings page |
| 🎛️ **Provider Presets** | One-click setup for NVIDIA NIM, OpenAI, Groq, Together AI, OpenRouter, or any custom OpenAI-compatible endpoint |
| 🔄 **Hot Model Switching** | Switch between configured models on-the-fly via the bottom-bar model picker |
| 📱 **Responsive Design** | Fully mobile-responsive with a slide-out sidebar, safe-area support, and touch-friendly tap targets |
| 🎨 **NVIDIA Theming** | Dark background (`#0c0c0c`) with NVIDIA green (`#76B900`) accents, Inter + JetBrains Mono fonts, custom scrollbar, and polished UI |

<br>

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** (comes with Node.js)
- An API key from at least one provider (e.g. [NVIDIA build.nvidia.com](https://build.nvidia.com), [OpenAI](https://platform.openai.com), [Groq](https://console.groq.com), etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/ag508/Nvidia-Chat.git
cd Nvidia-Chat

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at **[http://localhost:3000](http://localhost:3000)**.

### First-Time Setup

1. Open the app and click **Settings** in the sidebar (or navigate to `/settings`).
2. A default **GLM-5 (NVIDIA)** model is already pre-configured.
3. Enter your **API key** for the provider.
4. Go back to the chat and start a conversation!

> **Tip:** You can add multiple models from different providers and switch between them at any time using the model picker at the bottom of the chat.

<br>

## ⚙️ Adding & Configuring Models

From the **Settings** page (`/settings`):

1. Click **Add**.
2. Select a **provider preset** (NVIDIA NIM, OpenAI, Groq, Together AI, OpenRouter) — this pre-fills the base URL — or choose **Custom** for any OpenAI-compatible endpoint (e.g. Ollama at `http://localhost:11434/v1`).
3. Fill in:
   - **Name** — A display name (e.g. "GPT-4o", "Llama 3.1 70B")
   - **Model ID** — The model identifier expected by the API (e.g. `gpt-4o`, `meta/llama-3.1-70b-instruct`)
   - **API Key** — Your provider API key
4. Optionally mark it as the **default** model.
5. Click **Add** to save.

All API keys are stored locally in the SQLite database and are only sent to the endpoint you configure, over TLS.

<br>

## 🌐 Web Search

Click the **globe icon** (🌐) next to the message input to toggle web search:

- When enabled, your query is first searched via DuckDuckGo.
- The top results (with page content extracted) are injected as system context into the conversation.
- The AI cites sources using `[1]`, `[2]`, etc., which become clickable links.
- Sources are displayed as chips above the response and can be expanded after the message is saved.

No API key is needed for web search — it uses DuckDuckGo's HTML endpoint.

<br>

## 📎 Attachments

Click the **paperclip icon** (📎) to attach files:

- **Images** are converted to base64 and sent as multimodal content to vision-capable models (e.g. GPT-4o, LLaVA).
- **Other files** are listed by name in the message context.
- Thumbnails are shown in the input area before sending, and full images are displayed inline in the conversation history.

<br>

## 🏗️ Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 14](https://nextjs.org/) (App Router) | Full-stack React framework with API routes |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe codebase |
| [Tailwind CSS 3](https://tailwindcss.com/) | Utility-first CSS with custom NVIDIA theme |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Fast, synchronous SQLite driver for Node.js |
| [OpenAI Node SDK](https://github.com/openai/openai-node) | OpenAI-compatible API client with streaming support |
| [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm) | Markdown rendering with GitHub-flavored extensions |
| [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) | Syntax-highlighted code blocks (VS Code Dark+ theme) |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [Lucide React](https://lucide.dev/) | Icon library |

<br>

## 📁 Project Structure

```
nvidia-chat/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts           # Streaming chat completion (SSE)
│   │   │   ├── conversations/route.ts  # CRUD for conversations
│   │   │   ├── messages/route.ts       # CRUD for messages (with attachments)
│   │   │   ├── models/route.ts         # CRUD for model configurations
│   │   │   └── search/route.ts         # Web search via DuckDuckGo
│   │   ├── settings/page.tsx           # Model management UI
│   │   ├── page.tsx                    # Main chat interface
│   │   ├── layout.tsx                  # Root layout with metadata
│   │   └── globals.css                 # Global styles & NVIDIA theme
│   └── lib/
│       ├── db.ts                       # SQLite database initialization & schema
│       ├── types.ts                    # TypeScript interfaces
│       └── utils.ts                    # Utility functions (cn)
├── data/
│   └── chat.db                         # Auto-created SQLite database
├── tailwind.config.ts                  # Tailwind theme (NVIDIA colors & fonts)
├── next.config.mjs                     # Next.js config (externalizes better-sqlite3)
├── package.json
└── tsconfig.json
```

<br>

## 🗃️ Database

The SQLite database (`data/chat.db`) is **automatically created** on first run. It uses WAL mode for performance and contains three tables:

| Table | Purpose |
|---|---|
| `models` | Stores model configurations (name, provider, base URL, model ID, API key, default flag) |
| `conversations` | Chat threads with title and timestamps |
| `messages` | Individual messages with role, content, optional reasoning, optional attachments (JSON), and timestamps |

The database file is gitignored and persists locally across restarts.

<br>

## 📜 Available Scripts

```bash
npm run dev      # Start the development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start the production server
```

<br>

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

<br>

## 📄 License

This project is open source. Feel free to use, modify, and distribute.
