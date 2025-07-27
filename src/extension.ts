import * as vscode from 'vscode';
import { GitPilotWebviewProvider } from './webviewProvider';
import { AIEngine } from './aiEngine';
import { ContextAnalyzer } from './contextAnalyzer';
import { GitExecutor } from './gitExecutor';

export function activate(context: vscode.ExtensionContext) {
    console.log('GitPilot extension is now active!');
    
    try {

    // Register webview provider
    const provider = new GitPilotWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(GitPilotWebviewProvider.viewType, provider)
    );

    // Register commands
    const executeCommand = vscode.commands.registerCommand('gitpilot.executeCommand', async () => {
        await executeGitPilotCommand();
    });

    const openPanel = vscode.commands.registerCommand('gitpilot.openPanel', async () => {
        try {
            // Try multiple methods to open the panel
            await vscode.commands.executeCommand('gitpilotPanel.focus');
        } catch (error) {
            // Fallback: show the activity bar and notify user
            await vscode.commands.executeCommand('workbench.view.extension.gitpilot');
            vscode.window.showInformationMessage('GitPilot panel is available in the Activity Bar (robot icon 🤖)');
        }
    });

    context.subscriptions.push(executeCommand, openPanel);
    
    } catch (error) {
        console.error('GitPilot extension activation failed:', error);
        vscode.window.showErrorMessage(`GitPilot extension failed to activate: ${error}`);
    }
}

async function executeGitPilotCommand() {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a workspace folder first.');
            return;
        }

        const contextAnalyzer = new ContextAnalyzer(workspaceFolder.uri.fsPath);
        if (!await contextAnalyzer.isGitRepo()) {
            vscode.window.showErrorMessage('Not a Git repository. Please open a Git repository.');
            return;
        }

        const userInput = await vscode.window.showInputBox({
            prompt: 'Enter your Git command in natural language',
            placeHolder: 'e.g., "create a new branch for user authentication"'
        });

        if (!userInput) return;

        const config = vscode.workspace.getConfiguration('gitpilot');
        const apiKey = config.get<string>('geminiApiKey');
        const groqApiKey = config.get<string>('groqApiKey');

        if (!apiKey && !groqApiKey) {
            const result = await vscode.window.showErrorMessage(
                'No API key configured. Please set up your AI provider API key in settings.',
                'Open Settings'
            );
            if (result === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'gitpilot');
            }
            return;
        }

        const aiEngine = new AIEngine(apiKey, groqApiKey);
        const context = await contextAnalyzer.analyzeContext();
        const defaultModel = config.get<string>('defaultModel') || 'gemini';
        
        const modelChoice = getModelChoice(defaultModel);
        const aiResponse = await aiEngine.generateCommand(userInput, context, modelChoice);

        if (!aiResponse.command) {
            vscode.window.showErrorMessage(`Failed to generate command: ${aiResponse.explanation}`);
            return;
        }

        const executor = new GitExecutor(workspaceFolder.uri.fsPath);
        const isDestructive = executor.isDestructiveCommand(aiResponse.command);
        const autoConfirm = config.get<boolean>('autoConfirm');

        let shouldExecute = true;
        if (isDestructive && !autoConfirm) {
            const result = await vscode.window.showWarningMessage(
                `Execute potentially destructive command: ${aiResponse.command}?`,
                { modal: true },
                'Execute',
                'Cancel'
            );
            shouldExecute = result === 'Execute';
        }

        if (shouldExecute) {
            const result = await executor.execute(aiResponse.command);
            if (result.success) {
                vscode.window.showInformationMessage(`✅ Success: ${result.output || 'Command executed successfully'}`);
            } else {
                vscode.window.showErrorMessage(`❌ Error: ${result.error}`);
            }
        } else {
            vscode.window.showInformationMessage('Operation cancelled.');
        }

    } catch (error) {
        vscode.window.showErrorMessage(`GitPilot error: ${error}`);
    }
}

function getModelChoice(defaultModel: string): string {
    const modelMap: { [key: string]: string } = {
        'gemini': '1',
        'groq-llama-3.1': '2',
        'groq-llama-3.3': '3',
        'deepseek': '4'
    };
    return modelMap[defaultModel] || '1';
}

export function deactivate() {}

