"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextAnalyzer = void 0;
const child_process_1 = require("child_process");
class ContextAnalyzer {
    constructor(repoPath) {
        this.repoPath = repoPath;
    }
    async isGitRepo() {
        try {
            (0, child_process_1.execSync)('git status', { cwd: this.repoPath });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async analyzeContext() {
        if (!await this.isGitRepo()) {
            return { error: 'Not a Git repository' };
        }
        try {
            const branch = this.getCurrentBranch();
            const isDirty = !!(0, child_process_1.execSync)('git status --porcelain', { cwd: this.repoPath }).toString().trim();
            const stagedFiles = (0, child_process_1.execSync)('git diff --cached --name-only', { cwd: this.repoPath }).toString().trim().split('\n').length - 1;
            const unstagedFiles = (0, child_process_1.execSync)('git diff --name-only', { cwd: this.repoPath }).toString().trim().split('\n').length - 1;
            const untrackedFiles = (0, child_process_1.execSync)('git ls-files --others --exclude-standard', { cwd: this.repoPath }).toString().trim().split('\n').length - 1;
            const isDetached = !!(0, child_process_1.execSync)('git symbolic-ref -q HEAD', { cwd: this.repoPath }).toString().trim();
            const remoteStatus = this.getRemoteStatus();
            const lastCommit = this.getLastCommitInfo();
            const stashCount = (0, child_process_1.execSync)('git stash list', { cwd: this.repoPath }).toString().trim().split('\n').length - 1;
            return {
                branch,
                is_dirty: isDirty,
                staged_files: stagedFiles,
                unstaged_files: unstagedFiles,
                untracked_files: untrackedFiles,
                is_detached: isDetached,
                remote_status: remoteStatus,
                last_commit: lastCommit,
                stash_count: stashCount
            };
        }
        catch (error) {
            return { error: `Failed to analyze context: ${error}` };
        }
    }
    getCurrentBranch() {
        try {
            const branch = (0, child_process_1.execSync)('git rev-parse --abbrev-ref HEAD', { cwd: this.repoPath }).toString().trim();
            return branch || 'unknown';
        }
        catch (error) {
            return 'unknown';
        }
    }
    getRemoteStatus() {
        try {
            const origin = (0, child_process_1.execSync)('git remote show origin', { cwd: this.repoPath }).toString();
            const aheadMatch = origin.match(/local out of date by (\d+) commit/);
            const behindMatch = origin.match(/branches out of date by (\d+) commit/);
            return {
                has_remote: true,
                ahead: aheadMatch ? parseInt(aheadMatch[1], 10) : 0,
                behind: behindMatch ? parseInt(behindMatch[1], 10) : 0,
                up_to_date: !aheadMatch && !behindMatch
            };
        }
        catch (error) {
            return { has_remote: false };
        }
    }
    getLastCommitInfo() {
        try {
            const commit = (0, child_process_1.execSync)('git log -1 --pretty=format:"%h | %s | %an | %ci"', { cwd: this.repoPath }).toString().split('|');
            return {
                sha: commit[0].trim(),
                message: commit[1].trim(),
                author: commit[2].trim(),
                date: new Date(commit[3].trim()).toISOString()
            };
        }
        catch (error) {
            return {};
        }
    }
}
exports.ContextAnalyzer = ContextAnalyzer;
//# sourceMappingURL=contextAnalyzer.js.map