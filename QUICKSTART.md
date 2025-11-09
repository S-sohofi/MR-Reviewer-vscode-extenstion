# Quick Start Guide

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Extension
```bash
npm run compile
```

### 3. Run the Extension
- Open this project in VSCode
- Press `F5` to launch Extension Development Host
- A new VSCode window will open with the extension loaded

### 4. Configure AI Provider

In the new window:
1. Look for the MR Reviewer icon in the Activity Bar (left sidebar)
2. Click on it
3. You'll be prompted to configure your AI provider
4. Choose one: Gemini, Claude, or OpenAI
5. Enter your API key

## First Code Review

### 1. Open a Git Repository
- Open any project with a git repository
- Make sure you're on a feature branch (not master/main)

### 2. Make Some Changes
- Modify some files
- Commit your changes
- Keep the branch different from master

### 3. Start Review
1. Go to MR Reviewer sidebar
2. **Branches Section**: Verify current and base branches
3. **Changes Section**: Click the play button (▶) to start review
4. Wait for AI to analyze your code
5. **Reviews Section**: View results and click on comments

## Getting API Keys

### Google Gemini (Free Tier Available)
1. Go to https://makersuite.google.com/app/apikey
2. Create an API key
3. Free tier: 60 requests per minute

### Anthropic Claude
1. Go to https://console.anthropic.com/
2. Sign up and navigate to API Keys
3. Create a new key
4. Requires credit card but has free credits

### OpenAI GPT
1. Go to https://platform.openai.com/api-keys
2. Sign up and create an API key
3. Requires credit card, pay-as-you-go pricing

## Testing the Extension

### Manual Testing Checklist
- [ ] Extension activates without errors
- [ ] Sidebar appears with 3 sections
- [ ] Can configure API key
- [ ] Can switch AI provider
- [ ] Current and base branches display correctly
- [ ] Changed files appear in Changes section
- [ ] Start review button works
- [ ] Review progress shows
- [ ] Comments appear in Reviews section
- [ ] Clicking comment navigates to file/line
- [ ] Can configure custom rules

### Example Project Setup
```bash
# Create a test repository
mkdir test-project
cd test-project
git init
git checkout -b master
echo "console.log('test');" > test.js
git add .
git commit -m "Initial commit"

# Create feature branch with changes
git checkout -b feature/test
echo "const x = null; x.toString();" >> test.js
git add .
git commit -m "Add code with issues"

# Now open in VSCode and run MR Reviewer
```

## Troubleshooting

### Extension doesn't activate
- Check the Debug Console (Ctrl+Shift+Y) for errors
- Ensure all dependencies are installed: `npm install`
- Rebuild: `npm run compile`

### Git extension not found
- Ensure VSCode's built-in Git extension is enabled
- Check a git repository is open in the workspace

### API errors
- Verify API key is correct
- Check internet connection
- Ensure API provider has available quota
- Check API provider status page

### No changes detected
- Ensure you're not on the base branch
- Verify there are committed changes
- Try refreshing changes (refresh button)

## Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Run linter
npm run lint

# Package extension
vsce package
```

## Project Structure

```
MR-Reviewer-vscode-extenstion/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── types.ts                  # Type definitions
│   ├── providers/
│   │   ├── branchesProvider.ts   # Branches tree view
│   │   ├── changesProvider.ts    # Changes tree view
│   │   └── reviewsProvider.ts    # Reviews tree view
│   └── services/
│       ├── configurationService.ts  # API key & settings
│       ├── gitService.ts            # Git operations
│       ├── aiService.ts             # AI provider calls
│       └── reviewService.ts         # Review orchestration
├── resources/
│   └── icon.svg                  # Extension icon
├── package.json                  # Extension manifest
├── tsconfig.json                # TypeScript config
└── README.md                    # Documentation
```

## Next Steps

1. **Customize the prompt**: Edit `aiService.ts` to modify the review prompt
2. **Add more providers**: Extend `aiService.ts` with additional AI providers
3. **Enhance UI**: Modify providers to add more information
4. **Add settings**: Extend `package.json` contributes.configuration
5. **Improve diff parsing**: Enhance `gitService.ts` for better change detection

## Publishing

To publish to VSCode Marketplace:

1. Create a publisher account at https://marketplace.visualstudio.com/
2. Get a Personal Access Token
3. Login: `vsce login <publisher-name>`
4. Publish: `vsce publish`

For more information: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
