import * as vscode from 'vscode';
import { GitService } from '../services/gitService';
import { ReviewService } from '../services/reviewService';
import { FileChange } from '../types';

export type ReviewType = 'uncommitted' | 'committed' | 'all';

export class ChangesProvider implements vscode.TreeDataProvider<ChangeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ChangeItem | undefined | null | void> = new vscode.EventEmitter<ChangeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ChangeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private currentReviewType: ReviewType = 'all';

    constructor(
        private gitService: GitService,
        private reviewService: ReviewService
    ) {
        // Listen for repository changes and refresh the view
        this.gitService.onDidChangeRepository(() => {
            this.refresh();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setReviewType(type: ReviewType): void {
        this.currentReviewType = type;
        this.refresh();
    }

    getCurrentReviewType(): ReviewType {
        return this.currentReviewType;
    }

    getTreeItem(element: ChangeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ChangeItem): Promise<ChangeItem[]> {
        if (!element) {
            // Root level - show files based on current review type
            let changes: FileChange[] = [];
            
            switch (this.currentReviewType) {
                case 'uncommitted':
                    changes = await this.gitService.getUncommittedChanges();
                    break;
                case 'committed':
                    changes = await this.gitService.getCommittedChanges();
                    break;
                case 'all':
                    changes = await this.gitService.getChanges();
                    break;
            }

            if (changes.length === 0) {
                return [new ChangeItem('No changes found', null, vscode.TreeItemCollapsibleState.None)];
            }

            return changes.map(change => 
                new ChangeItem(
                    this.getFileName(change.filePath),
                    change,
                    vscode.TreeItemCollapsibleState.None
                )
            );
        }
        return [];
    }

    private getFileName(filePath: string): string {
        const parts = filePath.split(/[\\/]/);
        return parts[parts.length - 1];
    }

    private getStatusIcon(status: string): string {
        switch (status) {
            case 'added': return '➕';
            case 'modified': return '📝';
            case 'deleted': return '❌';
            case 'renamed': return '🔄';
            default: return '📄';
        }
    }
}

class ChangeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly change: FileChange | null,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        
        if (change) {
            // This is a file change item
            this.tooltip = `${change.status.toUpperCase()}: +${change.additions} -${change.deletions}\n${change.filePath}`;
            this.description = `+${change.additions} -${change.deletions}`;
            this.iconPath = this.getIcon(change.status);
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(change.filePath)]
            };
            this.contextValue = 'fileChange';
        }
    }

    private getIcon(status: string): vscode.ThemeIcon {
        switch (status) {
            case 'added': return new vscode.ThemeIcon('diff-added');
            case 'modified': return new vscode.ThemeIcon('diff-modified');
            case 'deleted': return new vscode.ThemeIcon('diff-removed');
            case 'renamed': return new vscode.ThemeIcon('diff-renamed');
            default: return new vscode.ThemeIcon('file');
        }
    }
}
