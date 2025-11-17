import * as vscode from 'vscode';
import { ConfigurationService } from './configurationService';
import { GitService } from './gitService';
import { AIService } from './aiService';
import { CommentViewService } from './commentViewService';
import { ReviewResult, ReviewComment, FileChange } from '../types';

export type ReviewType = 'uncommitted' | 'committed' | 'all';

export class ReviewService {
    private reviewResults: ReviewResult[] = [];
    private aiService: AIService;
    private commentViewService: CommentViewService;
    private _onReviewUpdate = new vscode.EventEmitter<void>();
    public readonly onReviewUpdate = this._onReviewUpdate.event;

    constructor(
        private configService: ConfigurationService,
        private gitService: GitService,
        private context: vscode.ExtensionContext
    ) {
        this.aiService = new AIService();
        this.commentViewService = new CommentViewService(context);
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
        const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);

        const line = Math.max(0, comment.line - 1);
        const range = new vscode.Range(line, 0, line, 0);
        
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

        // Show comment in side panel
        await this.commentViewService.showComment(comment, editor);
    }

    clearReviews(): void {
        this.reviewResults = [];
        this._onReviewUpdate.fire();
    }

    dispose(): void {
        this.commentViewService.dispose();
    }
}
