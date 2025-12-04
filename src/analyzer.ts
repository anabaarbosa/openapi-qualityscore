/**
 * Core Analyzer
 * Orchestrates the analysis of OpenAPI specifications
 */

import type { OpenAPISpec, QualityReport, AnalyzerOptions } from "./types.js"
import { parseOpenAPI } from "./parser.js"
import { calculateScores } from "./scorer.js"
import { buildReport } from "./reporter.js"

/**
 * Analyze an OpenAPI specification and generate a quality report
 *
 * @param input - File path, YAML/JSON string content, or parsed OpenAPI object
 * @param options - Analysis options
 * @returns Quality report with scores and improvement suggestions
 *
 * @example
 * ```typescript
 * // From file path
 * const report = await analyzeOpenAPI('./openapi.yaml')
 *
 * // From string content
 * const report = await analyzeOpenAPI(yamlContent, { format: 'yaml' })
 *
 * // From parsed object
 * const report = await analyzeOpenAPI(parsedSpec, { format: 'object' })
 *
 * // With custom options
 * const report = await analyzeOpenAPI('./openapi.yaml', {
 *   weights: { documentation: 40, examples: 10 },
 *   disabledRules: ['external-docs']
 * })
 * ```
 */
export async function analyzeOpenAPI(
  input: string | OpenAPISpec,
  options: AnalyzerOptions = {}
): Promise<QualityReport> {
  // Parse the input
  const { spec, version } = await parseOpenAPI(input, options)

  // Calculate scores
  const scoringResult = calculateScores(spec, options)

  // Build the report
  const report = buildReport(scoringResult, spec, version)

  return report
}

/**
 * Synchronous version of analyzeOpenAPI for when the spec is already parsed
 *
 * @param spec - Parsed OpenAPI specification object
 * @param options - Analysis options
 * @returns Quality report with scores and improvement suggestions
 */
export function analyzeOpenAPISync(
  spec: OpenAPISpec,
  options: AnalyzerOptions = {}
): QualityReport {
  // Validate the spec has required fields
  const version = spec.openapi || spec.swagger || "unknown"

  if (!spec.info?.title) {
    throw new Error("Invalid OpenAPI specification: missing 'info.title'")
  }

  // Calculate scores
  const scoringResult = calculateScores(spec, options)

  // Build the report
  const report = buildReport(scoringResult, spec, version)

  return report
}
