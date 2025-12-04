/**
 * Documentation Category Analyzer
 * Evaluates the quality of documentation in the OpenAPI spec
 */

import type {
  OpenAPISpec,
  RuleDefinition,
  RuleEvaluation,
} from "../types.js"
import {
  iterateOperations,
  iterateParameters,
  iterateSchemaProperties,
  iterateResponses,
  getOperationId,
} from "../utils/traverse.js"

/**
 * Documentation rules
 */
export const DOCUMENTATION_RULES: RuleDefinition[] = [
  {
    id: "info-description",
    category: "documentation",
    maxPoints: 3,
    description: "Info object has a meaningful description (>50 characters)",
    improvementMessage:
      "Add a detailed description to the API info section explaining what the API does and how to use it.",
  },
  {
    id: "operation-description",
    category: "documentation",
    maxPoints: 5,
    description: "Operations have descriptions",
    improvementMessage:
      "Add descriptions to operations explaining what they do, expected inputs, and outputs.",
  },
  {
    id: "operation-summary",
    category: "documentation",
    maxPoints: 3,
    description: "Operations have summaries",
    improvementMessage:
      "Add short summaries to operations for quick reference.",
  },
  {
    id: "parameter-description",
    category: "documentation",
    maxPoints: 5,
    description: "Parameters have descriptions",
    improvementMessage:
      "Add descriptions to parameters explaining their purpose and accepted values.",
  },
  {
    id: "schema-description",
    category: "documentation",
    maxPoints: 5,
    description: "Schema properties have descriptions",
    improvementMessage:
      "Add descriptions to schema properties to help developers understand the data model.",
  },
  {
    id: "tag-description",
    category: "documentation",
    maxPoints: 3,
    description: "Tags have descriptions",
    improvementMessage:
      "Add descriptions to tags to explain the grouping of operations.",
  },
  {
    id: "response-description",
    category: "documentation",
    maxPoints: 3,
    description: "Responses have descriptions",
    improvementMessage:
      "Add descriptions to responses explaining what each status code means.",
  },
  {
    id: "external-docs",
    category: "documentation",
    maxPoints: 3,
    description: "External documentation links are provided",
    improvementMessage:
      "Add external documentation links to provide additional context and resources.",
  },
]

/**
 * Evaluate all documentation rules
 */
export function evaluateDocumentation(spec: OpenAPISpec): RuleEvaluation[] {
  return [
    evaluateInfoDescription(spec),
    evaluateOperationDescription(spec),
    evaluateOperationSummary(spec),
    evaluateParameterDescription(spec),
    evaluateSchemaDescription(spec),
    evaluateTagDescription(spec),
    evaluateResponseDescription(spec),
    evaluateExternalDocs(spec),
  ]
}

function evaluateInfoDescription(spec: OpenAPISpec): RuleEvaluation {
  const rule = DOCUMENTATION_RULES.find((r) => r.id === "info-description")!
  const description = spec.info?.description || ""
  const hasDescription = description.length >= 50

  return {
    rule,
    earnedPoints: hasDescription ? rule.maxPoints : 0,
    details: {
      total: 1,
      passed: hasDescription ? 1 : 0,
      failed: hasDescription ? 0 : 1,
      locations: hasDescription ? undefined : ["info.description"],
    },
  }
}

function evaluateOperationDescription(spec: OpenAPISpec): RuleEvaluation {
  const rule = DOCUMENTATION_RULES.find(
    (r) => r.id === "operation-description"
  )!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateOperations(spec)) {
    total++
    if (ctx.operation.description && ctx.operation.description.length > 0) {
      passed++
    } else {
      failedLocations.push(getOperationId(ctx))
    }
  }

  const score = total > 0 ? (passed / total) * rule.maxPoints : rule.maxPoints

  return {
    rule,
    earnedPoints: Math.round(score * 100) / 100,
    details: {
      total,
      passed,
      failed: total - passed,
      locations: failedLocations.length > 0 ? failedLocations : undefined,
    },
  }
}

function evaluateOperationSummary(spec: OpenAPISpec): RuleEvaluation {
  const rule = DOCUMENTATION_RULES.find((r) => r.id === "operation-summary")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateOperations(spec)) {
    total++
    if (ctx.operation.summary && ctx.operation.summary.length > 0) {
      passed++
    } else {
      failedLocations.push(getOperationId(ctx))
    }
  }

  const score = total > 0 ? (passed / total) * rule.maxPoints : rule.maxPoints

  return {
    rule,
    earnedPoints: Math.round(score * 100) / 100,
    details: {
      total,
      passed,
      failed: total - passed,
      locations: failedLocations.length > 0 ? failedLocations : undefined,
    },
  }
}

function evaluateParameterDescription(spec: OpenAPISpec): RuleEvaluation {
  const rule = DOCUMENTATION_RULES.find(
    (r) => r.id === "parameter-description"
  )!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateParameters(spec)) {
    total++
    if (ctx.parameter.description && ctx.parameter.description.length > 0) {
      passed++
    } else {
      failedLocations.push(`${ctx.operationId} - ${ctx.parameter.name}`)
    }
  }

  const score = total > 0 ? (passed / total) * rule.maxPoints : rule.maxPoints

  return {
    rule,
    earnedPoints: Math.round(score * 100) / 100,
    details: {
      total,
      passed,
      failed: total - passed,
      locations: failedLocations.length > 0 ? failedLocations : undefined,
    },
  }
}

function evaluateSchemaDescription(spec: OpenAPISpec): RuleEvaluation {
  const rule = DOCUMENTATION_RULES.find((r) => r.id === "schema-description")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateSchemaProperties(spec)) {
    total++
    if (ctx.property.description && ctx.property.description.length > 0) {
      passed++
    } else {
      failedLocations.push(`${ctx.schemaName}.${ctx.propertyName}`)
    }
  }

  const score = total > 0 ? (passed / total) * rule.maxPoints : rule.maxPoints

  return {
    rule,
    earnedPoints: Math.round(score * 100) / 100,
    details: {
      total,
      passed,
      failed: total - passed,
      locations: failedLocations.length > 0 ? failedLocations : undefined,
    },
  }
}

function evaluateTagDescription(spec: OpenAPISpec): RuleEvaluation {
  const rule = DOCUMENTATION_RULES.find((r) => r.id === "tag-description")!
  const tags = spec.tags || []
  const failedLocations: string[] = []
  let passed = 0

  for (const tag of tags) {
    if (tag.description && tag.description.length > 0) {
      passed++
    } else {
      failedLocations.push(`tag: ${tag.name}`)
    }
  }

  const total = tags.length
  const score = total > 0 ? (passed / total) * rule.maxPoints : rule.maxPoints

  return {
    rule,
    earnedPoints: Math.round(score * 100) / 100,
    details: {
      total,
      passed,
      failed: total - passed,
      locations: failedLocations.length > 0 ? failedLocations : undefined,
    },
  }
}

function evaluateResponseDescription(spec: OpenAPISpec): RuleEvaluation {
  const rule = DOCUMENTATION_RULES.find(
    (r) => r.id === "response-description"
  )!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateResponses(spec)) {
    total++
    if (ctx.response.description && ctx.response.description.length > 0) {
      passed++
    } else {
      failedLocations.push(`${ctx.operationId} - ${ctx.statusCode}`)
    }
  }

  const score = total > 0 ? (passed / total) * rule.maxPoints : rule.maxPoints

  return {
    rule,
    earnedPoints: Math.round(score * 100) / 100,
    details: {
      total,
      passed,
      failed: total - passed,
      locations: failedLocations.length > 0 ? failedLocations : undefined,
    },
  }
}

function evaluateExternalDocs(spec: OpenAPISpec): RuleEvaluation {
  const rule = DOCUMENTATION_RULES.find((r) => r.id === "external-docs")!

  // Check for external docs at root level or in operations
  let hasExternalDocs = false
  const locations: string[] = []

  if (spec.externalDocs?.url) {
    hasExternalDocs = true
  } else {
    locations.push("root")
  }

  // Also check operations for external docs
  let operationsWithDocs = 0
  let totalOperations = 0
  for (const ctx of iterateOperations(spec)) {
    totalOperations++
    if (ctx.operation.externalDocs?.url) {
      operationsWithDocs++
    }
  }

  // Give full points if root has external docs, or partial if operations have them
  let score = 0
  if (hasExternalDocs) {
    score = rule.maxPoints
  } else if (operationsWithDocs > 0) {
    score = (operationsWithDocs / totalOperations) * rule.maxPoints * 0.5
  }

  return {
    rule,
    earnedPoints: Math.round(score * 100) / 100,
    details: {
      total: 1,
      passed: hasExternalDocs ? 1 : 0,
      failed: hasExternalDocs ? 0 : 1,
      locations: hasExternalDocs ? undefined : locations,
    },
  }
}
