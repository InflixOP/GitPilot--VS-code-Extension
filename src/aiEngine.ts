import axios from 'axios';

interface AIResponse {
    command: string | null;
    explanation: string;
    warning: string | null;
}

interface ContextInfo {
    branch?: string;
    is_dirty?: boolean;
    staged_files?: number;
    unstaged_files?: number;
    untracked_files?: number;
    is_detached?: boolean;
    remote_status?: any;
    error?: string;
}

export class AIEngine {
    private geminiApiKey?: string;
    private groqApiKey?: string;

    private availableModels = {
        "1": { name: "Gemini 2.0 Flash", provider: "gemini", model: "gemini-2.0-flash" },
        "2": { name: "Llama 3.1 8B Instant", provider: "groq", model: "llama-3.1-8b-instant" },
        "3": { name: "Llama 3.3 70B Versatile", provider: "groq", model: "llama-3.3-70b-versatile" },
        "4": { name: "DeepSeek R1 Distill Llama 70B", provider: "groq", model: "deepseek-r1-distill-llama-70b" }
    };

    constructor(geminiApiKey?: string, groqApiKey?: string) {
        this.geminiApiKey = geminiApiKey;
        this.groqApiKey = groqApiKey;
    }

    async generateCommand(userInput: string, context: ContextInfo, modelChoice: string = "1"): Promise<AIResponse> {
        try {
            const modelInfo = this.availableModels[modelChoice as keyof typeof this.availableModels] || this.availableModels["1"];
            
            if (modelInfo.provider === "gemini") {
                return await this.generateWithGemini(userInput, context, modelInfo.model);
            } else if (modelInfo.provider === "groq") {
                return await this.generateWithGroq(userInput, context, modelInfo.model);
            } else {
                throw new Error(`Unknown provider: ${modelInfo.provider}`);
            }
        } catch (error) {
            return {
                command: null,
                explanation: `Failed to generate command: ${error}`,
                warning: "Please try again or use manual Git commands"
            };
        }
    }

    private async generateWithGemini(userInput: string, context: ContextInfo, model: string): Promise<AIResponse> {
        if (!this.geminiApiKey) {
            throw new Error("Gemini API key not configured");
        }

        const prompt = this.buildPrompt(userInput, context);
        
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`,
                {
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            return this.parseAIResponse(responseText);
        } catch (error) {
            throw new Error(`Gemini API error: ${error}`);
        }
    }

    private async generateWithGroq(userInput: string, context: ContextInfo, model: string): Promise<AIResponse> {
        if (!this.groqApiKey) {
            throw new Error("Groq API key not configured");
        }

        const prompt = this.buildPrompt(userInput, context);
        
        try {
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: model,
                    messages: [
                        {
                            role: "system",
                            content: "You are GitPilot, an AI assistant that converts natural language to Git commands. CRITICAL: Always respond with ONLY a valid JSON object in this exact format: {\"command\": \"git ...\", \"explanation\": \"...\", \"warning\": \"...\" or null}. The command should be a valid Git command or null if no command can be generated. Do not include any text before or after the JSON object."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.groqApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const responseText = response.data.choices?.[0]?.message?.content || "";
            return this.parseAIResponse(responseText);
        } catch (error) {
            throw new Error(`Groq API error: ${error}`);
        }
    }

    private buildPrompt(userInput: string, context: ContextInfo): string {
        const contextStr = this.formatContext(context);
        return `Based on the current Git repository state:
- Branch: ${context.branch || 'unknown'}
- Dirty: ${context.is_dirty || false}
- Staged files: ${context.staged_files || 0}
- Unstaged files: ${context.unstaged_files || 0}
- Detached HEAD: ${context.is_detached || false}
- Remote status: ${JSON.stringify(context.remote_status || {})}

User request: ${userInput}

Provide the most appropriate Git command considering the current context. Respond with a JSON object containing 'command', 'explanation', and 'warning' fields.`;
    }

    private formatContext(context: ContextInfo): string {
        if (context.error) {
            return `Error: ${context.error}`;
        }

        const lines = [
            `Branch: ${context.branch || 'unknown'}`,
            `Dirty: ${context.is_dirty || false}`,
            `Staged files: ${context.staged_files || 0}`,
            `Unstaged files: ${context.unstaged_files || 0}`,
            `Untracked files: ${context.untracked_files || 0}`
        ];

        if (context.remote_status?.has_remote) {
            const remote = context.remote_status;
            lines.push(`Remote: ${remote.ahead || 0} ahead, ${remote.behind || 0} behind`);
        }

        return lines.join('\n');
    }

    private parseAIResponse(response: string): AIResponse {
        try {
            // Try to parse as JSON first
            const jsonMatch = response.match(/\{[^}]*"command"[^}]*\}/s);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch {
                    // Fall through to text parsing
                }
            }

            if (response.trim().startsWith("{")) {
                try {
                    return JSON.parse(response.trim());
                } catch {
                    // Fall through to text parsing
                }
            }

            // Text parsing fallback
            const lines = response.split('\n');
            let command: string | null = null;
            let explanation = "";
            let warning: string | null = null;

            for (const line of lines) {
                const trimmedLine = line.trim();
                
                if (!command) {
                    if (trimmedLine.startsWith("git ")) {
                        command = trimmedLine;
                    } else if (trimmedLine.includes("`git ")) {
                        const gitMatch = trimmedLine.match(/`(git [^`]+)`/);
                        if (gitMatch) {
                            command = gitMatch[1];
                        }
                    }
                }

                if (trimmedLine.startsWith("Warning:") || trimmedLine.startsWith("Note:") || trimmedLine.includes("⚠️")) {
                    warning = trimmedLine;
                } else if (trimmedLine.toLowerCase().includes("warning") && !warning) {
                    warning = trimmedLine;
                } else if (trimmedLine && !command && !trimmedLine.startsWith("```") && !trimmedLine.startsWith("`")) {
                    if (!trimmedLine.includes("git ")) {
                        explanation += trimmedLine + " ";
                    }
                }
            }

            if (command) {
                command = command.trim().replace(/^`|`$/g, '');
                if (!command.startsWith("git ")) {
                    command = "git " + command;
                }
            }

            return {
                command,
                explanation: explanation.trim(),
                warning
            };
        } catch (error) {
            return {
                command: null,
                explanation: response,
                warning: "Failed to parse AI response"
            };
        }
    }
}
