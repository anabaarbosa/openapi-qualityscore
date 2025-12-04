/**
 * Completeness Category Analyzer
 * Evaluates whether all necessary elements are defined in the OpenAPI spec
 */

import type {
  OpenAPISpec,
  RuleDefinition,
  RuleEvaluation,
} from "../types.js"
import {
  iterateOperations,
  iterateResponses,
  iterateRequestBodies,
  iterateParameters,
  getOperationId,
  operationHasRequestBody,
  isErrorResponse,
  getContentTypes,
} from "../utils/traverse.js"

/**
 * Completeness rules
 */
export const COMPLETENESS_RULES: RuleDefinition[] = [
  {
    id: "response-codes",
    category: "completeness",
    maxPoints: 5,
    description: "Operations define multiple response codes (not just 200)",
    improvementMessage:
      "Define multiple response codes for operations including success (2xx), client errors (4xx), and server errors (5xx).",
  },
  {
    id: "error-responses",
    category: "completeness",
    maxPoints: 5,
    description: "4xx/5xx error responses are defined",
    improvementMessage:
      "Add error response definitions (400, 401, 403, 404, 500) to help API consumers handle errors properly.",
  },
  {
    id: "request-body-schema",
    category: "completeness",
    maxPoints: 4,
    description: "POST/PUT/PATCH operations have request body schemas",
    improvementMessage:
      "Add request body schemas to POST, PUT, and PATCH operations to define expected input.",
  },
  {
    id: "response-schema",
    category: "completeness",
    maxPoints: 4,
    description: "Responses have schemas defined",
    improvementMessage:
      "Add response schemas to define the structure of data returned by the API.",
  },
  {
    id: "parameter-types",
    category: "completeness",
    maxPoints: 4,
    description: "Parameters have types and formats defined",
    improvementMessage:
      "Specify types and formats for all parameters to enable proper validation and SDK generation.",
  },
  {
    id: "content-types",
    category: "completeness",
    maxPoints: 3,
    description: "Content-types are explicitly defined",
    improvementMessage:
      "Explicitly define content-types (e.g., application/json) for request and response bodies.",
  },
]

/**
 * Evaluate all completeness rules
 */
export function evaluateCompleteness(spec: OpenAPISpec): RuleEvaluation[] {
  return [
    evaluateResponseCodes(spec),
    evaluateErrorResponses(spec),
    evaluateRequestBodySchema(spec),
    evaluateResponseSchema(spec),
    evaluateParameterTypes(spec),
    evaluateContentTypes(spec),
  ]
}

function evaluateResponseCodes(spec: OpenAPISpec): RuleEvaluation {
  const rule = COMPLETENESS_RULES.find((r) => r.id === "response-codes")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateOperations(spec)) {
    total++
    const responses = ctx.operation.responses || {}
    const responseCodes = Object.keys(responses)

    // Good if there's more than one response code
    if (responseCodes.length > 1) {
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

function evaluateErrorResponses(spec: OpenAPISpec): RuleEvaluation {
  const rule = COMPLETENESS_RULES.find((r) => r.id === "error-responses")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateOperations(spec)) {
    total++
    const responses = ctx.operation.responses || {}
    const responseCodes = Object.keys(responses)

    // Check if any error response (4xx or 5xx) is defined
    const hasErrorResponse = responseCodes.some(isErrorResponse)

    if (hasErrorResponse) {
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

function evaluateRequestBodySchema(spec: OpenAPISpec): RuleEvaluation {
  const rule = COMPLETENESS_RULES.find((r) => r.id === "request-body-schema")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateOperations(spec)) {
    // Only check operations that should have request bodies
    if (!operationHasRequestBody(ctx.method)) continue

    total++
    const requestBody = ctx.operation.requestBody
    if (!requestBody) {
      failedLocations.push(getOperationId(ctx))
      continue
    }

    // Check if request body has content with schema
    // Handle both reference and inline request body
    const content =
      "$ref" in requestBody
        ? undefined
        : (requestBody as { content?: Record<string, { schema?: unknown }> })
            .content

    const hasSchema =
      content &&
      Object.values(content).some((mediaType) => mediaType?.schema)

    if (hasSchema) {
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

function evaluateResponseSchema(spec: OpenAPISpec): RuleEvaluation {
  const rule = COMPLETENESS_RULES.find((r) => r.id === "response-schema")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateResponses(spec)) {
    // Skip responses that typically don't have bodies (204, 304)
    if (ctx.statusCode === "204" || ctx.statusCode === "304") continue

    total++
    const content = ctx.response.content

    // No content defined
    if (!content) {
      // 2xx responses without content are suspicious unless it's 204
      if (ctx.statusCode.startsWith("2")) {
        failedLocations.push(`${ctx.operationId} - ${ctx.statusCode}`)
      } else {
        // Error responses without schemas are less critical
        passed += 0.5
      }
      continue
    }

    // Check if any content type has a schema
    const hasSchema = Object.values(content).some(
      (mediaType) => mediaType?.schema
    )

    if (hasSchema) {
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
      passed: Math.floor(passed),
      failed: total - Math.floor(passed),
      locations: failedLocations.length > 0 ? failedLocations : undefined,
    },
  }
}

function evaluateParameterTypes(spec: OpenAPISpec): RuleEvaluation {
  const rule = COMPLETENESS_RULES.find((r) => r.id === "parameter-types")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateParameters(spec)) {
    total++
    const schema = ctx.parameter.schema

    if (!schema) {
      failedLocations.push(`${ctx.operationId} - ${ctx.parameter.name}`)
      continue
    }

    // Check if schema has type defined (handle references)
    const hasType = "$ref" in schema || (schema as { type?: string }).type

    if (hasType) {
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

function evaluateContentTypes(spec: OpenAPISpec): RuleEvaluation {
  const rule = COMPLETENESS_RULES.find((r) => r.id === "content-types")!
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  // Check request bodies
  for (const ctx of iterateRequestBodies(spec)) {
    total++
    const contentTypes = getContentTypes(ctx.requestBody.content)

    if (contentTypes.length > 0) {
      passed++
    } else {
      failedLocations.push(`${ctx.operationId} - request body`)
    }
  }

  // Check responses
  for (const ctx of iterateResponses(spec)) {
    // Skip responses that typically don't have bodies
    if (ctx.statusCode === "204" || ctx.statusCode === "304") continue

    const content = ctx.response.content
    if (!content) continue // Already checked in response-schema

    total++
    const contentTypes = Object.keys(content)

    if (contentTypes.length > 0) {
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
