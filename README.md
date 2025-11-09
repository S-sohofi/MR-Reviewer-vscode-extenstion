# MR Reviewer - AI Code Review Extension

An intelligent VSCode extension that performs AI-powered code reviews on your branch changes with support for multiple AI providers (Gemini, Claude, GPT).

## Features

- **Multi-AI Provider Support**: Choose between Google Gemini, Anthropic Claude, or OpenAI GPT
- **Branch Comparison**: Review changes between current branch and base branch (e.g., master)
- **Comprehensive Code Review**: AI analyzes code for bugs, security issues, performance problems, and best practices
- **Custom Rules**: Define your own review criteria
- **Interactive UI**: Dedicated sidebar with three sections:
  - **Branches**: View and switch between current and base branches
  - **Changes**: See all modified files and start reviews
  - **Reviews**: Browse review results and navigate to comments
- **Comment Navigation**: Click on any comment to jump to the exact file and line
- **Real-time Progress**: Track review progress with visual feedback

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Press F5 to open Extension Development Host
4. In the new window, find "MR Reviewer" in the Activity Bar

## Setup

### First Time Setup

1. Click on the MR Reviewer icon in the Activity Bar
2. Select your preferred AI provider (Gemini, Claude, or OpenAI)
3. Enter your API key when prompted

### Getting API Keys

- **Google Gemini**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Anthropic Claude**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
- **OpenAI GPT**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

## Usage

### Basic Workflow

1. **Select Branches**
   - Current branch: Your working branch
   - Base branch: The branch to compare against (default: master)
   - Click on any branch to change it

2. **View Changes**
   - All modified files are listed in the "Changes" section
   - Click on a file to open it
   - See additions/deletions count for each file

3. **Start Review**
   - Click the play button (▶) in the "Changes" section
   - The AI will analyze each changed file
   - Progress is shown in real-time

4. **Review Results**
   - Navigate to the "Reviews" section
   - Files with issues show warning icons
   - Files without issues show check marks
   - Click on any file to expand comments
   - Click on a comment to jump to that line

### Commands

Access these via Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

- `MR Reviewer: Configure API Key` - Update your API key
- `MR Reviewer: Select AI Provider` - Switch AI provider
- `MR Reviewer: Configure Custom Rules` - Set custom review rules
- `MR Reviewer: Start Review` - Begin code review
- `MR Reviewer: Refresh Changes` - Reload changed files

### Custom Rules

Configure custom review rules to enforce your team's coding standards:

1. Run `MR Reviewer: Configure Custom Rules`
2. Enter rules (one per line), for example:
   ```
   All functions must have JSDoc comments
   Check for proper error handling in async functions
   Ensure no console.log statements in production code
   Verify all user inputs are validated
   ```

## Review Criteria

The AI reviews code for:

- **Bugs & Errors**: Potential runtime errors, null pointer exceptions
- **Security**: SQL injection, XSS vulnerabilities, exposed secrets
- **Performance**: Inefficient algorithms, memory leaks
- **Best Practices**: Code smells, anti-patterns
- **Type Safety**: Type-related issues in TypeScript
- **Error Handling**: Missing try-catch blocks, unhandled promises
- **Code Quality**: Complexity, maintainability
- **Custom Rules**: Your team-specific requirements

## Comment Severity Levels

- 🔴 **Error**: Critical issues that must be fixed
- 🟡 **Warning**: Important issues that should be addressed
- 🔵 **Info**: Informational notes for improvement
- 💡 **Suggestion**: Optional improvements and best practices

## Configuration

Settings can be configured in VSCode settings:

```json
{
  "mr-reviewer.aiProvider": "gemini",
  "mr-reviewer.baseBranch": "master",
  "mr-reviewer.customRules": [
    "Check for proper error handling",
    "Ensure all functions have JSDoc comments"
  ]
}
```

## Development

### Building

```bash
npm install
npm run compile
```

### Running

Press F5 in VSCode to launch Extension Development Host

### Packaging

```bash
npm install -g vsce
vsce package
```

## Troubleshooting

### No changes detected
- Ensure you're on a different branch than the base branch
- Check that you have committed changes
- Verify git repository is properly initialized

### API key errors
- Verify your API key is correct
- Check your API quota/credits
- Ensure network connectivity

### Review fails
- Check API key permissions
- Verify the AI provider service is accessible
- Review file size limits (very large files may timeout)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
