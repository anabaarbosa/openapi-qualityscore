/**
 * OpenAPI Quality Scorer - Type Definitions
 */

// ============================================================================
// Report Types
// ============================================================================

export type Grade = "A" | "B" | "C" | "D" | "F"
export type Priority = "high" | "medium" | "low"
export type CategoryName =
  | "documentation"
  | "completeness"
  | "examples"
  | "structure"
  | "security"

/**
 * Main quality report returned by the analyzer
 */
export interface QualityReport {
  /** Overall score from 0-100 */
  score: number
  /** Letter grade based on score */
  grade: Grade
  /** Human-readable summary of the analysis */
  summary: string
  /** Breakdown by category */
  categories: Record<CategoryName, CategoryResult>
  /** Prioritized list of improvements */
  improvements: Improvement[]
  /** Detailed results for each rule */
  rules: RuleResult[]
  /** Metadata about the analyzed spec */
  metadata: SpecMetadata
}

/**
 * Results for a single scoring category
 */
export interface CategoryResult {
  /** Score for this category (0-100) */
  score: number
  /** Weight of this category in overall score (0-100) */
  weight: number
  /** Points earned in this category */
  earnedPoints: number
  /** Maximum possible points */
  maxPoints: number
  /** Number of rules that passed */
  rulesPassed: number
  /** Number of rules that failed or partially failed */
  rulesFailed: number
}

/**
 * A suggested improvement to increase the score
 */
export interface Improvement {
  /** Priority level */
  priority: Priority
  /** Category this improvement belongs to */
  category: CategoryName
  /** Rule ID that triggered this improvement */
  rule: string
  /** Human-readable improvement message */
  message: string
  /** Points that would be gained if this is fixed */
  impact: number
  /** Specific locations that need fixing (e.g., "GET /pets/{id}") */
  locations?: string[]
}

/**
 * Detailed result for a single rule
 */
export interface RuleResult {
  /** Rule identifier (e.g., "operation-description") */
  id: string
  /** Category this rule belongs to */
  category: CategoryName
  /** Whether the rule fully passed */
  passed: boolean
  /** Points earned for this rule */
  score: number
  /** Maximum points for this rule */
  maxScore: number
  /** Detailed breakdown */
  details: RuleDetails
}

/**
 * Detailed breakdown of rule evaluation
 */
export interface RuleDetails {
  /** Total items checked */
  total: number
  /** Items that passed */
  passed: number
  /** Items that failed */
  failed: number
  /** Specific locations that failed */
  locations?: string[]
}

/**
 * Metadata about the analyzed specification
 */
export interface SpecMetadata {
  /** OpenAPI version (e.g., "3.0.3", "3.1.0", "2.0") */
  specVersion: string
  /** API title from info object */
  title: string
  /** Number of operations in the spec */
  operationCount: number
  /** Number of schemas defined */
  schemaCount: number
  /** ISO timestamp of analysis */
  analyzedAt: string
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Options for the analyzer
 */
export interface AnalyzerOptions {
  /** Input format when passing string content */
  format?: "yaml" | "json" | "object"
  /** Custom weights for categories (must sum to 100) */
  weights?: Partial<Record<CategoryName, number>>
  /** Rules to disable */
  disabledRules?: string[]
  /** Custom grade thresholds */
  thresholds?: Partial<Record<Grade, number>>
}

/**
 * Default category weights
 */
export const DEFAULT_WEIGHTS: Record<CategoryName, number> = {
  documentation: 30,
  completeness: 25,
  examples: 20,
  structure: 15,
  security: 10,
}

/**
 * Default grade thresholds
 */
export const DEFAULT_THRESHOLDS: Record<Grade, number> = {
  A: 90,
  B: 75,
  C: 60,
  D: 40,
  F: 0,
}

// ============================================================================
// Rule Definition Types
// ============================================================================

/**
 * Definition of a scoring rule
 */
export interface RuleDefinition {
  /** Unique rule identifier */
  id: string
  /** Category this rule belongs to */
  category: CategoryName
  /** Maximum points for this rule */
  maxPoints: number
  /** Human-readable description */
  description: string
  /** Message template for improvement suggestion */
  improvementMessage: string
}

/**
 * Result from running a single rule
 */
export interface RuleEvaluation {
  /** The rule that was evaluated */
  rule: RuleDefinition
  /** Points earned */
  earnedPoints: number
  /** Evaluation details */
  details: RuleDetails
}

// ============================================================================
// OpenAPI Types (simplified for our purposes)
// ============================================================================

export interface OpenAPISpec {
  openapi?: string
  swagger?: string
  info: {
    title: string
    description?: string
    version: string
  }
  externalDocs?: {
    description?: string
    url: string
  }
  servers?: Array<{
    url: string
    description?: string
  }>
  tags?: Array<{
    name: string
    description?: string
  }>
  paths?: Record<string, PathItem>
  components?: {
    schemas?: Record<string, SchemaObject>
    securitySchemes?: Record<string, SecurityScheme>
    parameters?: Record<string, ParameterObject>
    requestBodies?: Record<string, RequestBodyObject>
    responses?: Record<string, ResponseObject>
    examples?: Record<string, ExampleObject>
  }
  security?: SecurityRequirement[]
}

export interface PathItem {
  summary?: string
  description?: string
  get?: OperationObject
  post?: OperationObject
  put?: OperationObject
  delete?: OperationObject
  patch?: OperationObject
  options?: OperationObject
  head?: OperationObject
  trace?: OperationObject
  parameters?: ParameterObject[]
}

export interface OperationObject {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: ParameterObject[]
  requestBody?: RequestBodyObject | ReferenceObject
  responses?: Record<string, ResponseObject | ReferenceObject>
  security?: SecurityRequirement[]
  externalDocs?: {
    description?: string
    url: string
  }
}

export interface ParameterObject {
  name: string
  in: "query" | "header" | "path" | "cookie"
  description?: string
  required?: boolean
  schema?: SchemaObject | ReferenceObject
  example?: unknown
  examples?: Record<string, ExampleObject | ReferenceObject>
}

export interface RequestBodyObject {
  description?: string
  required?: boolean
  content?: Record<string, MediaTypeObject>
}

export interface ResponseObject {
  description?: string
  content?: Record<string, MediaTypeObject>
  headers?: Record<string, HeaderObject | ReferenceObject>
}

export interface MediaTypeObject {
  schema?: SchemaObject | ReferenceObject
  example?: unknown
  examples?: Record<string, ExampleObject | ReferenceObject>
}

export interface SchemaObject {
  type?: string
  format?: string
  description?: string
  properties?: Record<string, SchemaObject | ReferenceObject>
  items?: SchemaObject | ReferenceObject
  example?: unknown
  examples?: unknown[]
  $ref?: string
  allOf?: Array<SchemaObject | ReferenceObject>
  oneOf?: Array<SchemaObject | ReferenceObject>
  anyOf?: Array<SchemaObject | ReferenceObject>
}

export interface ReferenceObject {
  $ref: string
}

export interface ExampleObject {
  summary?: string
  description?: string
  value?: unknown
  externalValue?: string
}

export interface HeaderObject {
  description?: string
  schema?: SchemaObject | ReferenceObject
}

export interface SecurityScheme {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect"
  description?: string
  name?: string
  in?: "query" | "header" | "cookie"
  scheme?: string
  flows?: OAuthFlows
}

export interface OAuthFlows {
  implicit?: OAuthFlow
  password?: OAuthFlow
  clientCredentials?: OAuthFlow
  authorizationCode?: OAuthFlow
}

export interface OAuthFlow {
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>
}

export type SecurityRequirement = Record<string, string[]>

// ============================================================================
// Utility Types
// ============================================================================

export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head"
  | "trace"

export const HTTP_METHODS: HttpMethod[] = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
  "trace",
]

/**
 * Type guard to check if an object is a reference
 */
export function isReference(obj: unknown): obj is ReferenceObject {
  return typeof obj === "object" && obj !== null && "$ref" in obj
}
