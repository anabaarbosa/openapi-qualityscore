/**
 * Structure Category Analyzer
 * Evaluates the organization and naming conventions in the OpenAPI spec
 */

import type {
  OpenAPISpec,
  RuleDefinition,
  RuleEvaluation,
} from "../types.js"
import {
  iterateOperations,
  getOperationId,
} from "../utils/traverse.js"
import {
  analyzeOperationIdConsistency,
  analyzePathNaming,
} from "../utils/naming.js"
import { isReference } from "../types.js"

/**
 * Structure rules
 */
export const STRUCTURE_RULES: RuleDefinition[] = [
  {
    id: "operation-id",
    category: "structure",
    maxPoints: 4,
    description: "All operations have operationId",
    improvementMessage:
      "Add unique operationId to all operations for better code generation and documentation.",
  },
  {
    id: "operation-id-naming",
    category: "structure",
    maxPoints: 2,
    description: "operationIds follow consistent naming conventions",
    improvementMessage:
      "Use consistent naming conventions for operationIds (e.g., camelCase or kebab-case).",
  },
  {
    id: "tags-usage",
    category: "structure",
    maxPoints: 3,
    description: "Operations are grouped with tags",
    improvementMessage:
      "Use tags to group related operations for better organization and documentation.",
  },
  {
    id: "path-naming",
    category: "structure",
    maxPoints: 3,
    description: "Paths follow RESTful naming conventions",
    improvementMessage:
      "Follow RESTful conventions: use lowercase, kebab-case, nouns instead of verbs in paths.",
  },
  {
    id: "component-reuse",
    category: "structure",
    maxPoints: 3,
    description: "Schemas use $ref for reusability",
    improvementMessage:
      "Extract common schemas to components and use $ref to reduce duplication and improve maintainability.",
  },
]

/**
 * Evaluate all structure rules
 */
export function evaluateStructure(spec: OpenAPISpec): RuleEvaluation[] {
  return [
    evaluateOperationId(spec),
    evaluateOperationIdNaming(spec),
    evaluateTagsUsage(spec),
    evaluatePathNaming(spec),
    evaluateComponentReuse(spec),
  ]
}

function evaluateOperationId(spec: OpenAPISpec): RuleEvaluation {
  const rule = STRUCTURE_RULES.find((r) => r.id === "operation-id")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateOperations(spec)) {
    total++
    if (ctx.operation.operationId) {
      passed++
    } else {
      failedLocations.push(`${ctx.method.toUpperCase()} ${ctx.path}`)
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

function evaluateOperationIdNaming(spec: OpenAPISpec): RuleEvaluation {
  const rule = STRUCTURE_RULES.find((r) => r.id === "operation-id-naming")!

  // Collect all operationIds
  const operationIds: string[] = []
  for (const ctx of iterateOperations(spec)) {
    if (ctx.operation.operationId) {
      operationIds.push(ctx.operation.operationId)
    }
  }

  if (operationIds.length === 0) {
    return {
      rule,
      earnedPoints: 0,
      details: {
        total: 0,
        passed: 0,
        failed: 0,
        locations: ["No operationIds defined"],
      },
    }
  }

  const analysis = analyzeOperationIdConsistency(operationIds)
  const score = analysis.consistency * rule.maxPoints

  return {
    rule,
    earnedPoints: Math.round(score * 100) / 100,
    details: {
      total: operationIds.length,
      passed: Math.round(operationIds.length * analysis.consistency),
      failed: Math.round(operationIds.length * (1 - analysis.consistency)),
      locations: analysis.consistent
        ? undefined
        : [`Inconsistent naming - detected ${analysis.convention}`],
    },
  }
}

function evaluateTagsUsage(spec: OpenAPISpec): RuleEvaluation {
  const rule = STRUCTURE_RULES.find((r) => r.id === "tags-usage")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateOperations(spec)) {
    total++
    const tags = ctx.operation.tags || []

    if (tags.length > 0) {
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

function evaluatePathNaming(spec: OpenAPISpec): RuleEvaluation {
  const rule = STRUCTURE_RULES.find((r) => r.id === "path-naming")!
  const paths = Object.keys(spec.paths || {})
  const failedLocations: string[] = []
  let passed = 0

  for (const path of paths) {
    const analysis = analyzePathNaming(path)

    if (analysis.isRestful) {
      passed++
    } else {
      failedLocations.push(`${path}: ${analysis.issues[0]}`)
    }
  }

  const total = paths.length
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

function evaluateComponentReuse(spec: OpenAPISpec): RuleEvaluation {
  const rule = STRUCTURE_RULES.find((r) => r.id === "component-reuse")!

  // Count total schemas defined in components
  const componentSchemas = Object.keys(spec.components?.schemas || {}).length

  // Count $ref usages throughout the spec
  let refCount = 0
  let inlineSchemaCount = 0

  // Check responses for schema refs
  for (const ctx of iterateOperations(spec)) {
    // Check request body
    const requestBody = ctx.operation.requestBody
    if (requestBody) {
      if (isReference(requestBody)) {
        refCount++
      } else {
        const content = requestBody.content || {}
        for (const mediaType of Object.values(content)) {
          if (mediaType.schema) {
            if (isReference(mediaType.schema)) {
              refCount++
            } else {
              inlineSchemaCount++
            }
          }
        }
      }
    }

    // Check responses
    const responses = ctx.operation.responses || {}
    for (const response of Object.values(responses)) {
      if (isReference(response)) {
        refCount++
      } else {
        const content = (response as { content?: Record<string, { schema?: unknown }> }).content || {}
        for (const mediaType of Object.values(content)) {
          if (mediaType.schema) {
            if (isReference(mediaType.schema)) {
              refCount++
            } else {
              inlineSchemaCount++
            }
          }
        }
      }
    }
  }

  // Calculate reuse score
  // Good if: components are defined AND refs are used
  // Bad if: lots of inline schemas without refs
  const totalSchemaUsages = refCount + inlineSchemaCount
  let score = rule.maxPoints

  if (totalSchemaUsages === 0) {
    // No schemas used at all - neutral
    score = rule.maxPoints * 0.5
  } else if (componentSchemas === 0) {
    // No components defined - poor reuse
    score = 0
  } else {
    // Score based on ratio of refs to inline schemas
    const reuseRatio = refCount / totalSchemaUsages
    score = reuseRatio * rule.maxPoints
  }

  const failedLocations: string[] = []
  if (componentSchemas === 0 && inlineSchemaCount > 0) {
    failedLocations.push(
      `${inlineSchemaCount} inline schemas could be extracted to components`
    )
  }

  return {
    rule,
    earnedPoints: Math.round(score * 100) / 100,
    details: {
      total: totalSchemaUsages,
      passed: refCount,
      failed: inlineSchemaCount,
      locations: failedLocations.length > 0 ? failedLocations : undefined,
    },
  }
}
