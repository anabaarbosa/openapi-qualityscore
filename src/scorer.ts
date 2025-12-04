/**
 * Scoring Engine
 * Calculates scores from rule evaluations
 */

import type {
  OpenAPISpec,
  CategoryResult,
  CategoryName,
  RuleResult,
  RuleEvaluation,
  Grade,
  AnalyzerOptions,
} from "./types.js"
import { getMaxPointsForCategory } from "./categories/index.js"
import {
  evaluateDocumentation,
  evaluateCompleteness,
  evaluateExamples,
  evaluateStructure,
  evaluateSecurity,
} from "./categories/index.js"

export interface ScoringResult {
  totalScore: number
  grade: Grade
  categories: Record<CategoryName, CategoryResult>
  ruleResults: RuleResult[]
}

/**
 * Calculate scores for an OpenAPI spec
 */
export function calculateScores(
  spec: OpenAPISpec,
  options: AnalyzerOptions = {}
): ScoringResult {
  const weights = { ...getDefaultWeights(), ...options.weights }
  const thresholds = { ...getDefaultThresholds(), ...options.thresholds }
  const disabledRules = new Set(options.disabledRules || [])

  // Run all category evaluators
  const evaluations: Record<CategoryName, RuleEvaluation[]> = {
    documentation: evaluateDocumentation(spec),
    completeness: evaluateCompleteness(spec),
    examples: evaluateExamples(spec),
    structure: evaluateStructure(spec),
    security: evaluateSecurity(spec),
  }

  // Filter out disabled rules
  for (const category of Object.keys(evaluations) as CategoryName[]) {
    evaluations[category] = evaluations[category].filter(
      (e) => !disabledRules.has(e.rule.id)
    )
  }

  // Calculate category results
  const categories: Record<CategoryName, CategoryResult> = {} as Record<
    CategoryName,
    CategoryResult
  >

  for (const category of Object.keys(evaluations) as CategoryName[]) {
    categories[category] = calculateCategoryResult(
      evaluations[category],
      weights[category],
      category,
      disabledRules
    )
  }

  // Calculate total score (weighted average)
  const totalScore = Object.values(categories).reduce(
    (sum, cat) => sum + (cat.score * cat.weight) / 100,
    0
  )

  // Determine grade
  const grade = calculateGrade(totalScore, thresholds)

  // Convert evaluations to rule results
  const ruleResults: RuleResult[] = []
  for (const category of Object.keys(evaluations) as CategoryName[]) {
    for (const evaluation of evaluations[category]) {
      ruleResults.push({
        id: evaluation.rule.id,
        category,
        passed: evaluation.earnedPoints >= evaluation.rule.maxPoints * 0.8,
        score: evaluation.earnedPoints,
        maxScore: evaluation.rule.maxPoints,
        details: evaluation.details,
      })
    }
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    grade,
    categories,
    ruleResults,
  }
}

function calculateCategoryResult(
  evaluations: RuleEvaluation[],
  weight: number,
  category: CategoryName,
  _disabledRules: Set<string>
): CategoryResult {
  // Calculate max points excluding disabled rules
  let maxPoints = 0
  for (const evaluation of evaluations) {
    maxPoints += evaluation.rule.maxPoints
  }

  // If all rules are disabled, use the original max
  if (maxPoints === 0) {
    maxPoints = getMaxPointsForCategory(category)
  }

  const earnedPoints = evaluations.reduce(
    (sum, e) => sum + e.earnedPoints,
    0
  )

  const rulesPassed = evaluations.filter(
    (e) => e.earnedPoints >= e.rule.maxPoints * 0.8
  ).length
  const rulesFailed = evaluations.length - rulesPassed

  const score = maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : 100

  return {
    score: Math.round(score * 100) / 100,
    weight,
    earnedPoints: Math.round(earnedPoints * 100) / 100,
    maxPoints,
    rulesPassed,
    rulesFailed,
  }
}

function calculateGrade(
  score: number,
  thresholds: Record<Grade, number>
): Grade {
  if (score >= thresholds.A) return "A"
  if (score >= thresholds.B) return "B"
  if (score >= thresholds.C) return "C"
  if (score >= thresholds.D) return "D"
  return "F"
}

function getDefaultWeights(): Record<CategoryName, number> {
  return {
    documentation: 30,
    completeness: 25,
    examples: 20,
    structure: 15,
    security: 10,
  }
}

function getDefaultThresholds(): Record<Grade, number> {
  return {
    A: 90,
    B: 75,
    C: 60,
    D: 40,
    F: 0,
  }
}
