import * as vscode from 'vscode';
import { ConfigurationService } from './configurationService';
import { GitService } from './gitService';
import { AIService } from './aiService';
import { ReviewResult, ReviewComment, FileChange } from '../types';

export type ReviewType = 'uncommitted' | 'committed' | 'all';

export class ReviewService {
    private reviewResults: ReviewResult[] = [];
    private aiService: AIService;
    private decorationType: vscode.TextEditorDecorationType;
    private _onReviewUpdate = new vscode.EventEmitter<void>();
    public readonly onReviewUpdate = this._onReviewUpdate.event;

    constructor(
        private configService: ConfigurationService,
        private gitService: GitService
    ) {
        this.aiService = new AIService();
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 200, 0, 0.2)',
            isWholeLine: true,
            overviewRulerColor: 'yellow',
            overviewRulerLane: vscode.OverviewRulerLane.Right
        });
    }

    async startReview(reviewType: ReviewType = 'all'): Promise<void> {
        let changes: FileChange[] = [];
        let reviewTypeLabel = '';

        switch (reviewType) {
            case 'uncommitted':
                changes = await this.gitService.getUncommittedChanges();
                reviewTypeLabel = 'uncommitted';
                break;
            case 'committed':
                changes = await this.gitService.getCommittedChanges();
                reviewTypeLabel = 'committed';
                break;
            case 'all':
                changes = await this.gitService.getChanges();
                reviewTypeLabel = 'all';
                break;
        }
        
        if (changes.length === 0) {
            vscode.window.showInformationMessage(`No ${reviewTypeLabel} changes to review`);
            return;
        }

        this.reviewResults = changes.map(change => ({
            filePath: change.filePath,
            status: 'pending',
            comments: []
        }));
        this._onReviewUpdate.fire();

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Reviewing ${reviewTypeLabel} code changes`,
            cancellable: true
        }, async (progress, token) => {
            const aiConfig = await this.configService.getAIConfig();
            const customRules = this.configService.getCustomRules();
            
            let completed = 0;
            const total = changes.length;

            for (const change of changes) {
                if (token.isCancellationRequested) {
                    break;
                }

                const result = this.reviewResults.find(r => r.filePath === change.filePath);
                if (!result) {
                    continue;
                }

                result.status = 'reviewing';
                this._onReviewUpdate.fire();

                const fileName = this.getFileName(change.filePath);
                progress.report({
                    message: `Reviewing ${fileName} (${completed + 1}/${total})`,
                    increment: (1 / total) * 100
                });

                try {
                    if (change.status !== 'deleted') {
                        const fileContent = await this.gitService.getFileContent(change.filePath);
                        const comments = await this.aiService.reviewCode(
                            aiConfig.provider,
                            aiConfig.apiKey,
                            change.filePath,
                            fileContent,
                            change.diff,
                            customRules
                        );

                        result.comments = comments;
                        result.status = 'completed';
                    } else {
                        result.status = 'completed';
                    }
                } catch (error: any) {
                    result.status = 'error';
                    result.error = error.message;
                    vscode.window.showErrorMessage(`Review failed for ${change.filePath}: ${error.message}`);
                }

                completed++;
                this._onReviewUpdate.fire();
            }

            const totalComments = this.reviewResults.reduce((sum, r) => sum + r.comments.length, 0);
            vscode.window.showInformationMessage(
                `Review completed! Found ${totalComments} comment${totalComments !== 1 ? 's' : ''} in ${completed} file${completed !== 1 ? 's' : ''}`
            );
        });
    }

    private getFileName(filePath: string): string {
        const parts = filePath.split(/[\\/]/);
        return parts[parts.length - 1];
    }

    getReviewResults(): ReviewResult[] {
        return this.reviewResults;
    }

    async navigateToComment(comment: ReviewComment): Promise<void> {
        const uri = vscode.Uri.file(comment.filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);

        const line = Math.max(0, comment.line - 1);
        const range = new vscode.Range(line, 0, line, 0);
        
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

        this.highlightLine(editor, line);

        const severityIcon = this.getSeverityIcon(comment.severity);
        
        if (comment.suggestion) {
            const result = await vscode.window.showInformationMessage(
                `${severityIcon} ${comment.severity.toUpperCase()}: ${comment.message}`,
                'View Suggestion'
            );

            if (result === 'View Suggestion') {
                vscode.window.showInformationMessage(`Suggestion: ${comment.suggestion}`);
            }
        } else {
            vscode.window.showInformationMessage(
                `${severityIcon} ${comment.severity.toUpperCase()}: ${comment.message}`
            );
        }
    }

    private highlightLine(editor: vscode.TextEditor, line: number): void {
        const range = new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length);
        editor.setDecorations(this.decorationType, [range]);

        setTimeout(() => {
            editor.setDecorations(this.decorationType, []);
        }, 3000);
    }

    private getSeverityIcon(severity: string): string {
        switch (severity) {
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            case 'suggestion': return '💡';
            default: return '📝';
        }
    }

    clearReviews(): void {
        this.reviewResults = [];
        this._onReviewUpdate.fire();
    }
}
