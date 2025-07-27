"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitPilotWebviewProvider = void 0;
const vscode = require("vscode");
const aiEngine_1 = require("./aiEngine");
const contextAnalyzer_1 = require("./contextAnalyzer");
const gitExecutor_1 = require("./gitExecutor");
class GitPilotWebviewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'executeCommand':
                    await this._executeCommand(data.command, data.dryRun);
                    break;
                case 'getContext':
                    await this._sendContext();
                    break;
            }
        });
    }
    async _executeCommand(userInput, dryRun = false) {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                this._sendMessage({
                    type: 'error',
                    message: 'Please open a workspace folder first.'
                });
                return;
            }
            const contextAnalyzer = new contextAnalyzer_1.ContextAnalyzer(workspaceFolder.uri.fsPath);
            if (!await contextAnalyzer.isGitRepo()) {
                this._sendMessage({
                    type: 'error',
                    message: 'Not a Git repository. Please open a Git repository.'
                });
                return;
            }
            const config = vscode.workspace.getConfiguration('gitpilot');
            const apiKey = config.get('geminiApiKey');
            const groqApiKey = config.get('groqApiKey');
            if (!apiKey && !groqApiKey) {
                this._sendMessage({
                    type: 'error',
                    message: 'No API key configured. Please set up your AI provider API key in settings.'
                });
                return;
            }
            this._sendMessage({ type: 'thinking' });
            const aiEngine = new aiEngine_1.AIEngine(apiKey, groqApiKey);
            const context = await contextAnalyzer.analyzeContext();
            const defaultModel = config.get('defaultModel') || 'gemini';
            const modelChoice = this._getModelChoice(defaultModel);
            const aiResponse = await aiEngine.generateCommand(userInput, context, modelChoice);
            if (!aiResponse.command) {
                this._sendMessage({
                    type: 'error',
                    message: `Failed to generate command: ${aiResponse.explanation}`
                });
                return;
            }
            this._sendMessage({
                type: 'commandGenerated',
                command: aiResponse.command,
                explanation: aiResponse.explanation,
                warning: aiResponse.warning
            });
            const executor = new gitExecutor_1.GitExecutor(workspaceFolder.uri.fsPath);
            const isDestructive = executor.isDestructiveCommand(aiResponse.command);
            const autoConfirm = config.get('autoConfirm');
            if (dryRun) {
                const result = await executor.previewCommand(aiResponse.command);
                this._sendMessage({
                    type: 'previewResult',
                    result: result
                });
                return;
            }
            let shouldExecute = true;
            if (isDestructive && !autoConfirm) {
                const result = await vscode.window.showWarningMessage(`Execute potentially destructive command: ${aiResponse.command}?`, { modal: true }, 'Execute', 'Cancel');
                shouldExecute = result === 'Execute';
            }
            if (shouldExecute) {
                const result = await executor.execute(aiResponse.command);
                this._sendMessage({
                    type: 'executionResult',
                    result: result
                });
            }
            else {
                this._sendMessage({
                    type: 'cancelled',
                    message: 'Operation cancelled.'
                });
            }
        }
        catch (error) {
            this._sendMessage({
                type: 'error',
                message: `GitPilot error: ${error}`
            });
        }
    }
    async _sendContext() {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder)
                return;
            const contextAnalyzer = new contextAnalyzer_1.ContextAnalyzer(workspaceFolder.uri.fsPath);
            const context = await contextAnalyzer.analyzeContext();
            this._sendMessage({
                type: 'contextUpdate',
                context: context
            });
        }
        catch (error) {
            console.error('Failed to get context:', error);
        }
    }
    _sendMessage(message) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }
    _getModelChoice(defaultModel) {
        const modelMap = {
            'gemini': '1',
            'groq-llama-3.1': '2',
            'groq-llama-3.3': '3',
            'deepseek': '4'
        };
        return modelMap[defaultModel] || '1';
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitPilot</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 16px;
            margin: 0;
        }
        
        .container {
            max-width: 100%;
        }
        
        .input-section {
            margin-bottom: 20px;
        }
        
        .input-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        label {
            font-weight: bold;
            color: var(--vscode-input-foreground);
        }
        
        input, textarea {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            color: var(--vscode-input-foreground);
            padding: 8px;
            border-radius: 2px;
            font-family: inherit;
            font-size: inherit;
        }
        
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 2px;
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
            margin-right: 8px;
            margin-bottom: 8px;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .secondary-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .secondary-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .result-section {
            margin-top: 20px;
        }
        
        .result-card {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 12px;
            background-color: var(--vscode-editor-background);
        }
        
        .success {
            border-left: 4px solid var(--vscode-gitDecoration-addedResourceForeground);
        }
        
        .error {
            border-left: 4px solid var(--vscode-gitDecoration-deletedResourceForeground);
        }
        
        .warning {
            border-left: 4px solid var(--vscode-gitDecoration-modifiedResourceForeground);
        }
        
        .info {
            border-left: 4px solid var(--vscode-gitDecoration-renamedResourceForeground);
        }
        
        .command-code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 8px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            margin: 8px 0;
            word-break: break-all;
        }
        
        .context-info {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 16px;
        }
        
        .loading {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--vscode-descriptionForeground);
        }
        
        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-progressBar-background);
            border-top: 2px solid var(--vscode-progressBar-foreground);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="context-info" id="contextInfo">
            Getting repository status...
        </div>
        
        <div class="input-section">
            <div class="input-group">
                <label for="commandInput">Enter your Git command in natural language:</label>
                <textarea id="commandInput" rows="3" placeholder="e.g., 'create a new branch for user authentication'"></textarea>
            </div>
            
            <div style="margin-top: 12px;">
                <button id="executeBtn">Execute</button>
                <button id="previewBtn" class="secondary-button">Preview</button>
            </div>
        </div>
        
        <div class="result-section" id="resultSection"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        document.getElementById('executeBtn').addEventListener('click', () => {
            const command = document.getElementById('commandInput').value.trim();
            if (command) {
                executeCommand(command, false);
            }
        });
        
        document.getElementById('previewBtn').addEventListener('click', () => {
            const command = document.getElementById('commandInput').value.trim();
            if (command) {
                executeCommand(command, true);
            }
        });
        
        document.getElementById('commandInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                const command = document.getElementById('commandInput').value.trim();
                if (command) {
                    executeCommand(command, false);
                }
            }
        });
        
        function executeCommand(command, dryRun) {
            setLoading(true);
            vscode.postMessage({
                type: 'executeCommand',
                command: command,
                dryRun: dryRun
            });
        }
        
        function setLoading(isLoading) {
            const executeBtn = document.getElementById('executeBtn');
            const previewBtn = document.getElementById('previewBtn');
            
            executeBtn.disabled = isLoading;
            previewBtn.disabled = isLoading;
            
            if (isLoading) {
                executeBtn.textContent = 'Executing...';
                previewBtn.textContent = 'Previewing...';
            } else {
                executeBtn.textContent = 'Execute';
                previewBtn.textContent = 'Preview';
            }
        }
        
        function addResult(type, title, content, isCode = false) {
            const resultSection = document.getElementById('resultSection');
            const card = document.createElement('div');
            card.className = \`result-card \${type}\`;
            
            const titleElement = document.createElement('h4');
            titleElement.textContent = title;
            titleElement.style.margin = '0 0 8px 0';
            card.appendChild(titleElement);
            
            if (isCode) {
                const codeElement = document.createElement('div');
                codeElement.className = 'command-code';
                codeElement.textContent = content;
                card.appendChild(codeElement);
            } else {
                const contentElement = document.createElement('div');
                contentElement.textContent = content;
                card.appendChild(contentElement);
            }
            
            resultSection.appendChild(card);
        }
        
        function updateContext(context) {
            const contextInfo = document.getElementById('contextInfo');
            if (context.error) {
                contextInfo.textContent = \`❌ \${context.error}\`;
            } else {
                const branch = context.branch || 'unknown';
                const dirty = context.is_dirty ? '(dirty)' : '(clean)';
                const staged = context.staged_files || 0;
                const unstaged = context.unstaged_files || 0;
                
                contextInfo.innerHTML = \`
                    📍 Branch: <strong>\${branch}</strong> \${dirty}<br>
                    📝 Staged: \${staged}, Unstaged: \${unstaged}
                \`;
            }
        }
        
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'thinking':
                    document.getElementById('resultSection').innerHTML = \`
                        <div class="loading">
                            <div class="spinner"></div>
                            <span>AI is thinking...</span>
                        </div>
                    \`;
                    break;
                    
                case 'commandGenerated':
                    document.getElementById('resultSection').innerHTML = '';
                    addResult('info', '🤖 Generated Command', message.command, true);
                    if (message.explanation) {
                        addResult('info', '💡 Explanation', message.explanation);
                    }
                    if (message.warning) {
                        addResult('warning', '⚠️ Warning', message.warning);
                    }
                    break;
                    
                case 'executionResult':
                    setLoading(false);
                    if (message.result.success) {
                        addResult('success', '✅ Success', message.result.output || 'Command executed successfully');
                    } else {
                        addResult('error', '❌ Error', message.result.error);
                    }
                    if (message.result.warnings && message.result.warnings.length > 0) {
                        message.result.warnings.forEach(warning => {
                            addResult('warning', '⚠️ Warning', warning);
                        });
                    }
                    break;
                    
                case 'previewResult':
                    setLoading(false);
                    addResult('info', '👀 Preview', message.result.output);
                    if (message.result.warnings && message.result.warnings.length > 0) {
                        message.result.warnings.forEach(warning => {
                            addResult('warning', '⚠️ Warning', warning);
                        });
                    }
                    break;
                    
                case 'error':
                    setLoading(false);
                    addResult('error', '❌ Error', message.message);
                    break;
                    
                case 'cancelled':
                    setLoading(false);
                    addResult('warning', '🚫 Cancelled', message.message);
                    break;
                    
                case 'contextUpdate':
                    updateContext(message.context);
                    break;
            }
        });
        
        // Request initial context
        vscode.postMessage({ type: 'getContext' });
    </script>
</body>
</html>`;
    }
}
exports.GitPilotWebviewProvider = GitPilotWebviewProvider;
GitPilotWebviewProvider.viewType = 'gitpilotPanel';
//# sourceMappingURL=webviewProvider.js.map