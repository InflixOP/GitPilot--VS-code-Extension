# GitPilot - AI Git Assistant for VS Code

GitPilot is an intelligent AI-powered Git assistant that bridges the gap between natural language and Git commands directly in Visual Studio Code. Simply describe what you want to do with Git in plain English, and GitPilot will generate and execute the appropriate Git commands for you.

## 🌟 Features

### 🧠 AI-Powered Command Generation
- **Natural Language Processing**: Convert plain English requests into precise Git commands
- **Context-Aware Intelligence**: Analyzes your repository state to provide relevant suggestions
- **Multi-Model Support**: Choose from multiple AI providers:
  - **Google Gemini**: Fast, accurate responses
  - **Groq**: Lightning-fast inference with Llama models
  - **DeepSeek**: Advanced reasoning capabilities

### 🛡️ Safety & Security
- **Destructive Operation Detection**: Identifies potentially dangerous commands and requires confirmation
- **Command Validation**: Prevents command injection and validates Git syntax
- **Preview Mode**: See what commands will be executed before running them
- **Context Warnings**: Alerts about uncommitted changes, remote status, and other potential issues

### 📊 Repository Analysis
- **Real-time Status**: Shows current branch, staged/unstaged files, and repository state
- **Integrated UI**: Beautiful panel integrated into VS Code's interface
- **Command History**: Track previously executed commands

## 📦 Installation

1. Install the extension from the VS Code Marketplace
2. Configure your API keys in VS Code settings:
   - Go to Settings (Ctrl+,)
   - Search for "GitPilot"
   - Add your API keys for Gemini and/or Groq

### Required API Keys

You need at least one of the following API keys:

- **Google Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Groq API Key**: Get from [Groq Console](https://console.groq.com/keys)

## 🚀 Usage

### Method 1: Command Palette
1. Open Command Palette (Ctrl+Shift+P)
2. Type "GitPilot: Execute Command"
3. Enter your request in natural language
4. Review and execute the generated command

### Method 2: GitPilot Panel
1. Click the GitPilot icon in the Activity Bar
2. Use the integrated panel to interact with GitPilot
3. View repository status and execute commands seamlessly

### Method 3: Context Menu
- Right-click on any folder in the Explorer
- Select "GitPilot: Execute Command" from the context menu

## 💬 Example Commands

```
"create a new branch for user authentication"
→ git checkout -b feature/user-authentication

"commit all changes with message 'Add login functionality'"
→ git add . && git commit -m "Add login functionality"

"undo the last commit but keep changes"
→ git reset --soft HEAD~1

"show commits from last week"
→ git log --since="1 week ago" --oneline

"merge the feature branch into main"
→ git checkout main && git merge feature-branch
```

## ⚙️ Configuration

Access GitPilot settings in VS Code:

- **GitPilot: Gemini API Key** - Your Google Gemini API key
- **GitPilot: Groq API Key** - Your Groq API key (optional)
- **GitPilot: Default Model** - Choose your preferred AI model
- **GitPilot: Auto Confirm** - Skip confirmation for destructive operations
- **GitPilot: Show Explanations** - Display explanations for generated commands

## 🔒 Safety Features

GitPilot includes comprehensive safety measures:

- **Command Analysis**: Automatically detects potentially destructive operations
- **User Confirmation**: Requires explicit confirmation for dangerous commands
- **Preview Mode**: See exactly what will be executed before running commands
- **Repository Awareness**: Considers your current Git state when generating commands

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/InflixOp/GitPilot/blob/main/.github/CONTRIBUTING.md) for details.

## 🐛 Issues & Support

- **Bug Reports**: [GitHub Issues](https://github.com/InflixOp/GitPilot/issues)
- **Feature Requests**: [GitHub Issues](https://github.com/InflixOp/GitPilot/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/InflixOp/GitPilot/blob/main/LICENSE) file for details.

---

**Note**: GitPilot requires API keys from AI providers. Your code and Git operations remain local to your machine - only the natural language requests are sent to the AI services for command generation.
