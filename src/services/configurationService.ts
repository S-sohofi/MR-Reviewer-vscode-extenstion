import * as vscode from 'vscode';
import { AIProvider, AIConfig } from '../types';

export class ConfigurationService {
    private static readonly API_KEY_PREFIX = 'mr-reviewer.apiKey';

    constructor(private context: vscode.ExtensionContext) {}

    async hasApiKey(): Promise<boolean> {
        const provider = this.getAIProvider();
        const apiKey = await this.context.secrets.get(`${ConfigurationService.API_KEY_PREFIX}.${provider}`);
        return !!apiKey;
    }

    async getAIConfig(): Promise<AIConfig> {
        const provider = this.getAIProvider();
        const apiKey = await this.context.secrets.get(`${ConfigurationService.API_KEY_PREFIX}.${provider}`);
        
        if (!apiKey) {
            throw new Error(`API key not configured for ${provider}`);
        }

        return {
            provider,
            apiKey
        };
    }

    async configureApiKey(): Promise<void> {
        const provider = this.getAIProvider();
        const providerName = this.getProviderDisplayName(provider);

        const apiKey = await vscode.window.showInputBox({
            prompt: `Enter your ${providerName} API key`,
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'API key cannot be empty';
                }
                return null;
            }
        });

        if (apiKey) {
            await this.context.secrets.store(`${ConfigurationService.API_KEY_PREFIX}.${provider}`, apiKey.trim());
            vscode.window.showInformationMessage(`${providerName} API key configured successfully!`);
        }
    }

    async selectAIProvider(): Promise<void> {
        const providers: { label: string; value: AIProvider }[] = [
            { label: 'Google Gemini', value: 'gemini' },
            { label: 'Anthropic Claude', value: 'claude' },
            { label: 'OpenAI GPT', value: 'openai' }
        ];

        const selected = await vscode.window.showQuickPick(
            providers.map(p => p.label),
            {
                placeHolder: 'Select AI provider for code review',
                ignoreFocusOut: true
            }
        );

        if (selected) {
            const provider = providers.find(p => p.label === selected)?.value;
            if (provider) {
                const config = vscode.workspace.getConfiguration('mr-reviewer');
                await config.update('aiProvider', provider, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`AI provider set to ${selected}`);
            }
        }
    }

    getAIProvider(): AIProvider {
        const config = vscode.workspace.getConfiguration('mr-reviewer');
        return config.get<AIProvider>('aiProvider', 'gemini');
    }

    getCustomRules(): string[] {
        const config = vscode.workspace.getConfiguration('mr-reviewer');
        return config.get<string[]>('customRules', []);
    }

    async configureCustomRules(): Promise<void> {
        const currentRules = this.getCustomRules();
        const rulesText = currentRules.join('\n');

        const newRulesText = await vscode.window.showInputBox({
            prompt: 'Enter custom review rules (one per line)',
            value: rulesText,
            ignoreFocusOut: true,
            placeHolder: 'e.g., Check for proper error handling\nEnsure all functions have JSDoc comments',
            validateInput: (value) => null
        });

        if (newRulesText !== undefined) {
            const newRules = newRulesText
                .split('\n')
                .map(r => r.trim())
                .filter(r => r.length > 0);
            
            const config = vscode.workspace.getConfiguration('mr-reviewer');
            await config.update('customRules', newRules, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('Custom rules updated successfully!');
        }
    }

    getBaseBranch(): string {
        const config = vscode.workspace.getConfiguration('mr-reviewer');
        return config.get<string>('baseBranch', 'master');
    }

    async setBaseBranch(branch: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('mr-reviewer');
        await config.update('baseBranch', branch, vscode.ConfigurationTarget.Workspace);
    }

    private getProviderDisplayName(provider: AIProvider): string {
        switch (provider) {
            case 'gemini': return 'Google Gemini';
            case 'claude': return 'Anthropic Claude';
            case 'openai': return 'OpenAI GPT';
            default: return provider;
        }
    }
}
