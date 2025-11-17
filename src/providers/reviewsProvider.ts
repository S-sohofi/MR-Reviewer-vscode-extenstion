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
            // Sort comments by severity: error > warning > info > suggestion
            const severityOrder = { 'error': 0, 'warning': 1, 'info': 2, 'suggestion': 3 };
            const sortedComments = [...element.result.comments].sort((a, b) => {
                const orderA = severityOrder[a.severity] ?? 4;
                const orderB = severityOrder[b.severity] ?? 4;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                return a.line - b.line;
            });

            return sortedComments.map((comment, index) =>
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
        
        // Count comments by severity
        const errors = result.comments.filter(c => c.severity === 'error').length;
        const warnings = result.comments.filter(c => c.severity === 'warning').length;
        const infos = result.comments.filter(c => c.severity === 'info').length;
        const suggestions = result.comments.filter(c => c.severity === 'suggestion').length;
        
        if (result.comments.length === 0) {
            return '✓ No issues';
        }
        
        // Build description with counts
        const parts: string[] = [];
        if (errors > 0) {
            parts.push(`${errors} error${errors > 1 ? 's' : ''}`);
        }
        if (warnings > 0) {
            parts.push(`${warnings} warning${warnings > 1 ? 's' : ''}`);
        }
        if (infos > 0) {
            parts.push(`${infos} info`);
        }
        if (suggestions > 0) {
            parts.push(`${suggestions} suggestion${suggestions > 1 ? 's' : ''}`);
        }
        
        return parts.join(', ');
    }

    private getIcon(result: ReviewResult): vscode.ThemeIcon {
        switch (result.status) {
            case 'reviewing': 
                return new vscode.ThemeIcon('loading~spin', new vscode.ThemeColor('charts.blue'));
            case 'completed': {
                if (result.comments.length === 0) {
                    return new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
                }
                // Use icon color based on highest severity
                const hasErrors = result.comments.some(c => c.severity === 'error');
                const hasWarnings = result.comments.some(c => c.severity === 'warning');
                
                if (hasErrors) {
                    return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
                } else if (hasWarnings) {
                    return new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
                } else {
                    return new vscode.ThemeIcon('info', new vscode.ThemeColor('charts.blue'));
                }
            }
            case 'error': 
                return new vscode.ThemeIcon('x', new vscode.ThemeColor('errorForeground'));
            default: 
                return new vscode.ThemeIcon('clock', new vscode.ThemeColor('charts.yellow'));
        }
    }

    private getSeverityIcon(severity: string): vscode.ThemeIcon {
        switch (severity) {
            case 'error': 
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
            case 'warning': 
                return new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
            case 'info': 
                return new vscode.ThemeIcon('info', new vscode.ThemeColor('charts.blue'));
            case 'suggestion': 
                return new vscode.ThemeIcon('lightbulb', new vscode.ThemeColor('charts.yellow'));
            default: 
                return new vscode.ThemeIcon('comment', new vscode.ThemeColor('foreground'));
        }
    }
}
