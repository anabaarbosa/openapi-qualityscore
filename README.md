# @markov/openapi-quality-scorer

> Get a quality score (0-100) and letter grade (A-F) for your OpenAPI specification

[![npm version](https://badge.fury.io/js/@markov%2Fopenapi-quality-scorer.svg)](https://www.npmjs.com/package/@markov/openapi-quality-scorer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why This Library?

Unlike linters (Spectral, Redocly, etc.) that only report pass/fail rules, this library gives you a **quantifiable quality score** with **actionable improvement suggestions**.

| Feature | Linters (Spectral, etc.) | This Library |
|---------|--------------------------|--------------|
| Numeric Score | :x: | :white_check_mark: 0-100 |
| Letter Grade | :x: | :white_check_mark: A-F |
| Category Breakdown | :x: | :white_check_mark: 5 weighted categories |
| Prioritized Improvements | :x: | :white_check_mark: Impact-sorted |
| Zero Config | :x: Needs ruleset | :white_check_mark: Works immediately |

**Spectral says:** *"You have 47 warnings"*

**This library says:** *"Your API is 72/100 (Grade B). Fix these 3 things to improve by 15 points."*

## Installation

```bash
npm install @markov/openapi-quality-scorer
```

## Quick Start

```typescript
import { analyzeOpenAPISync } from '@markov/openapi-quality-scorer'

const spec = {
  openapi: '3.0.0',
  info: { title: 'My API', version: '1.0.0' },
  paths: { /* ... */ }
}

const report = analyzeOpenAPISync(spec)

console.log(report.score)    // 72
console.log(report.grade)    // "B"
console.log(report.summary)  // "Good API specification with minor areas for improvement."
```

### Async Version (File/URL Support)

```typescript
import { analyzeOpenAPI } from '@markov/openapi-quality-scorer'

// From file path
const report = await analyzeOpenAPI('./openapi.yaml')

// From YAML/JSON string
const report = await analyzeOpenAPI(yamlString, { format: 'yaml' })
```

## Scoring Categories

Your API is scored across 5 weighted categories:

| Category | Weight | What It Measures |
|----------|--------|------------------|
| **Documentation** | 30% | Info descriptions, operation summaries, parameter docs |
| **Completeness** | 25% | Response codes, error responses, request body schemas |
| **Examples** | 20% | Request/response examples, parameter examples |
| **Structure** | 15% | Organization, naming conventions, tags |
| **Security** | 10% | Security schemes, applied security, OAuth scopes |

## Output Structure

```typescript
interface QualityReport {
  score: number          // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  summary: string        // Human-readable summary
  categories: {
    documentation: { score: number, weight: number, rulesPassed: number, rulesFailed: number }
    completeness: { score: number, weight: number, rulesPassed: number, rulesFailed: number }
    examples: { score: number, weight: number, rulesPassed: number, rulesFailed: number }
    structure: { score: number, weight: number, rulesPassed: number, rulesFailed: number }
    security: { score: number, weight: number, rulesPassed: number, rulesFailed: number }
  }
  improvements: Array<{
    priority: 'high' | 'medium' | 'low'
    category: string
    rule: string
    message: string
    impact: number       // Points gained if fixed
    locations?: string[] // Specific paths to fix
  }>
  rules: RuleResult[]    // Detailed per-rule results
  metadata: {
    specVersion: string
    title: string
    operationCount: number
    schemaCount: number
    analyzedAt: string
  }
}
```

## Example Output

```json
{
  "score": 72,
  "grade": "B",
  "summary": "Good API specification with minor areas for improvement. 2 high-priority improvements identified.",
  "categories": {
    "documentation": { "score": 85, "weight": 30, "rulesPassed": 6, "rulesFailed": 2 },
    "completeness": { "score": 70, "weight": 25, "rulesPassed": 3, "rulesFailed": 2 },
    "examples": { "score": 50, "weight": 20, "rulesPassed": 1, "rulesFailed": 2 },
    "structure": { "score": 90, "weight": 15, "rulesPassed": 4, "rulesFailed": 0 },
    "security": { "score": 80, "weight": 10, "rulesPassed": 2, "rulesFailed": 1 }
  },
  "improvements": [
    {
      "priority": "high",
      "category": "documentation",
      "rule": "parameter-description",
      "message": "Add descriptions to all parameters (8 of 12 items need attention)",
      "impact": 5.2,
      "locations": ["GET /users/{id}", "POST /orders", "PUT /products/{sku}"]
    },
    {
      "priority": "high",
      "category": "examples",
      "rule": "response-examples",
      "message": "Add examples to response bodies",
      "impact": 4.0,
      "locations": ["GET /users", "POST /orders"]
    }
  ]
}
```

## Use Cases

- **Quality Dashboards** - Track API quality metrics over time
- **CI/CD Integration** - Fail builds if quality drops below threshold
- **Gamification** - Encourage teams to improve their API scores
- **Stakeholder Reporting** - Communicate quality in terms everyone understands
- **API Reviews** - Quantify improvement during code reviews

### CI/CD Example

```typescript
const report = analyzeOpenAPISync(spec)

if (report.score < 70) {
  console.error(`API quality too low: ${report.score}/100 (${report.grade})`)
  process.exit(1)
}
```

## Configuration

Customize weights, thresholds, and disabled rules:

```typescript
const report = analyzeOpenAPISync(spec, {
  // Adjust category weights (must sum to 100)
  weights: {
    documentation: 40,  // Increase documentation importance
    completeness: 25,
    examples: 15,
    structure: 10,
    security: 10
  },

  // Customize grade thresholds
  thresholds: {
    A: 95,  // Stricter A grade
    B: 80,
    C: 65,
    D: 50,
    F: 0
  },

  // Disable specific rules
  disabledRules: ['operation-description', 'tag-description']
})
```

## API Reference

### `analyzeOpenAPI(input, options?)` - Async

Analyzes an OpenAPI specification from a file path, URL, or string content.

```typescript
// File path
const report = await analyzeOpenAPI('./openapi.yaml')

// String content
const report = await analyzeOpenAPI(yamlContent, { format: 'yaml' })
const report = await analyzeOpenAPI(jsonContent, { format: 'json' })
```

### `analyzeOpenAPISync(spec, options?)` - Sync

Analyzes an already-parsed OpenAPI specification object.

```typescript
const report = analyzeOpenAPISync(specObject)
```

### Options

```typescript
interface AnalyzerOptions {
  format?: 'yaml' | 'json' | 'object'
  weights?: Partial<Record<CategoryName, number>>
  disabledRules?: string[]
  thresholds?: Partial<Record<Grade, number>>
}
```

## Available Rules

### Documentation Rules
- `info-description` - API info has description
- `operation-description` - Operations have descriptions
- `operation-summary` - Operations have summaries
- `parameter-description` - Parameters have descriptions
- `schema-description` - Schemas have descriptions
- `tag-description` - Tags have descriptions
- `response-description` - Responses have descriptions
- `external-docs` - External documentation links

### Completeness Rules
- `response-codes` - Appropriate response codes defined
- `error-responses` - Error responses (4xx, 5xx) defined
- `request-body-schema` - Request bodies have schemas
- `content-types` - Content types specified
- `operation-id` - Operations have unique IDs

### Examples Rules
- `response-examples` - Responses include examples
- `parameter-examples` - Parameters include examples
- `request-body-examples` - Request bodies include examples

### Structure Rules
- `consistent-naming` - Consistent naming conventions
- `tags-used` - Operations use tags
- `path-structure` - Clean path structure

### Security Rules
- `security-schemes` - Security schemes defined
- `security-applied` - Security applied to operations
- `oauth-scopes` - OAuth scopes properly defined

## Grade Thresholds

| Grade | Default Threshold | Meaning |
|-------|-------------------|---------|
| A | >= 90 | Excellent - Well documented, complete |
| B | >= 75 | Good - Minor improvements needed |
| C | >= 60 | Fair - Several areas need attention |
| D | >= 40 | Poor - Significant improvements needed |
| F | < 40 | Failing - Major documentation gaps |

## Requirements

- Node.js >= 18.0.0
- Supports OpenAPI 3.0.x and 3.1.x
- Supports Swagger 2.0 (limited)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/MarkoVcode/openapi-quality-scorer).
