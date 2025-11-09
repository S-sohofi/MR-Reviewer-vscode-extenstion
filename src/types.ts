export interface FileChange {
    filePath: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
    diff: string;
}

export interface ReviewComment {
    filePath: string;
    line: number;
    severity: 'error' | 'warning' | 'info' | 'suggestion';
    message: string;
    suggestion?: string;
}

export interface ReviewResult {
    filePath: string;
    status: 'pending' | 'reviewing' | 'completed' | 'error';
    comments: ReviewComment[];
    error?: string;
}

export type AIProvider = 'gemini' | 'claude' | 'openai';

export interface AIConfig {
    provider: AIProvider;
    apiKey: string;
}
