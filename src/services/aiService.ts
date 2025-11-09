import axios from "axios";
import { AIProvider, ReviewComment } from "../types";

export class AIService {
	private static readonly CLAUDE_API_URL =
		"https://api.anthropic.com/v1/messages";
	private static readonly OPENAI_API_URL =
		"https://api.openai.com/v1/chat/completions";

	async reviewCode(
		provider: AIProvider,
		apiKey: string,
		filePath: string,
		fileContent: string,
		diffContent: string,
		customRules: string[]
	): Promise<ReviewComment[]> {
		const prompt = this.buildReviewPrompt(
			filePath,
			fileContent,
			diffContent,
			customRules
		);

		try {
			let response: string;

			switch (provider) {
				case "gemini":
					response = await this.callGemini(apiKey, prompt);
					break;
				case "claude":
					response = await this.callClaude(apiKey, prompt);
					break;
				case "openai":
					response = await this.callOpenAI(apiKey, prompt);
					break;
				default:
					throw new Error(`Unsupported provider: ${provider}`);
			}

			return this.parseReviewResponse(response, filePath);
		} catch (error: any) {
			const errorMessage = this.getDetailedErrorMessage(
				error,
				provider
			);
			throw new Error(`AI Review failed: ${errorMessage}`);
		}
	}

	private getDetailedErrorMessage(error: any, provider: AIProvider): string {
		if (error.response) {
			const status = error.response.status;
			const data = error.response.data;

			switch (status) {
				case 400:
					return `Bad request - Invalid API key or request format for ${provider}`;
				case 401:
					return `Unauthorized - Invalid API key for ${provider}`;
				case 403:
					return `Forbidden - API key doesn't have access to this ${provider} service`;
				case 404:
					return `Not Found - API endpoint doesn't exist. Your ${provider} API key might be for a different region or the model is unavailable`;
				case 429:
					return `Rate limit exceeded for ${provider}. Please wait and try again`;
				case 500:
				case 502:
				case 503:
					return `${provider} service is temporarily unavailable. Please try again later`;
				default:
					return `${error.message} (Status: ${status})`;
			}
		}

		if (error.code === "ENOTFOUND") {
			return `Network error - Cannot reach ${provider} API. Check your internet connection`;
		}

		return error.message || "Unknown error occurred";
	}

	private buildReviewPrompt(
		filePath: string,
		fileContent: string,
		diffContent: string,
		customRules: string[]
	): string {
		const rulesSection =
			customRules.length > 0
				? `\n\nCUSTOM REVIEW RULES:\n${customRules
						.map((r, i) => `${i + 1}. ${r}`)
						.join("\n")}`
				: "";

		return `You are an expert code reviewer. Review the following code changes and provide detailed feedback.

FILE: ${filePath}

CURRENT FILE CONTENT:
\`\`\`
${fileContent}
\`\`\`

CHANGES (Git Diff):
\`\`\`diff
${diffContent}
\`\`\`
${rulesSection}

REVIEW INSTRUCTIONS:
1. Analyze the changes in the context of the full file
2. Look for:
   - Bugs and potential runtime errors
   - Security vulnerabilities
   - Performance issues
   - Code smells and anti-patterns
   - Best practice violations
   - Missing error handling
   - Type safety issues
   - Memory leaks or resource management issues
   - Accessibility concerns (for UI code)
   - Thread safety issues (if applicable)
3. Consider the overall code quality and maintainability
4. Check if custom rules are followed (if provided)
5. Be specific about line numbers and provide actionable suggestions

RESPONSE FORMAT:
Return your review as a JSON array of comments. Each comment must have:
- line: the line number in the file (integer)
- severity: one of "error", "warning", "info", "suggestion"
- message: clear description of the issue
- suggestion: (optional) specific code suggestion or fix

Example:
[
  {
    "line": 42,
    "severity": "error",
    "message": "Potential null pointer exception when accessing user.name without null check",
    "suggestion": "Add null check: if (user && user.name) { ... }"
  },
  {
    "line": 58,
    "severity": "warning",
    "message": "This function has high cyclomatic complexity (15). Consider refactoring into smaller functions."
  }
]

IMPORTANT:
- Only return the JSON array, no additional text
- If there are no issues, return an empty array: []
- Be thorough but focus on meaningful issues
- Provide line numbers that correspond to the current file content`;
	}

	private async callGemini(apiKey: string, prompt: string): Promise<string> {
		try {
			const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
			
			const response = await axios.post(
				url,
				{
					contents: [
						{
							parts: [
								{
									text: prompt
								}
							]
						}
					],
					generationConfig: {
						temperature: 0.2,
						maxOutputTokens: 8192
					},
				},
				{
					headers: {
						"Content-Type": "application/json"
					},
					timeout: 60000 // 60 second timeout
				}
			);

			if (!response.data?.candidates || response.data.candidates.length === 0) {
				throw new Error("No response from Gemini API");
			}

			const text = response.data.candidates[0].content.parts[0].text;
			
			if (!text) {
				throw new Error("Empty response from Gemini API");
			}

			return text;
		} catch (error: any) {
			// Log the full error for debugging
			console.error("Gemini API Error:", error);
			console.error("Error details:", error.response?.data || error.message);
			
			if (error.response) {
				const status = error.response.status;
				const errorData = error.response.data;
				
				if (status === 400) {
					if (errorData?.error?.message?.includes("API_KEY_INVALID")) {
						throw new Error("Invalid Gemini API key. Please verify your API key and try again");
					}
					throw new Error(`Bad request: ${errorData?.error?.message || "Invalid request format"}`);
				}
				
				if (status === 403) {
					throw new Error("Gemini API access denied. Please check your API key permissions");
				}
				
				if (status === 404) {
					throw new Error("Gemini API endpoint not found. The model might be unavailable");
				}
				
				if (status === 429) {
					throw new Error("Gemini API rate limit exceeded. Please wait and try again");
				}
			}
			
			if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
				throw new Error("Request timeout. The API is taking too long to respond. Try again later");
			}
			
			if (error.code === "ENOTFOUND" || error.message?.includes("fetch failed")) {
				throw new Error("Network error connecting to Gemini API. Check your internet connection or firewall settings");
			}
			
			throw error;
		}
	}

	private async callClaude(apiKey: string, prompt: string): Promise<string> {
		const response = await axios.post(
			AIService.CLAUDE_API_URL,
			{
				model: "claude-3-5-sonnet-20241022",
				max_tokens: 4096,
				temperature: 0.2,
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
			},
			{
				headers: {
					"Content-Type": "application/json",
					"x-api-key": apiKey,
					"anthropic-version": "2023-06-01",
				},
			}
		);

		return response.data.content[0].text;
	}

	private async callOpenAI(apiKey: string, prompt: string): Promise<string> {
		const response = await axios.post(
			AIService.OPENAI_API_URL,
			{
				model: "gpt-4o-mini",
				messages: [
					{
						role: "system",
						content: "You are an expert code reviewer. Provide thorough, actionable code reviews in JSON format.",
					},
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: 0.2,
				max_tokens: 8192,
				response_format: { type: "json_object" },
			},
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
			}
		);

		return response.data.choices[0].message.content;
	}

	private parseReviewResponse(
		response: string,
		filePath: string
	): ReviewComment[] {
		try {
			// Try to parse as direct JSON first
			let comments: any;

			try {
				const parsed = JSON.parse(response);
				// Handle different response formats
				if (Array.isArray(parsed)) {
					comments = parsed;
				} else if (
					parsed.comments &&
					Array.isArray(parsed.comments)
				) {
					comments = parsed.comments;
				} else if (
					parsed.reviews &&
					Array.isArray(parsed.reviews)
				) {
					comments = parsed.reviews;
				} else {
					// If it's an object with a single array property, use that
					const keys = Object.keys(parsed);
					if (
						keys.length === 1 &&
						Array.isArray(parsed[keys[0]])
					) {
						comments = parsed[keys[0]];
					}
				}
			} catch (e) {
				// If direct parsing fails, try to extract JSON array
				const jsonMatch = response.match(/\[[\s\S]*\]/);
				if (!jsonMatch) {
					console.warn(
						"No JSON found in response, returning empty array"
					);
					return [];
				}
				comments = JSON.parse(jsonMatch[0]);
			}

			if (!comments || !Array.isArray(comments)) {
				console.warn(
					"Response is not an array, returning empty array"
				);
				return [];
			}

			return comments
				.filter((c) => c.line && c.severity && c.message)
				.map((c) => ({
					filePath,
					line: Number(c.line),
					severity: c.severity,
					message: c.message,
					suggestion: c.suggestion,
				}));
		} catch (error) {
			console.error("Failed to parse AI response:", error);
			console.error("Response was:", response);
			return [];
		}
	}
}
