import * as vscode from 'vscode';
import { ReviewComment } from '../types';

export class CommentViewService {
    private currentPanel: vscode.WebviewPanel | undefined;
    private currentDecoration: vscode.TextEditorDecorationType | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(private context: vscode.ExtensionContext) {
        // Clean up on dispose
        this.currentDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            isWholeLine: true,
            overviewRulerColor: new vscode.ThemeColor('editorOverviewRuler.findMatchForeground'),
            overviewRulerLane: vscode.OverviewRulerLane.Center
        });
    }

    async showComment(comment: ReviewComment, editor: vscode.TextEditor): Promise<void> {
        // Highlight the line
        const line = Math.max(0, comment.line - 1);
        const range = new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length);
        editor.setDecorations(this.currentDecoration!, [range]);

        // Create or update webview panel
        if (!this.currentPanel) {
            this.currentPanel = vscode.window.createWebviewPanel(
                'mrReviewerComment',
                'Code Review Comment',
                {
                    viewColumn: vscode.ViewColumn.Beside,
                    preserveFocus: true
                },
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            this.currentPanel.onDidDispose(() => {
                this.currentPanel = undefined;
                this.clearHighlight(editor);
            }, null, this.disposables);

            // Handle messages from webview
            this.currentPanel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'close':
                            this.closePanel();
                            break;
                        case 'copyCode':
                            if (message.code) {
                                vscode.env.clipboard.writeText(message.code);
                                vscode.window.showInformationMessage('Code copied to clipboard');
                            }
                            break;
                    }
                },
                null,
                this.disposables
            );
        }

        // Update panel content
        this.currentPanel.webview.html = this.getWebviewContent(comment, editor);
        this.currentPanel.reveal(vscode.ViewColumn.Beside, true);
    }

    private clearHighlight(editor: vscode.TextEditor): void {
        if (this.currentDecoration) {
            editor.setDecorations(this.currentDecoration, []);
        }
    }

    closePanel(): void {
        if (this.currentPanel) {
            this.currentPanel.dispose();
            this.currentPanel = undefined;
        }
        // Clear highlight from all visible editors
        vscode.window.visibleTextEditors.forEach(editor => {
            this.clearHighlight(editor);
        });
    }

    private getWebviewContent(comment: ReviewComment, editor: vscode.TextEditor): string {
        const severityColors = {
            'error': '#f44336',
            'warning': '#ff9800',
            'info': '#2196f3',
            'suggestion': '#ffc107'
        };

        const severityIcons = {
            'error': '$(error)',
            'warning': '$(warning)',
            'info': '$(info)',
            'suggestion': '$(lightbulb)'
        };

        const color = severityColors[comment.severity] || '#9e9e9e';
        const icon = severityIcons[comment.severity] || '$(comment)';
        
        // Get the code line
        const line = Math.max(0, comment.line - 1);
        const codeLine = editor.document.lineAt(line).text;
        const lineNumber = comment.line;

        // Get context (lines around the issue)
        const contextLines: string[] = [];
        const startLine = Math.max(0, line - 2);
        const endLine = Math.min(editor.document.lineCount - 1, line + 2);
        
        for (let i = startLine; i <= endLine; i++) {
            const lineText = editor.document.lineAt(i).text;
            const lineNum = i + 1;
            const isTargetLine = i === line;
            contextLines.push(`<div class="code-line ${isTargetLine ? 'highlight' : ''}">
                <span class="line-number">${lineNum}</span>
                <span class="line-content">${this.escapeHtml(lineText) || ' '}</span>
            </div>`);
        }

        const suggestionHtml = comment.suggestion 
            ? `<div class="suggestion-section">
                <div class="section-header">
                    <span class="codicon codicon-lightbulb"></span>
                    <strong>Suggested Fix:</strong>
                </div>
                <div class="suggestion-content">
                    <pre><code>${this.escapeHtml(comment.suggestion)}</code></pre>
                    <button class="copy-button" onclick="copyCode()">
                        <span class="codicon codicon-copy"></span> Copy
                    </button>
                </div>
            </div>` 
            : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Review Comment</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 0;
            margin: 0;
            line-height: 1.6;
        }

        .container {
            padding: 16px;
            max-width: 800px;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .severity-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background-color: ${color}20;
            border-left: 4px solid ${color};
            border-radius: 4px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85em;
            color: ${color};
        }

        .close-button {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .close-button:hover {
            opacity: 1;
            background-color: var(--vscode-toolbar-hoverBackground);
        }

        .message-section {
            margin-bottom: 20px;
            padding: 12px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
        }

        .message-section h3 {
            margin: 0 0 8px 0;
            font-size: 1.1em;
            color: var(--vscode-foreground);
        }

        .message-section p {
            margin: 0;
            color: var(--vscode-descriptionForeground);
            font-size: 0.95em;
        }

        .code-section {
            margin-bottom: 20px;
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
            font-weight: 600;
        }

        .code-context {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            overflow: hidden;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }

        .code-line {
            display: flex;
            padding: 4px 0;
            transition: background-color 0.2s;
        }

        .code-line.highlight {
            background-color: ${color}15;
            border-left: 3px solid ${color};
        }

        .line-number {
            display: inline-block;
            min-width: 50px;
            padding: 0 12px;
            text-align: right;
            color: var(--vscode-editorLineNumber-foreground);
            user-select: none;
        }

        .line-content {
            flex: 1;
            padding-right: 12px;
            white-space: pre;
            color: var(--vscode-editor-foreground);
        }

        .suggestion-section {
            margin-top: 20px;
            padding: 12px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            border-left: 4px solid #4caf50;
        }

        .suggestion-content {
            position: relative;
            margin-top: 8px;
        }

        .suggestion-content pre {
            margin: 0;
            padding: 12px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow-x: auto;
        }

        .suggestion-content code {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            color: var(--vscode-editor-foreground);
        }

        .copy-button {
            position: absolute;
            top: 8px;
            right: 8px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 0.85em;
            transition: background-color 0.2s;
        }

        .copy-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .codicon {
            font-family: codicon;
            font-size: 16px;
        }

        .file-info {
            margin-top: 16px;
            padding: 8px 12px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }

        .file-path {
            font-family: var(--vscode-editor-font-family);
            color: var(--vscode-textLink-foreground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="severity-badge">
                <span class="codicon codicon-${comment.severity === 'error' ? 'error' : comment.severity === 'warning' ? 'warning' : comment.severity === 'info' ? 'info' : 'lightbulb'}"></span>
                ${comment.severity}
            </div>
            <button class="close-button" onclick="closePanel()" title="Close panel">
                <span class="codicon codicon-close"></span>
            </button>
        </div>

        <div class="message-section">
            <h3>Issue Description</h3>
            <p>${this.escapeHtml(comment.message)}</p>
        </div>

        <div class="code-section">
            <div class="section-header">
                <span class="codicon codicon-code"></span>
                <strong>Code Context</strong>
            </div>
            <div class="code-context">
                ${contextLines.join('')}
            </div>
        </div>

        ${suggestionHtml}

        <div class="file-info">
            <strong>File:</strong> <span class="file-path">${this.escapeHtml(comment.filePath)}</span><br>
            <strong>Line:</strong> ${lineNumber}
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function closePanel() {
            vscode.postMessage({ command: 'close' });
        }

        function copyCode() {
            const code = ${JSON.stringify(comment.suggestion || '')};
            vscode.postMessage({ command: 'copyCode', code: code });
        }
    </script>
</body>
</html>`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    dispose(): void {
        this.closePanel();
        this.disposables.forEach(d => d.dispose());
        if (this.currentDecoration) {
            this.currentDecoration.dispose();
        }
    }
}

