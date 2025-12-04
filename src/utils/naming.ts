/**
 * Naming Convention Utilities
 * Helpers for checking naming patterns and conventions
 */

/**
 * Common naming conventions
 */
export type NamingConvention =
  | "camelCase"
  | "PascalCase"
  | "snake_case"
  | "kebab-case"
  | "unknown"

/**
 * Detect the naming convention of a string
 */
export function detectNamingConvention(str: string): NamingConvention {
  if (!str || str.length === 0) return "unknown"

  // Check for kebab-case (contains hyphens)
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(str)) {
    return "kebab-case"
  }

  // Check for snake_case (contains underscores)
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(str)) {
    return "snake_case"
  }

  // Check for PascalCase (starts with uppercase)
  if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) {
    return "PascalCase"
  }

  // Check for camelCase (starts with lowercase, contains uppercase)
  if (/^[a-z][a-zA-Z0-9]*$/.test(str) && /[A-Z]/.test(str)) {
    return "camelCase"
  }

  // If all lowercase with no separators, consider it camelCase
  if (/^[a-z][a-z0-9]*$/.test(str)) {
    return "camelCase"
  }

  return "unknown"
}

/**
 * Check if operationIds follow a consistent naming convention
 * Returns the detected convention and consistency score
 */
export function analyzeOperationIdConsistency(
  operationIds: string[]
): {
  convention: NamingConvention
  consistent: boolean
  consistency: number
} {
  if (operationIds.length === 0) {
    return { convention: "unknown", consistent: true, consistency: 1 }
  }

  // Detect convention for each operationId
  const conventions = operationIds.map(detectNamingConvention)

  // Count occurrences of each convention
  const counts = new Map<NamingConvention, number>()
  for (const conv of conventions) {
    counts.set(conv, (counts.get(conv) || 0) + 1)
  }

  // Find the most common convention
  let maxCount = 0
  let dominantConvention: NamingConvention = "unknown"
  for (const [conv, count] of counts) {
    if (count > maxCount && conv !== "unknown") {
      maxCount = count
      dominantConvention = conv
    }
  }

  // Calculate consistency (percentage matching dominant convention)
  const knownCount = conventions.filter((c) => c !== "unknown").length
  const consistency = knownCount > 0 ? maxCount / knownCount : 1

  return {
    convention: dominantConvention,
    consistent: consistency >= 0.8,
    consistency,
  }
}

/**
 * Check if a path follows RESTful naming conventions
 */
export interface PathAnalysis {
  isRestful: boolean
  issues: string[]
}

export function analyzePathNaming(path: string): PathAnalysis {
  const issues: string[] = []

  // Split path into segments (excluding path parameters)
  const segments = path
    .split("/")
    .filter((s) => s && !s.startsWith("{"))

  for (const segment of segments) {
    // Check for verbs in path (anti-pattern)
    const verbs = [
      "get",
      "create",
      "update",
      "delete",
      "remove",
      "add",
      "fetch",
      "retrieve",
      "list",
    ]
    const lowerSegment = segment.toLowerCase()
    for (const verb of verbs) {
      if (lowerSegment.includes(verb)) {
        issues.push(
          `Path segment "${segment}" contains verb "${verb}" - use HTTP methods instead`
        )
        break
      }
    }

    // Check for uppercase (should be lowercase or kebab-case)
    if (/[A-Z]/.test(segment)) {
      issues.push(
        `Path segment "${segment}" contains uppercase - use lowercase or kebab-case`
      )
    }

    // Check for underscores (prefer kebab-case)
    if (segment.includes("_")) {
      issues.push(
        `Path segment "${segment}" uses underscores - prefer kebab-case`
      )
    }
  }

  return {
    isRestful: issues.length === 0,
    issues,
  }
}

/**
 * Check if paths follow consistent naming patterns
 */
export function analyzePathConsistency(paths: string[]): {
  consistent: boolean
  issues: string[]
} {
  const allIssues: string[] = []
  let restfulCount = 0

  for (const path of paths) {
    const analysis = analyzePathNaming(path)
    if (analysis.isRestful) {
      restfulCount++
    }
    allIssues.push(...analysis.issues)
  }

  const consistency = paths.length > 0 ? restfulCount / paths.length : 1

  return {
    consistent: consistency >= 0.8,
    issues: allIssues,
  }
}

/**
 * Extract resource name from a path (the last non-parameter segment)
 */
export function extractResourceName(path: string): string | null {
  const segments = path.split("/").filter((s) => s)

  // Find the last non-parameter segment
  for (let i = segments.length - 1; i >= 0; i--) {
    if (!segments[i].startsWith("{")) {
      return segments[i]
    }
  }

  return null
}

/**
 * Check if a resource name is plural (basic heuristic)
 */
export function isPlural(word: string): boolean {
  // Simple heuristic - ends with 's' but not 'ss' or 'us'
  if (word.endsWith("ies")) return true
  if (word.endsWith("es") && !word.endsWith("sse")) return true
  if (
    word.endsWith("s") &&
    !word.endsWith("ss") &&
    !word.endsWith("us") &&
    !word.endsWith("is")
  ) {
    return true
  }
  return false
}
