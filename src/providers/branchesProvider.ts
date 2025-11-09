import * as vscode from 'vscode';
import { GitService } from '../services/gitService';

export class BranchesProvider implements vscode.TreeDataProvider<BranchItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BranchItem | undefined | null | void> = new vscode.EventEmitter<BranchItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BranchItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private gitService: GitService) {
        // Listen for repository changes and refresh the view
        this.gitService.onDidChangeRepository(() => {
            this.refresh();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: BranchItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: BranchItem): Promise<BranchItem[]> {
        if (!element) {
            const currentBranch = await this.gitService.getCurrentBranch();
            const baseBranch = await this.gitService.getBaseBranch();

            return [
                new BranchItem(
                    `Current: ${currentBranch}`,
                    'current',
                    currentBranch,
                    vscode.TreeItemCollapsibleState.None
                ),
                new BranchItem(
                    `Base: ${baseBranch}`,
                    'base',
                    baseBranch,
                    vscode.TreeItemCollapsibleState.None
                )
            ];
        }
        return [];
    }
}

class BranchItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly branchType: 'current' | 'base',
        public readonly branchName: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `Click to change ${branchType} branch`;
        this.command = {
            command: 'mr-reviewer.changeBranch',
            title: 'Change Branch',
            arguments: [this]
        };
        this.iconPath = new vscode.ThemeIcon('git-branch');
    }
}
