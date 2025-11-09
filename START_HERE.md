# 🚀 START HERE - Quick Setup Guide

Follow these steps to get your MR Reviewer extension running:

## ✅ Quick Setup (5 minutes)

### Step 1: Install Dependencies
```bash
npm install
```
⏱️ Takes 1-2 minutes

### Step 2: Compile TypeScript
```bash
npm run compile
```
⏱️ Takes 10-30 seconds

### Step 3: Run Extension
1. Open this project in VSCode
2. Press `F5` (or Run → Start Debugging)
3. A new VSCode window will open (Extension Development Host)

### Step 4: Configure AI Provider
In the new window:
1. Click the MR Reviewer icon in the Activity Bar (left sidebar)
2. Click "Configure Now" when prompted
3. Choose AI provider: **Gemini** (recommended for free tier)
4. Enter your API key

### Step 5: Test with Sample Project
```bash
# Create test repository
mkdir D:\test-mr-reviewer
cd D:\test-mr-reviewer

git init
git config user.name "Test User"
git config user.email "test@example.com"

# Create master branch
git checkout -b master
echo "function hello() { console.log('Hello'); }" > test.js
git add .
git commit -m "Initial commit"

# Create feature branch with issues
git checkout -b feature/test
echo "const user = null; user.name.toUpperCase();" >> test.js
git add .
git commit -m "Add code with null pointer issue"
```

### Step 6: Run Your First Review
1. In Extension Development Host, open the test repository
2. Click MR Reviewer icon
3. Click play button (▶) in Changes section
4. Wait for AI to analyze
5. View results in Reviews section!

## 📚 Documentation

- **[INSTALL.md](INSTALL.md)** - Detailed installation and troubleshooting
- **[QUICKSTART.md](QUICKSTART.md)** - Usage guide and tips
- **[FEATURES.md](FEATURES.md)** - Complete feature documentation
- **[README.md](README.md)** - User manual
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Technical overview

## 🔑 Get API Keys (Choose One)

### Option 1: Google Gemini (FREE!)
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key
5. **Free tier**: 60 requests/minute

### Option 2: Anthropic Claude
1. Go to https://console.anthropic.com/
2. Sign up for account
3. Go to API Keys section
4. Create new key
5. **Note**: Requires credit card, but has free credits

### Option 3: OpenAI GPT
1. Go to https://platform.openai.com/api-keys
2. Sign up for account
3. Create new API key
4. **Note**: Pay-as-you-go pricing

**Recommendation**: Start with Gemini (free!)

## ⚡ Development Commands

```bash
# Install dependencies
npm install

# Compile once
npm run compile

# Watch mode (auto-compile on save)
npm run watch

# Lint code
npm run lint

# Package extension
vsce package
```

## 🎯 What to Test

- [ ] Extension activates (look for MR Reviewer icon)
- [ ] Can configure API key
- [ ] Branches section shows current and base branch
- [ ] Changes section lists modified files
- [ ] Start review button works
- [ ] Reviews section shows results
- [ ] Clicking comment navigates to file
- [ ] Can configure custom rules
- [ ] Can switch AI providers

## ❓ Common Issues

### "npm install" fails
```bash
npm cache clean --force
npm install
```

### Extension doesn't activate
1. Check Debug Console (Ctrl+Shift+Y) for errors
2. Rebuild: `npm run compile`
3. Restart: Press F5 again

### No changes detected
- Ensure you're on a different branch than master
- Make sure you have committed changes
- Click refresh button in Changes section

### API call fails
- Verify API key is correct
- Check internet connection
- Ensure API provider has quota available

## 📝 Project Structure

```
src/
├── extension.ts              # Main entry point
├── types.ts                  # Type definitions
├── providers/               # UI components
│   ├── branchesProvider.ts
│   ├── changesProvider.ts
│   └── reviewsProvider.ts
└── services/                # Business logic
    ├── configurationService.ts
    ├── gitService.ts
    ├── aiService.ts
    └── reviewService.ts
```

## 🎨 UI Overview

The extension adds a sidebar with 3 sections:

1. **📂 Branches**
   - Current: Your working branch
   - Base: Branch to compare against (e.g., master)
   - Click to switch branches

2. **📝 Changes**
   - Lists all modified files
   - Shows +/- line counts
   - Play button to start review
   - Refresh button to reload

3. **📋 Reviews**
   - Shows review results per file
   - Expandable comments
   - Click to jump to line
   - Icons show severity

## 💡 Tips

1. **Use watch mode** during development: `npm run watch`
2. **Press Ctrl+R** in Extension Host to reload after changes
3. **Start with Gemini** for free API access
4. **Configure custom rules** for team-specific checks
5. **Review progress** is shown in notification

## 🔧 Customization

Want to customize the review prompt?
→ Edit `src/services/aiService.ts` → `buildReviewPrompt()`

Want to add a new AI provider?
→ Add method in `src/services/aiService.ts` → `callYourProvider()`

Want to add UI features?
→ Create new provider in `src/providers/`

## 📦 Publishing (Optional)

To publish to VSCode Marketplace:

```bash
# Install vsce
npm install -g @vscode/vsce

# Package extension
vsce package

# Publish (requires publisher account)
vsce publish
```

Learn more: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

## 🎉 You're Ready!

1. Run `npm install`
2. Run `npm run compile`
3. Press `F5`
4. Configure API key
5. Start reviewing code!

**Need help?** Check the documentation files in this folder.

**Found a bug?** The extension is fully customizable - edit the source code!

---

**Built with ❤️ using:**
- TypeScript
- VSCode Extension API
- Multiple AI providers (Gemini, Claude, GPT)

**Status**: ✅ Complete and ready to use!
