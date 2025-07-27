"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitExecutor = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class GitExecutor {
    constructor(repoPath) {
        this.destructiveCommands = {
            'reset --hard': 'This will discard all uncommitted changes',
            'clean -f': 'This will delete untracked files permanently',
            'push --force': 'This will overwrite remote history',
            'rebase': 'This will rewrite commit history',
            'cherry-pick': 'This may create conflicts',
            'merge --no-ff': 'This will create a merge commit'
        };
        this.repoPath = repoPath;
    }
    async execute(command, dryRun = false, autoConfirm = false) {
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
        }
        catch (error) {
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
    cleanCommand(command) {
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
    checkDestructiveOperations(command) {
        const warnings = [];
        for (const [destructiveCmd, warning] of Object.entries(this.destructiveCommands)) {
            if (command.toLowerCase().includes(destructiveCmd)) {
                warnings.push(`⚠️ ${warning}`);
            }
        }
        return warnings;
    }
    isDestructiveCommand(command) {
        return Object.keys(this.destructiveCommands).some(destructiveCmd => command.toLowerCase().includes(destructiveCmd));
    }
    async previewCommand(command) {
        return this.execute(command, true);
    }
}
exports.GitExecutor = GitExecutor;
//# sourceMappingURL=gitExecutor.js.map