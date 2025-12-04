/**
 * Category Analyzers Index
 * Re-exports all category analyzers and rules
 */

export {
  DOCUMENTATION_RULES,
  evaluateDocumentation,
} from "./documentation.js"

export {
  COMPLETENESS_RULES,
  evaluateCompleteness,
} from "./completeness.js"

export {
  EXAMPLES_RULES,
  evaluateExamples,
} from "./examples.js"

export {
  STRUCTURE_RULES,
  evaluateStructure,
} from "./structure.js"

export {
  SECURITY_RULES,
  evaluateSecurity,
} from "./security.js"

import type { RuleDefinition } from "../types.js"
import { DOCUMENTATION_RULES } from "./documentation.js"
import { COMPLETENESS_RULES } from "./completeness.js"
import { EXAMPLES_RULES } from "./examples.js"
import { STRUCTURE_RULES } from "./structure.js"
import { SECURITY_RULES } from "./security.js"

/**
 * All rules from all categories
 */
export const ALL_RULES: RuleDefinition[] = [
  ...DOCUMENTATION_RULES,
  ...COMPLETENESS_RULES,
  ...EXAMPLES_RULES,
  ...STRUCTURE_RULES,
  ...SECURITY_RULES,
]

/**
 * Get maximum points for a category
 */
export function getMaxPointsForCategory(category: string): number {
  let rules: RuleDefinition[]

  switch (category) {
    case "documentation":
      rules = DOCUMENTATION_RULES
      break
    case "completeness":
      rules = COMPLETENESS_RULES
      break
    case "examples":
      rules = EXAMPLES_RULES
      break
    case "structure":
      rules = STRUCTURE_RULES
      break
    case "security":
      rules = SECURITY_RULES
      break
    default:
      return 0
  }

  return rules.reduce((sum, rule) => sum + rule.maxPoints, 0)
}
