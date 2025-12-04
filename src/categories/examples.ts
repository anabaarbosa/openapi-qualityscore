/**
 * Examples Category Analyzer
 * Evaluates the presence and quality of examples in the OpenAPI spec
 */

import type {
  OpenAPISpec,
  RuleDefinition,
  RuleEvaluation,
  MediaTypeObject,
} from "../types.js"
import {
  iterateResponses,
  iterateRequestBodies,
  iterateParameters,
  iterateSchemas,
} from "../utils/traverse.js"

/**
 * Examples rules
 */
export const EXAMPLES_RULES: RuleDefinition[] = [
  {
    id: "response-examples",
    category: "examples",
    maxPoints: 6,
    description: "Response objects have examples",
    improvementMessage:
      "Add examples to response objects to help API consumers understand the data format.",
  },
  {
    id: "request-examples",
    category: "examples",
    maxPoints: 5,
    description: "Request bodies have examples",
    improvementMessage:
      "Add examples to request bodies to show what valid input looks like.",
  },
  {
    id: "parameter-examples",
    category: "examples",
    maxPoints: 4,
    description: "Parameters have examples",
    improvementMessage:
      "Add examples to parameters to demonstrate valid values.",
  },
  {
    id: "schema-examples",
    category: "examples",
    maxPoints: 5,
    description: "Schemas have examples",
    improvementMessage:
      "Add examples to schema definitions to illustrate the data model.",
  },
]

/**
 * Evaluate all examples rules
 */
export function evaluateExamples(spec: OpenAPISpec): RuleEvaluation[] {
  return [
    evaluateResponseExamples(spec),
    evaluateRequestExamples(spec),
    evaluateParameterExamples(spec),
    evaluateSchemaExamples(spec),
  ]
}

/**
 * Check if a media type object has examples
 */
function hasExamples(mediaType: MediaTypeObject): boolean {
  // Check for inline example
  if (mediaType.example !== undefined) return true

  // Check for examples map
  if (mediaType.examples && Object.keys(mediaType.examples).length > 0) {
    return true
  }

  // Check schema-level example
  if (mediaType.schema && !("$ref" in mediaType.schema)) {
    if (mediaType.schema.example !== undefined) return true
  }

  return false
}

function evaluateResponseExamples(spec: OpenAPISpec): RuleEvaluation {
  const rule = EXAMPLES_RULES.find((r) => r.id === "response-examples")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateResponses(spec)) {
    // Skip responses that typically don't have bodies
    if (ctx.statusCode === "204" || ctx.statusCode === "304") continue

    const content = ctx.response.content
    if (!content) continue

    total++

    // Check if any content type has examples
    const hasAnyExample = Object.values(content).some(hasExamples)

    if (hasAnyExample) {
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

function evaluateRequestExamples(spec: OpenAPISpec): RuleEvaluation {
  const rule = EXAMPLES_RULES.find((r) => r.id === "request-examples")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateRequestBodies(spec)) {
    const content = ctx.requestBody.content
    if (!content) continue

    total++

    // Check if any content type has examples
    const hasAnyExample = Object.values(content).some(hasExamples)

    if (hasAnyExample) {
      passed++
    } else {
      failedLocations.push(`${ctx.operationId} - request body`)
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

function evaluateParameterExamples(spec: OpenAPISpec): RuleEvaluation {
  const rule = EXAMPLES_RULES.find((r) => r.id === "parameter-examples")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateParameters(spec)) {
    total++

    const param = ctx.parameter

    // Check various ways examples can be defined
    const hasExample =
      param.example !== undefined ||
      (param.examples && Object.keys(param.examples).length > 0) ||
      (param.schema &&
        !("$ref" in param.schema) &&
        param.schema.example !== undefined)

    if (hasExample) {
      passed++
    } else {
      failedLocations.push(`${ctx.operationId} - ${param.name}`)
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

function evaluateSchemaExamples(spec: OpenAPISpec): RuleEvaluation {
  const rule = EXAMPLES_RULES.find((r) => r.id === "schema-examples")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateSchemas(spec)) {
    total++

    const schema = ctx.schema

    // Check if schema has examples
    const hasExample =
      schema.example !== undefined ||
      (schema.examples && schema.examples.length > 0)

    if (hasExample) {
      passed++
    } else {
      failedLocations.push(ctx.name)
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
