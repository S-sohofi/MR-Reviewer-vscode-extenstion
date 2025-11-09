import * as vscode from 'vscode';
import { FileChange } from '../types';
import * as path from 'path';
import * as fs from 'fs';

export class GitService {
    private gitExtension: any;
    private repository: any;
    private api: any;
    private onRepositoryChange: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeRepository: vscode.Event<void> = this.onRepositoryChange.event;

    constructor() {
        // Git will be initialized asynchronously
        this.initializeGit().catch(err => {
            console.error('Failed to initialize Git:', err);
        });
    }

    private async initializeGit() {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            throw new Error('Git extension not found');
        }
        
        const extension = gitExtension.isActive ? gitExtension : await gitExtension.activate();
        this.gitExtension = extension.exports;
        this.api = this.gitExtension.getAPI(1);
        
        // Try to get repository immediately
        this.updateRepository();
        
        // Listen for repository changes (when Git discovers repos)
        this.api.onDidOpenRepository(() => {
            this.updateRepository();
            this.onRepositoryChange.fire();
        });

        this.api.onDidCloseRepository(() => {
            this.updateRepository();
            this.onRepositoryChange.fire();
        });
    }

    private updateRepository() {
        if (this.api && this.api.repositories.length > 0) {
            this.repository = this.api.repositories[0];
        } else {
            this.repository = null;
        }
    }

    private async ensureInitialized() {
        if (!this.gitExtension) {
            await this.initializeGit();
        }
        
        // Wait a bit for Git to discover repositories if none are found yet
        if (!this.repository && this.api) {
            await this.waitForRepository();
        }
    }

    private async waitForRepository(maxWaitMs: number = 5000): Promise<void> {
        const startTime = Date.now();
        while (!this.repository && (Date.now() - startTime) < maxWaitMs) {
            this.updateRepository();
            if (this.repository) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async getCurrentBranch(): Promise<string> {
        await this.ensureInitialized();
        if (!this.repository) {
            return 'N/A';
        }
        return this.repository.state.HEAD?.name || 'N/A';
    }

    async getBaseBranch(): Promise<string> {
        const config = vscode.workspace.getConfiguration('mr-reviewer');
        let baseBranch = config.get<string>('baseBranch', '');
        
        // If no base branch is configured, try to auto-detect main/master
        if (!baseBranch) {
            await this.ensureInitialized();
            if (this.repository) {
                try {
                    const refs = await this.repository.getRefs();
                    const branches = refs
                        .filter((ref: any) => ref.type === 0)
                        .map((ref: any) => ref.name);
                    
                    // Check for common base branch names
                    if (branches.includes('main')) {
                        baseBranch = 'main';
                    } else if (branches.includes('master')) {
                        baseBranch = 'master';
                    } else if (branches.includes('develop')) {
                        baseBranch = 'develop';
                    } else if (branches.length > 0) {
                        baseBranch = branches[0];
                    }
                    
                    // Save the detected base branch
                    if (baseBranch) {
                        await config.update('baseBranch', baseBranch, vscode.ConfigurationTarget.Workspace);
                    }
                } catch (error) {
                    console.error('Failed to auto-detect base branch:', error);
                }
            }
        }
        
        return baseBranch || 'main';
    }

    async switchBranch(): Promise<void> {
        await this.ensureInitialized();
        if (!this.repository) {
            vscode.window.showErrorMessage('Git repository not found');
            return;
        }

        const refs = await this.repository.getRefs();
        const branches = refs
            .filter((ref: any) => ref.type === 0)
            .map((ref: any) => ref.name);

        const selected = await vscode.window.showQuickPick(branches, {
            placeHolder: 'Select branch to switch to'
        });

        if (selected) {
            await this.repository.checkout(selected);
            vscode.window.showInformationMessage(`Switched to branch: ${selected}`);
        }
    }

    async selectBaseBranch(): Promise<void> {
        await this.ensureInitialized();
        if (!this.repository) {
            vscode.window.showErrorMessage('Git repository not found');
            return;
        }

        const refs = await this.repository.getRefs();
        const branches = refs
            .filter((ref: any) => ref.type === 0)
            .map((ref: any) => ref.name);

        const selected = await vscode.window.showQuickPick(branches, {
            placeHolder: 'Select base branch for comparison'
        });

        if (selected) {
            const config = vscode.workspace.getConfiguration('mr-reviewer');
            await config.update('baseBranch', selected, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(`Base branch set to: ${selected}`);
        }
    }

    async getChanges(): Promise<FileChange[]> {
        // This gets ALL changes (both committed and uncommitted)
        const committed = await this.getCommittedChanges();
        const uncommitted = await this.getUncommittedChanges();
        
        // Merge both, avoiding duplicates
        const allChanges = [...committed];
        const committedPaths = new Set(committed.map(c => c.filePath));
        
        for (const change of uncommitted) {
            if (!committedPaths.has(change.filePath)) {
                allChanges.push(change);
            } else {
                // File has both committed and uncommitted changes
                // Update the existing entry to reflect total changes
                const existingIndex = allChanges.findIndex(c => c.filePath === change.filePath);
                if (existingIndex !== -1) {
                    allChanges[existingIndex].additions += change.additions;
                    allChanges[existingIndex].deletions += change.deletions;
                    allChanges[existingIndex].diff += '\n' + change.diff;
                }
            }
        }
        
        return allChanges;
    }

    async getCommittedChanges(): Promise<FileChange[]> {
        await this.ensureInitialized();
        if (!this.repository) {
            return [];
        }

        const baseBranch = await this.getBaseBranch();
        const currentBranch = await this.getCurrentBranch();

        if (currentBranch === baseBranch) {
            return [];
        }

        try {
            // Use git diff command to get accurate changes between branches
            const workspaceRoot = this.getWorkspaceRoot();
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // Get list of changed files with their status
            const { stdout } = await execAsync(
                `git diff --name-status ${baseBranch}...${currentBranch}`,
                { cwd: workspaceRoot }
            );

            if (!stdout.trim()) {
                return [];
            }

            const changes: FileChange[] = [];
            const lines = stdout.trim().split('\n');

            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 2) {
                    continue;
                }

                const statusCode = parts[0];
                const filePath = parts[1];
                const fullPath = require('path').join(workspaceRoot, filePath);
                
                const status = this.mapGitStatus(statusCode);
                
                // Get diff for this specific file
                try {
                    const { stdout: diffOutput } = await execAsync(
                        `git diff ${baseBranch}...${currentBranch} -- "${filePath}"`,
                        { cwd: workspaceRoot }
                    );
                    
                    const stats = this.calculateStats(diffOutput);

                    changes.push({
                        filePath: fullPath,
                        status,
                        additions: stats.additions,
                        deletions: stats.deletions,
                        diff: diffOutput
                    });
                } catch (error) {
                    // Skip files that can't be diffed
                    console.error(`Error diffing file ${filePath}:`, error);
                }
            }

            return changes;
        } catch (error) {
            console.error('Failed to get committed changes:', error);
            return [];
        }
    }

    async getUncommittedChanges(): Promise<FileChange[]> {
        await this.ensureInitialized();
        if (!this.repository) {
            return [];
        }

        try {
            const workspaceRoot = this.getWorkspaceRoot();
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // Get staged and unstaged changes
            const { stdout } = await execAsync(
                'git diff --name-status HEAD',
                { cwd: workspaceRoot }
            );

            if (!stdout.trim()) {
                return [];
            }

            const changes: FileChange[] = [];
            const lines = stdout.trim().split('\n');

            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 2) {
                    continue;
                }

                const statusCode = parts[0];
                const filePath = parts[1];
                const fullPath = require('path').join(workspaceRoot, filePath);
                
                const status = this.mapGitStatus(statusCode);
                
                try {
                    const { stdout: diffOutput } = await execAsync(
                        `git diff HEAD -- "${filePath}"`,
                        { cwd: workspaceRoot }
                    );
                    
                    const stats = this.calculateStats(diffOutput);

                    changes.push({
                        filePath: fullPath,
                        status,
                        additions: stats.additions,
                        deletions: stats.deletions,
                        diff: diffOutput
                    });
                } catch (error) {
                    console.error(`Error diffing file ${filePath}:`, error);
                }
            }

            return changes;
        } catch (error) {
            console.error('Failed to get uncommitted changes:', error);
            return [];
        }
    }

    private mapStatus(status: number): 'added' | 'modified' | 'deleted' | 'renamed' {
        switch (status) {
            case 6: return 'added';
            case 5: return 'modified';
            case 7: return 'deleted';
            case 3: return 'renamed';
            default: return 'modified';
        }
    }

    private mapGitStatus(statusCode: string): 'added' | 'modified' | 'deleted' | 'renamed' {
        switch (statusCode.charAt(0)) {
            case 'A': return 'added';
            case 'M': return 'modified';
            case 'D': return 'deleted';
            case 'R': return 'renamed';
            default: return 'modified';
        }
    }

    private async getDiffForFile(filePath: string, baseBranch: string, currentBranch: string): Promise<string> {
        try {
            const result = await this.repository.diff(filePath, baseBranch, currentBranch);
            return result || '';
        } catch {
            return '';
        }
    }

    private calculateStats(diff: string): { additions: number; deletions: number } {
        const lines = diff.split('\n');
        let additions = 0;
        let deletions = 0;

        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
                additions++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                deletions++;
            }
        }

        return { additions, deletions };
    }

    async getFileContent(filePath: string): Promise<string> {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            return document.getText();
        } catch (error) {
            return '';
        }
    }

    getWorkspaceRoot(): string {
        if (this.repository) {
            return this.repository.rootUri.fsPath;
        }
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }
}
