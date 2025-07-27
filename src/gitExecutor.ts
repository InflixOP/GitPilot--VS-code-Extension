import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    executed: boolean;
    warnings?: string[];
    return_code?: number;
}

export class GitExecutor {
    private repoPath: string;
    private destructiveCommands = {
        'reset --hard': 'This will discard all uncommitted changes',
        'clean -f': 'This will delete untracked files permanently',
        'push --force': 'This will overwrite remote history',
        'rebase': 'This will rewrite commit history',
        'cherry-pick': 'This may create conflicts',
        'merge --no-ff': 'This will create a merge commit'
    };

    constructor(repoPath: string) {
        this.repoPath = repoPath;
    }

    async execute(command: string, dryRun: boolean = false, autoConfirm: boolean = false): Promise<ExecutionResult> {
        if (!command || !command.trim().startsWith('git')) {
            return {
                success: false,
                output: '',
                error: 'Invalid Git command',
                executed: false
            };
        }

        const cleanCommand = this.cleanCommand(command);
        const warnings = this.checkDestructiveOperations(cleanCommand);

        if (dryRun) {
            return {
                success: true,
                output: `Would execute: ${cleanCommand}`,
                error: '',
                executed: false,
                warnings
            };
        }

        try {
            const { stdout, stderr } = await execAsync(cleanCommand, { 
                cwd: this.repoPath,
                timeout: 30000
            });

            return {
                success: true,
                output: stdout,
                error: stderr || '',
                executed: true,
                warnings,
                return_code: 0
            };
        } catch (error: any) {
            return {
                success: false,
                output: error.stdout || '',
                error: error.stderr || error.message || 'Command execution failed',
                executed: false,
                warnings,
                return_code: error.code || 1
            };
        }
    }

    private cleanCommand(command: string): string {
        command = command.trim();
        if (!command.startsWith('git')) {
            command = 'git ' + command;
        }

        const dangerousChars = [';', '&&', '||', '|', '`', '$', '>', '<'];
        for (const char of dangerousChars) {
            if (command.includes(char)) {
                throw new Error(`Potentially dangerous character detected: ${char}`);
            }
        }

        return command;
    }

    private checkDestructiveOperations(command: string): string[] {
        const warnings: string[] = [];
        for (const [destructiveCmd, warning] of Object.entries(this.destructiveCommands)) {
            if (command.toLowerCase().includes(destructiveCmd)) {
                warnings.push(`⚠️ ${warning}`);
            }
        }
        return warnings;
    }

    isDestructiveCommand(command: string): boolean {
        return Object.keys(this.destructiveCommands).some(
            destructiveCmd => command.toLowerCase().includes(destructiveCmd)
        );
    }

    async previewCommand(command: string): Promise<ExecutionResult> {
        return this.execute(command, true);
    }
}
