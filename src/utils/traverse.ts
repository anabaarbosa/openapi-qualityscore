/**
 * OpenAPI Traversal Utilities
 * Helpers for iterating over OpenAPI spec elements
 */

import type {
  OpenAPISpec,
  OperationObject,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  MediaTypeObject,
  HttpMethod,
  ReferenceObject,
} from "../types.js"
import { isReference } from "../types.js"

/**
 * Represents an operation with its path and method context
 */
export interface OperationContext {
  path: string
  method: HttpMethod
  operation: OperationObject
  /** Combined path and operation parameters */
  allParameters: ParameterObject[]
}

/**
 * Represents a schema with its location context
 */
export interface SchemaContext {
  name: string
  location: string
  schema: SchemaObject
}

/**
 * Iterate over all operations in the spec
 */
export function* iterateOperations(
  spec: OpenAPISpec
): Generator<OperationContext> {
  const paths = spec.paths || {}
  const methods: HttpMethod[] = [
    "get",
    "post",
    "put",
    "delete",
    "patch",
    "options",
    "head",
    "trace",
  ]

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue

    const pathParameters = pathItem.parameters || []

    for (const method of methods) {
      const operation = pathItem[method]
      if (!operation) continue

      // Combine path-level and operation-level parameters
      const operationParams = operation.parameters || []
      const allParameters = [...pathParameters, ...operationParams].filter(
        (p): p is ParameterObject => !isReference(p)
      )

      yield {
        path,
        method,
        operation,
        allParameters,
      }
    }
  }
}

/**
 * Get the operation ID or generate a fallback identifier
 */
export function getOperationId(ctx: OperationContext): string {
  return (
    ctx.operation.operationId || `${ctx.method.toUpperCase()} ${ctx.path}`
  )
}

/**
 * Count total operations in the spec
 */
export function countOperations(spec: OpenAPISpec): number {
  let count = 0
  for (const _ of iterateOperations(spec)) {
    count++
  }
  return count
}

/**
 * Iterate over all schemas in components
 */
export function* iterateSchemas(
  spec: OpenAPISpec
): Generator<SchemaContext> {
  const schemas = spec.components?.schemas || {}

  for (const [name, schema] of Object.entries(schemas)) {
    if (!schema || isReference(schema)) continue

    yield {
      name,
      location: `#/components/schemas/${name}`,
      schema: schema as SchemaObject,
    }
  }
}

/**
 * Count total schemas in the spec
 */
export function countSchemas(spec: OpenAPISpec): number {
  return Object.keys(spec.components?.schemas || {}).length
}

/**
 * Get all schema properties (flattened from nested schemas)
 */
export interface PropertyContext {
  schemaName: string
  propertyName: string
  property: SchemaObject
  path: string
}

export function* iterateSchemaProperties(
  spec: OpenAPISpec
): Generator<PropertyContext> {
  for (const schemaCtx of iterateSchemas(spec)) {
    yield* iteratePropertiesRecursive(
      schemaCtx.schema,
      schemaCtx.name,
      schemaCtx.location
    )
  }
}

function* iteratePropertiesRecursive(
  schema: SchemaObject,
  schemaName: string,
  basePath: string
): Generator<PropertyContext> {
  const properties = schema.properties || {}

  for (const [propName, prop] of Object.entries(properties)) {
    if (!prop || isReference(prop)) continue

    const propSchema = prop as SchemaObject
    const path = `${basePath}/properties/${propName}`

    yield {
      schemaName,
      propertyName: propName,
      property: propSchema,
      path,
    }

    // Recurse into nested properties
    if (propSchema.properties) {
      yield* iteratePropertiesRecursive(propSchema, schemaName, path)
    }
  }

  // Handle array items
  if (schema.items && !isReference(schema.items)) {
    const itemsSchema = schema.items as SchemaObject
    if (itemsSchema.properties) {
      yield* iteratePropertiesRecursive(
        itemsSchema,
        schemaName,
        `${basePath}/items`
      )
    }
  }
}

/**
 * Iterate over all responses in the spec
 */
export interface ResponseContext {
  operationId: string
  statusCode: string
  response: ResponseObject
}

export function* iterateResponses(
  spec: OpenAPISpec
): Generator<ResponseContext> {
  for (const opCtx of iterateOperations(spec)) {
    const responses = opCtx.operation.responses || {}

    for (const [statusCode, response] of Object.entries(responses)) {
      if (!response || isReference(response)) continue

      yield {
        operationId: getOperationId(opCtx),
        statusCode,
        response: response as ResponseObject,
      }
    }
  }
}

/**
 * Iterate over all request bodies in the spec
 */
export interface RequestBodyContext {
  operationId: string
  requestBody: RequestBodyObject
}

export function* iterateRequestBodies(
  spec: OpenAPISpec
): Generator<RequestBodyContext> {
  for (const opCtx of iterateOperations(spec)) {
    const requestBody = opCtx.operation.requestBody
    if (!requestBody || isReference(requestBody)) continue

    yield {
      operationId: getOperationId(opCtx),
      requestBody: requestBody as RequestBodyObject,
    }
  }
}

/**
 * Iterate over all parameters in the spec
 */
export interface ParameterContext {
  operationId: string
  parameter: ParameterObject
}

export function* iterateParameters(
  spec: OpenAPISpec
): Generator<ParameterContext> {
  for (const opCtx of iterateOperations(spec)) {
    for (const param of opCtx.allParameters) {
      yield {
        operationId: getOperationId(opCtx),
        parameter: param,
      }
    }
  }
}

/**
 * Resolve a $ref to get the actual object
 * Note: Only handles local references (#/...)
 */
export function resolveRef<T>(
  spec: OpenAPISpec,
  ref: ReferenceObject | T
): T | undefined {
  if (!isReference(ref)) {
    return ref
  }

  const refPath = ref.$ref
  if (!refPath.startsWith("#/")) {
    // External references not supported
    return undefined
  }

  const parts = refPath.slice(2).split("/")
  let current: unknown = spec

  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current as T
}

/**
 * Check if an operation has a request body (POST, PUT, PATCH)
 */
export function operationHasRequestBody(method: HttpMethod): boolean {
  return ["post", "put", "patch"].includes(method)
}

/**
 * Get all content types from a media type map
 */
export function getContentTypes(
  content: Record<string, MediaTypeObject> | undefined
): string[] {
  if (!content) return []
  return Object.keys(content)
}

/**
 * Check if a response is an error response (4xx or 5xx)
 */
export function isErrorResponse(statusCode: string): boolean {
  return statusCode.startsWith("4") || statusCode.startsWith("5")
}

/**
 * Check if a response is a success response (2xx)
 */
export function isSuccessResponse(statusCode: string): boolean {
  return statusCode.startsWith("2")
}
