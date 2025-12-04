/**
 * Security Category Analyzer
 * Evaluates the security configuration in the OpenAPI spec
 */

import type {
  OpenAPISpec,
  RuleDefinition,
  RuleEvaluation,
  SecurityScheme,
} from "../types.js"
import { iterateOperations, getOperationId } from "../utils/traverse.js"

/**
 * Security rules
 */
export const SECURITY_RULES: RuleDefinition[] = [
  {
    id: "security-schemes",
    category: "security",
    maxPoints: 4,
    description: "Security schemes are defined",
    improvementMessage:
      "Define security schemes in components to specify authentication methods (API key, OAuth2, etc.).",
  },
  {
    id: "security-applied",
    category: "security",
    maxPoints: 4,
    description: "Security is applied to operations",
    improvementMessage:
      "Apply security requirements to operations or globally to protect your API endpoints.",
  },
  {
    id: "security-scopes",
    category: "security",
    maxPoints: 2,
    description: "OAuth scopes are documented (if applicable)",
    improvementMessage:
      "Document OAuth scopes with descriptions to clarify required permissions.",
  },
]

/**
 * Evaluate all security rules
 */
export function evaluateSecurity(spec: OpenAPISpec): RuleEvaluation[] {
  return [
    evaluateSecuritySchemes(spec),
    evaluateSecurityApplied(spec),
    evaluateSecurityScopes(spec),
  ]
}

function evaluateSecuritySchemes(spec: OpenAPISpec): RuleEvaluation {
  const rule = SECURITY_RULES.find((r) => r.id === "security-schemes")!
  const securitySchemes = spec.components?.securitySchemes || {}
  const schemeCount = Object.keys(securitySchemes).length

  // Check if schemes are properly defined
  let validSchemes = 0
  const issues: string[] = []

  for (const [name, scheme] of Object.entries(securitySchemes)) {
    const s = scheme as SecurityScheme
    if (s.type) {
      validSchemes++
      // Check for description
      if (!s.description) {
        issues.push(`${name}: missing description`)
      }
    } else {
      issues.push(`${name}: missing type`)
    }
  }

  const hasSchemes = validSchemes > 0
  const score = hasSchemes ? rule.maxPoints : 0

  return {
    rule,
    earnedPoints: score,
    details: {
      total: schemeCount > 0 ? schemeCount : 1,
      passed: validSchemes,
      failed: schemeCount > 0 ? schemeCount - validSchemes : 1,
      locations: hasSchemes ? undefined : ["components.securitySchemes"],
    },
  }
}

function evaluateSecurityApplied(spec: OpenAPISpec): RuleEvaluation {
  const rule = SECURITY_RULES.find((r) => r.id === "security-applied")!

  // Check for global security
  const globalSecurity = spec.security || []
  const hasGlobalSecurity = globalSecurity.length > 0

  // Check operations for security
  const failedLocations: string[] = []
  let total = 0
  let passed = 0

  for (const ctx of iterateOperations(spec)) {
    total++

    // Operation has security if:
    // 1. It defines its own security
    // 2. Global security is defined (and not overridden with empty array)
    const operationSecurity = ctx.operation.security

    if (operationSecurity !== undefined) {
      // Operation explicitly defines security (or explicitly opts out with [])
      if (operationSecurity.length > 0) {
        passed++
      } else {
        // Empty array means no security - this is intentional opt-out
        // Still count as "considered" but flag it
        failedLocations.push(`${getOperationId(ctx)} (explicitly unsecured)`)
      }
    } else if (hasGlobalSecurity) {
      // Inherits global security
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

function evaluateSecurityScopes(spec: OpenAPISpec): RuleEvaluation {
  const rule = SECURITY_RULES.find((r) => r.id === "security-scopes")!
  const securitySchemes = spec.components?.securitySchemes || {}

  // Find OAuth2 schemes
  const oauthSchemes: Array<{ name: string; scheme: SecurityScheme }> = []
  for (const [name, scheme] of Object.entries(securitySchemes)) {
    const s = scheme as SecurityScheme
    if (s.type === "oauth2") {
      oauthSchemes.push({ name, scheme: s })
    }
  }

  // If no OAuth schemes, this rule is not applicable - give full points
  if (oauthSchemes.length === 0) {
    return {
      rule,
      earnedPoints: rule.maxPoints,
      details: {
        total: 0,
        passed: 0,
        failed: 0,
        locations: undefined,
      },
    }
  }

  // Check each OAuth scheme for scopes
  const failedLocations: string[] = []
  let totalScopes = 0
  let documentedScopes = 0

  for (const { name, scheme } of oauthSchemes) {
    const flows = scheme.flows
    if (!flows) {
      failedLocations.push(`${name}: no flows defined`)
      continue
    }

    // Check all flow types
    const flowTypes = [
      "implicit",
      "password",
      "clientCredentials",
      "authorizationCode",
    ] as const

    for (const flowType of flowTypes) {
      const flow = flows[flowType]
      if (!flow) continue

      const scopes = flow.scopes || {}
      for (const [scopeName, scopeDesc] of Object.entries(scopes)) {
        totalScopes++
        if (scopeDesc && scopeDesc.length > 0) {
          documentedScopes++
        } else {
          failedLocations.push(`${name}.${flowType}.${scopeName}`)
        }
      }
    }
  }

  const score =
    totalScopes > 0
      ? (documentedScopes / totalScopes) * rule.maxPoints
      : rule.maxPoints

  return {
    rule,
    earnedPoints: Math.round(score * 100) / 100,
    details: {
      total: totalScopes,
      passed: documentedScopes,
      failed: totalScopes - documentedScopes,
      locations: failedLocations.length > 0 ? failedLocations : undefined,
    },
  }
}
