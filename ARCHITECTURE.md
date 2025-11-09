# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension Host                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MR Reviewer Extension                     │
│                      (extension.ts)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌───────────────────────┐       ┌───────────────────────┐
│   UI Layer            │       │   Services Layer       │
│   (Providers)         │       │                        │
│                       │       │                        │
│  ┌─────────────────┐ │       │  ┌─────────────────┐  │
│  │ Branches        │◄├───────┤  │ Configuration   │  │
│  │ Provider        │ │       │  │ Service         │  │
│  └─────────────────┘ │       │  └─────────────────┘  │
│                       │       │                        │
│  ┌─────────────────┐ │       │  ┌─────────────────┐  │
│  │ Changes         │◄├───────┤  │ Git Service     │  │
│  │ Provider        │ │       │  │                 │  │
│  └─────────────────┘ │       │  └─────────────────┘  │
│                       │       │           │            │
│  ┌─────────────────┐ │       │           │            │
│  │ Reviews         │◄├───────┤  ┌────────▼────────┐  │
│  │ Provider        │ │       │  │ Review Service  │  │
│  └─────────────────┘ │       │  │                 │  │
│                       │       │  └────────┬────────┘  │
└───────────────────────┘       │           │            │
                                │  ┌────────▼────────┐  │
                                │  │ AI Service      │  │
                                │  │                 │  │
                                │  └────────┬────────┘  │
                                └───────────┼───────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
            ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
            │ Gemini API    │      │ Claude API    │      │ OpenAI API    │
            │ (Free Tier)   │      │ (Paid)        │      │ (Paid)        │
            └───────────────┘      └───────────────┘      └───────────────┘
```

## Component Interactions

### 1. Extension Activation Flow

```
User Opens VSCode
        │
        ▼
Extension Activates (extension.ts)
        │
        ├─► Initialize Services
        │   ├─► ConfigurationService (API keys, settings)
        │   ├─► GitService (Git operations)
        │   └─► ReviewService (Review orchestration)
        │
        ├─► Register UI Providers
        │   ├─► BranchesProvider (Branch tree view)
        │   ├─► ChangesProvider (Changes tree view)
        │   └─► ReviewsProvider (Reviews tree view)
        │
        ├─► Register Commands
        │   ├─► Configure API Key
        │   ├─► Select AI Provider
        │   ├─► Start Review
        │   └─► Configure Rules
        │
        └─► Check Initial Setup
            └─► Prompt for API key if not configured
```

### 2. Review Process Flow

```
User Clicks "Start Review"
        │
        ▼
ReviewService.startReview()
        │
        ├─► Check API Key Configured
        │   └─► Prompt if missing
        │
        ├─► GitService.getChanges()
        │   ├─► Get current branch
        │   ├─► Get base branch
        │   ├─► Calculate diff
        │   └─► Return FileChange[]
        │
        ├─► For each changed file:
        │   │
        │   ├─► Update status to "reviewing"
        │   │   └─► Fire UI update event
        │   │
        │   ├─► GitService.getFileContent()
        │   │   └─► Read current file content
        │   │
        │   ├─► AIService.reviewCode()
        │   │   ├─► Build review prompt
        │   │   │   ├─► Add file content
        │   │   │   ├─► Add diff
        │   │   │   └─► Add custom rules
        │   │   │
        │   │   ├─► Call AI Provider API
        │   │   │   ├─► Gemini: generativelanguage.googleapis.com
        │   │   │   ├─► Claude: api.anthropic.com
        │   │   │   └─► OpenAI: api.openai.com
        │   │   │
        │   │   └─► Parse JSON response
        │   │       └─► Extract ReviewComment[]
        │   │
        │   └─► Update status to "completed"
        │       └─► Fire UI update event
        │
        └─► Show completion notification
```

### 3. Navigation Flow

```
User Clicks Comment in Reviews Section
        │
        ▼
ReviewService.navigateToComment()
        │
        ├─► Open file at comment.filePath
        │
        ├─► Navigate to line (comment.line)
        │   ├─► Set editor selection
        │   ├─► Reveal range in center
        │   └─► Highlight line (3 seconds)
        │
        └─► Show notification with comment details
            ├─► Severity icon
            ├─► Comment message
            └─► View Suggestion button (if available)
```

## Data Flow

### FileChange Object Flow

```
Git Repository
      │
      ▼ (GitService)
FileChange {
  filePath: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number
  deletions: number
  diff: string
}
      │
      ├─► ChangesProvider (UI display)
      │
      └─► ReviewService (for review)
            │
            ▼ (with file content)
        AIService
```

### ReviewComment Object Flow

```
AI Provider API
      │
      ▼ (AIService)
ReviewComment {
  filePath: string
  line: number
  severity: 'error' | 'warning' | 'info' | 'suggestion'
  message: string
  suggestion?: string
}
      │
      ▼ (ReviewService)
ReviewResult {
  filePath: string
  status: 'pending' | 'reviewing' | 'completed' | 'error'
  comments: ReviewComment[]
  error?: string
}
      │
      ▼
ReviewsProvider (UI display)
```

## Service Responsibilities

### ConfigurationService
**Purpose**: Manage settings and API keys

**Methods**:
- `hasApiKey()` - Check if API key exists
- `getAIConfig()` - Get AI provider and key
- `configureApiKey()` - Show input dialog for key
- `selectAIProvider()` - Show provider selection
- `getCustomRules()` - Get user-defined rules
- `configureCustomRules()` - Edit custom rules
- `getBaseBranch()` - Get base branch name
- `setBaseBranch()` - Update base branch

**Storage**:
- API Keys: VSCode Secret Storage (encrypted)
- Settings: VSCode Configuration (workspace/global)

### GitService
**Purpose**: Interact with Git repository

**Methods**:
- `getCurrentBranch()` - Get active branch name
- `getBaseBranch()` - Get configured base branch
- `switchBranch()` - Show branch picker and switch
- `selectBaseBranch()` - Change base branch for comparison
- `getChanges()` - Get diff between current and base
- `getFileContent()` - Read file from disk
- `getWorkspaceRoot()` - Get repository root path

**Dependencies**:
- VSCode Git Extension API

### AIService
**Purpose**: Communicate with AI providers

**Methods**:
- `reviewCode()` - Send code to AI for review
- `buildReviewPrompt()` - Construct review prompt
- `callGemini()` - Google Gemini API call
- `callClaude()` - Anthropic Claude API call
- `callOpenAI()` - OpenAI GPT API call
- `parseReviewResponse()` - Extract comments from response

**API Endpoints**:
- Gemini: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`
- Claude: `https://api.anthropic.com/v1/messages`
- OpenAI: `https://api.openai.com/v1/chat/completions`

### ReviewService
**Purpose**: Orchestrate review process

**Methods**:
- `startReview()` - Begin reviewing all changes
- `getReviewResults()` - Get current results
- `navigateToComment()` - Jump to comment location
- `clearReviews()` - Reset review state

**Events**:
- `onReviewUpdate` - Fires when review state changes

**State Management**:
- Maintains `ReviewResult[]` array
- Updates UI via EventEmitter
- Manages progress notifications

## Provider Responsibilities

### BranchesProvider
**Purpose**: Display branch information

**Tree Structure**:
```
Branches
├─ Current: feature/my-feature
└─ Base: master
```

**Actions**:
- Click to switch branch

### ChangesProvider
**Purpose**: Display changed files

**Tree Structure**:
```
Changes
├─ 📝 src/component.ts (+15 -3)
├─ ➕ src/newfile.ts (+42 -0)
└─ ❌ src/oldfile.ts (+0 -28)
```

**Actions**:
- Click file to open
- Click play button to start review
- Click refresh to reload changes

### ReviewsProvider
**Purpose**: Display review results

**Tree Structure**:
```
Reviews
├─ 📄 src/component.ts (2 comments)
│  ├─ ❌ Line 42: Null pointer exception
│  └─ ⚠️ Line 58: High complexity
└─ 📄 src/newfile.ts (✓ No issues)
```

**Actions**:
- Click file to expand comments
- Click comment to navigate to line

## Event Flow

### Real-time Updates

```
ReviewService State Change
        │
        ▼
EventEmitter.fire()
        │
        ▼
ReviewsProvider.onReviewUpdate()
        │
        ▼
ReviewsProvider.refresh()
        │
        ▼
VSCode TreeView Updates
        │
        ▼
User Sees Updated UI
```

## API Integration

### Request/Response Flow

**Gemini Example**:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=API_KEY

Request:
{
  "contents": [{
    "parts": [{
      "text": "REVIEW_PROMPT_HERE"
    }]
  }],
  "generationConfig": {
    "temperature": 0.2,
    "maxOutputTokens": 4096
  }
}

Response:
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "[{\"line\": 42, \"severity\": \"error\", ...}]"
      }]
    }
  }]
}
```

**Claude Example**:
```
POST https://api.anthropic.com/v1/messages

Headers:
- Content-Type: application/json
- x-api-key: API_KEY
- anthropic-version: 2023-06-01

Request:
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 4096,
  "temperature": 0.2,
  "messages": [{
    "role": "user",
    "content": "REVIEW_PROMPT_HERE"
  }]
}

Response:
{
  "content": [{
    "text": "[{\"line\": 42, \"severity\": \"error\", ...}]"
  }]
}
```

**OpenAI Example**:
```
POST https://api.openai.com/v1/chat/completions

Headers:
- Content-Type: application/json
- Authorization: Bearer API_KEY

Request:
{
  "model": "gpt-4-turbo-preview",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert code reviewer..."
    },
    {
      "role": "user",
      "content": "REVIEW_PROMPT_HERE"
    }
  ],
  "temperature": 0.2,
  "max_tokens": 4096
}

Response:
{
  "choices": [{
    "message": {
      "content": "[{\"line\": 42, \"severity\": \"error\", ...}]"
    }
  }]
}
```

## Configuration Schema

### package.json Contributions

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "mr-reviewer",
          "title": "MR Reviewer",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "views": {
      "mr-reviewer": [
        { "id": "mr-reviewer-branches", "name": "Branches" },
        { "id": "mr-reviewer-changes", "name": "Changes" },
        { "id": "mr-reviewer-reviews", "name": "Reviews" }
      ]
    },
    "commands": [...],
    "configuration": {
      "properties": {
        "mr-reviewer.aiProvider": {
          "type": "string",
          "enum": ["gemini", "claude", "openai"],
          "default": "gemini"
        },
        "mr-reviewer.customRules": {
          "type": "array",
          "default": []
        },
        "mr-reviewer.baseBranch": {
          "type": "string",
          "default": "master"
        }
      }
    }
  }
}
```

## Security Architecture

### API Key Storage

```
User Enters API Key
        │
        ▼
ConfigurationService.configureApiKey()
        │
        ▼
VSCode Secret Storage API
        │
        ▼
Encrypted Storage
(Platform-specific secure storage)
        │
        ├─► Windows: Credential Manager
        ├─► macOS: Keychain
        └─► Linux: Secret Service API
```

### No Key Exposure

- ✅ Never in settings.json
- ✅ Never in logs
- ✅ Never in error messages
- ✅ Never in git commits
- ✅ Encrypted at rest
- ✅ Per-user storage

## Extension Lifecycle

### Activation
```
VSCode Starts
        │
        ▼
Extension activates (onStartupFinished)
        │
        ▼
activate() function runs
        │
        ├─► Initialize services
        ├─► Register providers
        ├─► Register commands
        └─► Check initial setup
```

### Deactivation
```
VSCode Closes / Extension Disabled
        │
        ▼
deactivate() function runs
        │
        └─► Cleanup (automatic)
```

## Error Handling Strategy

### Layered Error Handling

```
UI Layer (Provider)
  │ Try-Catch
  │ Show notification
  ▼
Service Layer
  │ Try-Catch
  │ Log error
  │ Return error state
  ▼
API Layer
  │ Try-Catch
  │ Parse error response
  │ Throw typed error
  ▼
Network Layer (Axios)
  │ HTTP errors
  └─► Throw
```

## Performance Considerations

### Current Implementation
- Sequential file processing (prevent rate limit)
- Progress notifications (user feedback)
- Cancellable operations (user control)
- Event-driven updates (efficient UI)

### Optimization Opportunities
- Parallel reviews with throttling
- Response caching
- Incremental reviews
- Streaming responses
- Batch API calls

## Testing Strategy

### Manual Testing Areas
1. Extension activation
2. API key configuration
3. Branch operations
4. Change detection
5. Review execution
6. Comment navigation
7. Error scenarios
8. UI responsiveness

### Integration Points to Test
- VSCode Git Extension API
- AI Provider APIs
- Secret Storage API
- Configuration API
- TreeView API
- Command API

## Deployment

### Development
1. `npm install` - Install dependencies
2. `npm run compile` - Build TypeScript
3. `F5` - Launch Extension Host

### Production
1. `vsce package` - Create .vsix
2. Install locally or publish to marketplace
3. Users install from marketplace

## Extension Package

### What Gets Packaged
- `out/` - Compiled JavaScript
- `resources/` - Icons and assets
- `package.json` - Manifest
- `README.md` - Documentation

### What Gets Excluded
- `src/` - TypeScript source
- `node_modules/` - Dependencies (bundled separately)
- `.vscode-test/` - Test files
- `*.map` - Source maps (optional)

See `.vscodeignore` for full list.
