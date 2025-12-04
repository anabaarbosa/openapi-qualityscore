/**
 * Report Generator
 * Generates improvement suggestions and final report
 */

import type {
  QualityReport,
  Improvement,
  RuleResult,
  CategoryResult,
  CategoryName,
  Grade,
  Priority,
  SpecMetadata,
  OpenAPISpec,
} from "./types.js"
import { ScoringResult } from "./scorer.js"
import { ALL_RULES } from "./categories/index.js"
import { countOperations, countSchemas } from "./utils/traverse.js"

/**
 * Generate improvement suggestions from rule results
 */
export function generateImprovements(
  ruleResults: RuleResult[],
  categories: Record<CategoryName, CategoryResult>
): Improvement[] {
  const improvements: Improvement[] = []

  for (const result of ruleResults) {
    // Skip rules that passed
    if (result.passed && result.details.failed === 0) continue

    // Find the rule definition for the improvement message
    const ruleDef = ALL_RULES.find((r) => r.id === result.id)
    if (!ruleDef) continue

    // Calculate impact (points that could be gained)
    const impact = result.maxScore - result.score
    if (impact <= 0) continue

    // Determine priority based on impact and category weight
    const categoryWeight = categories[result.category].weight
    const priority = calculatePriority(impact, categoryWeight)

    // Generate message
    let message = ruleDef.improvementMessage
    if (result.details.failed > 0) {
      message += ` (${result.details.failed} of ${result.details.total} items need attention)`
    }

    improvements.push({
      priority,
      category: result.category,
      rule: result.id,
      message,
      impact: Math.round(impact * 100) / 100,
      locations:
        result.details.locations && result.details.locations.length > 0
          ? result.details.locations.slice(0, 10) // Limit to 10 locations
          : undefined,
    })
  }

  // Sort by priority and impact
  improvements.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return b.impact - a.impact
  })

  return improvements
}

function calculatePriority(
  impact: number,
  categoryWeight: number
): Priority {
  // Weight the impact by category importance
  const weightedImpact = impact * (categoryWeight / 100)

  if (weightedImpact >= 1.5) return "high"
  if (weightedImpact >= 0.5) return "medium"
  return "low"
}

/**
 * Generate a summary message for the report
 */
export function generateSummary(
  _score: number,
  grade: Grade,
  improvements: Improvement[]
): string {
  const highPriority = improvements.filter((i) => i.priority === "high").length
  const mediumPriority = improvements.filter(
    (i) => i.priority === "medium"
  ).length

  let summary = ""

  switch (grade) {
    case "A":
      summary =
        "Excellent API specification! Well-documented with comprehensive examples and security definitions."
      break
    case "B":
      summary =
        "Good API specification with minor areas for improvement."
      break
    case "C":
      summary =
        "Fair API specification. Several areas need attention to improve developer experience."
      break
    case "D":
      summary =
        "Poor API specification. Significant improvements are needed for documentation and completeness."
      break
    case "F":
      summary =
        "This API specification lacks essential documentation and examples."
      break
  }

  if (highPriority > 0) {
    summary += ` ${highPriority} high-priority improvement${highPriority > 1 ? "s" : ""} identified.`
  }
  if (mediumPriority > 0) {
    summary += ` ${mediumPriority} medium-priority improvement${mediumPriority > 1 ? "s" : ""} identified.`
  }

  return summary
}

/**
 * Extract metadata from the spec
 */
export function extractMetadata(
  spec: OpenAPISpec,
  version: string
): SpecMetadata {
  return {
    specVersion: version,
    title: spec.info?.title || "Untitled API",
    operationCount: countOperations(spec),
    schemaCount: countSchemas(spec),
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * Build the complete quality report
 */
export function buildReport(
  scoringResult: ScoringResult,
  spec: OpenAPISpec,
  version: string
): QualityReport {
  const improvements = generateImprovements(
    scoringResult.ruleResults,
    scoringResult.categories
  )

  const summary = generateSummary(
    scoringResult.totalScore,
    scoringResult.grade,
    improvements
  )

  const metadata = extractMetadata(spec, version)

  return {
    score: scoringResult.totalScore,
    grade: scoringResult.grade,
    summary,
    categories: scoringResult.categories,
    improvements,
    rules: scoringResult.ruleResults,
    metadata,
  }
}
