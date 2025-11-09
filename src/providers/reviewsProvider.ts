import * as vscode from 'vscode';
import { ReviewService } from '../services/reviewService';
import { ReviewResult, ReviewComment } from '../types';

export class ReviewsProvider implements vscode.TreeDataProvider<ReviewItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ReviewItem | undefined | null | void> = new vscode.EventEmitter<ReviewItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ReviewItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private reviewService: ReviewService) {
        reviewService.onReviewUpdate(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ReviewItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ReviewItem): Promise<ReviewItem[]> {
        if (!element) {
            const results = this.reviewService.getReviewResults();
            
            if (results.length === 0) {
                return [new ReviewItem('No reviews yet', null, null, vscode.TreeItemCollapsibleState.None)];
            }

            return results.map(result => 
                new ReviewItem(
                    result.filePath,
                    result,
                    null,
                    result.comments.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
                )
            );
        } else if (element.result && element.result.comments.length > 0) {
            return element.result.comments.map((comment, index) =>
                new ReviewItem(
                    `Line ${comment.line}: ${comment.message.substring(0, 50)}...`,
                    null,
                    comment,
                    vscode.TreeItemCollapsibleState.None
                )
            );
        }
        return [];
    }
}

class ReviewItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly result: ReviewResult | null,
        public readonly comment: ReviewComment | null,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        if (result) {
            this.tooltip = `Status: ${result.status}`;
            this.description = this.getDescription(result);
            this.iconPath = this.getIcon(result);
            
            if (result.status === 'completed' && result.comments.length === 0) {
                this.command = {
                    command: 'vscode.open',
                    title: 'Open File',
                    arguments: [vscode.Uri.file(result.filePath)]
                };
            }
        } else if (comment) {
            this.tooltip = comment.message;
            this.iconPath = this.getSeverityIcon(comment.severity);
            this.command = {
                command: 'mr-reviewer.viewComment',
                title: 'View Comment',
                arguments: [this]
            };
        }
    }

    private getDescription(result: ReviewResult): string {
        if (result.status === 'error') {
            return '❌ Error';
        }
        if (result.status === 'reviewing') {
            return '🔄 Reviewing...';
        }
        if (result.status === 'pending') {
            return '⏳ Pending';
        }
        const count = result.comments.length;
        return count > 0 ? `${count} comment${count > 1 ? 's' : ''}` : '✓ No issues';
    }

    private getIcon(result: ReviewResult): vscode.ThemeIcon {
        switch (result.status) {
            case 'reviewing': return new vscode.ThemeIcon('loading~spin');
            case 'completed': 
                return result.comments.length > 0 
                    ? new vscode.ThemeIcon('warning') 
                    : new vscode.ThemeIcon('pass');
            case 'error': return new vscode.ThemeIcon('error');
            default: return new vscode.ThemeIcon('clock');
        }
    }

    private getSeverityIcon(severity: string): vscode.ThemeIcon {
        switch (severity) {
            case 'error': return new vscode.ThemeIcon('error');
            case 'warning': return new vscode.ThemeIcon('warning');
            case 'info': return new vscode.ThemeIcon('info');
            case 'suggestion': return new vscode.ThemeIcon('lightbulb');
            default: return new vscode.ThemeIcon('comment');
        }
    }
}
