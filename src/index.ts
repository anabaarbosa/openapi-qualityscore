/**
 * OpenAPI Quality Scorer
 *
 * Analyze OpenAPI specifications and provide quality scores
 * with actionable improvement recommendations.
 *
 * @packageDocumentation
 */

// Main exports
export { analyzeOpenAPI, analyzeOpenAPISync } from "./analyzer.js"

// Type exports
export type {
  QualityReport,
  CategoryResult,
  CategoryName,
  Improvement,
  RuleResult,
  RuleDetails,
  SpecMetadata,
  Grade,
  Priority,
  AnalyzerOptions,
  OpenAPISpec,
} from "./types.js"

// Constants
export { DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS } from "./types.js"

// Category exports (for advanced usage)
export {
  evaluateDocumentation,
  evaluateCompleteness,
  evaluateExamples,
  evaluateStructure,
  evaluateSecurity,
  DOCUMENTATION_RULES,
  COMPLETENESS_RULES,
  EXAMPLES_RULES,
  STRUCTURE_RULES,
  SECURITY_RULES,
  ALL_RULES,
} from "./categories/index.js"

// Parser export (for advanced usage)
export { parseOpenAPI } from "./parser.js"

// Utility exports (for advanced usage)
export {
  iterateOperations,
  iterateSchemas,
  iterateResponses,
  iterateParameters,
  iterateRequestBodies,
  countOperations,
  countSchemas,
} from "./utils/traverse.js"
