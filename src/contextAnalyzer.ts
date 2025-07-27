import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class ContextAnalyzer {
    private repoPath: string;

    constructor(repoPath: string) {
        this.repoPath = repoPath;
    }

    async isGitRepo(): Promise<boolean> {
        try {
            execSync('git status', { cwd: this.repoPath });
            return true;
        } catch (error) {
            return false;
        }
    }

    async analyzeContext() {
        if (!await this.isGitRepo()) {
            return { error: 'Not a Git repository' };
        }

        try {
            const branch = this.getCurrentBranch();
            const isDirty = !!execSync('git status --porcelain', { cwd: this.repoPath }).toString().trim();
            const stagedFiles = execSync('git diff --cached --name-only', { cwd: this.repoPath }).toString().trim().split('\n').length - 1;
            const unstagedFiles = execSync('git diff --name-only', { cwd: this.repoPath }).toString().trim().split('\n').length - 1;
            const untrackedFiles = execSync('git ls-files --others --exclude-standard', { cwd: this.repoPath }).toString().trim().split('\n').length - 1;
            const isDetached = !!execSync('git symbolic-ref -q HEAD', { cwd: this.repoPath }).toString().trim();
            const remoteStatus = this.getRemoteStatus();
            const lastCommit = this.getLastCommitInfo();
            const stashCount = execSync('git stash list', { cwd: this.repoPath }).toString().trim().split('\n').length - 1;

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
        } catch (error) {
            return { error: `Failed to analyze context: ${error}` };
        }
    }

    private getCurrentBranch(): string {
        try {
            const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: this.repoPath }).toString().trim();
            return branch || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    private getRemoteStatus() {
        try {
            const origin = execSync('git remote show origin', { cwd: this.repoPath }).toString();
            const aheadMatch = origin.match(/local out of date by (\d+) commit/);
            const behindMatch = origin.match(/branches out of date by (\d+) commit/);

            return {
                has_remote: true,
                ahead: aheadMatch ? parseInt(aheadMatch[1], 10) : 0,
                behind: behindMatch ? parseInt(behindMatch[1], 10) : 0,
                up_to_date: !aheadMatch && !behindMatch
            };
        } catch (error) {
            return { has_remote: false };
        }
    }

    private getLastCommitInfo() {
        try {
            const commit = execSync('git log -1 --pretty=format:"%h | %s | %an | %ci"', { cwd: this.repoPath }).toString().split('|');
            return {
                sha: commit[0].trim(),
                message: commit[1].trim(),
                author: commit[2].trim(),
                date: new Date(commit[3].trim()).toISOString()
            };
        } catch (error) {
            return {};
        }
    }
}

