import * as vscode from 'vscode';
import { BranchesProvider } from './providers/branchesProvider';
import { ChangesProvider } from './providers/changesProvider';
import { ReviewsProvider } from './providers/reviewsProvider';
import { GitService } from './services/gitService';
import { ReviewService } from './services/reviewService';
import { ConfigurationService } from './services/configurationService';

export function activate(context: vscode.ExtensionContext) {
    console.log('MR Reviewer extension is now active');

    const configService = new ConfigurationService(context);
    const gitService = new GitService();
    const reviewService = new ReviewService(configService, gitService);

    const branchesProvider = new BranchesProvider(gitService);
    const changesProvider = new ChangesProvider(gitService, reviewService);
    const reviewsProvider = new ReviewsProvider(reviewService);

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('mr-reviewer-branches', branchesProvider)
    );
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('mr-reviewer-changes', changesProvider)
    );
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('mr-reviewer-reviews', reviewsProvider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mr-reviewer.configureApiKey', async () => {
            await configService.configureApiKey();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mr-reviewer.selectAIProvider', async () => {
            await configService.selectAIProvider();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mr-reviewer.changeBranch', async (item) => {
            if (item.branchType === 'current') {
                await gitService.switchBranch();
                branchesProvider.refresh();
                changesProvider.refresh();
            } else if (item.branchType === 'base') {
                await gitService.selectBaseBranch();
                branchesProvider.refresh();
                changesProvider.refresh();
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mr-reviewer.startReview', async () => {
            const hasApiKey = await configService.hasApiKey();
            if (!hasApiKey) {
                const configure = await vscode.window.showWarningMessage(
                    'API key not configured. Please configure your AI provider API key.',
                    'Configure Now'
                );
                if (configure) {
                    await configService.configureApiKey();
                }
                return;
            }

            const currentType = changesProvider.getCurrentReviewType();
            await reviewService.startReview(currentType);
            reviewsProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mr-reviewer.selectReviewType', async () => {
            const currentType = changesProvider.getCurrentReviewType();
            const options = [
                { label: '$(files) Review all changes', value: 'all', description: 'Review all committed and uncommitted changes' },
                { label: '$(git-commit) Review uncommitted changes', value: 'uncommitted', description: 'Review only uncommitted changes in working directory' },
                { label: '$(git-merge) Review committed changes', value: 'committed', description: 'Review only committed changes vs base branch' }
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: `Current: ${currentType} changes`,
                title: 'Select Review Type'
            });

            if (selected) {
                changesProvider.setReviewType(selected.value as 'uncommitted' | 'committed' | 'all');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mr-reviewer.reviewChanges', async (reviewType?: string) => {
            const hasApiKey = await configService.hasApiKey();
            if (!hasApiKey) {
                const configure = await vscode.window.showWarningMessage(
                    'API key not configured. Please configure your AI provider API key.',
                    'Configure Now'
                );
                if (configure) {
                    await configService.configureApiKey();
                }
                return;
            }

            const type = (reviewType as 'uncommitted' | 'committed' | 'all') || changesProvider.getCurrentReviewType();
            await reviewService.startReview(type);
            reviewsProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mr-reviewer.refreshChanges', () => {
            changesProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mr-reviewer.viewComment', async (item) => {
            if (item.comment) {
                await reviewService.navigateToComment(item.comment);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mr-reviewer.configureRules', async () => {
            await configService.configureCustomRules();
        })
    );

    checkInitialSetup(configService);
}

async function checkInitialSetup(configService: ConfigurationService) {
    const hasApiKey = await configService.hasApiKey();
    if (!hasApiKey) {
        const configure = await vscode.window.showInformationMessage(
            'Welcome to MR Reviewer! Please configure your AI provider API key to get started.',
            'Configure Now',
            'Later'
        );
        if (configure === 'Configure Now') {
            await configService.selectAIProvider();
            await configService.configureApiKey();
        }
    }
}

export function deactivate() {}
