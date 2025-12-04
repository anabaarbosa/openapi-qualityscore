/**
 * OpenAPI Specification Parser
 * Handles parsing YAML/JSON files and string content
 */

import { readFile } from "node:fs/promises"
import { parse as parseYaml } from "yaml"
import type { OpenAPISpec } from "./types.js"

export interface ParseOptions {
  /** Force a specific format instead of auto-detecting */
  format?: "yaml" | "json" | "object"
}

export interface ParseResult {
  spec: OpenAPISpec
  version: string
}

/**
 * Parse an OpenAPI specification from various sources
 * @param input - File path, string content, or parsed object
 * @param options - Parse options
 */
export async function parseOpenAPI(
  input: string | OpenAPISpec,
  options: ParseOptions = {}
): Promise<ParseResult> {
  let spec: OpenAPISpec

  if (options.format === "object" || typeof input === "object") {
    spec = input as OpenAPISpec
  } else {
    const content = await resolveContent(input)
    spec = parseContent(content, options.format)
  }

  validateSpec(spec)

  const version = getSpecVersion(spec)

  return { spec, version }
}

/**
 * Resolve input to string content
 * If it looks like a file path, read the file
 * Otherwise treat as raw content
 */
async function resolveContent(input: string): Promise<string> {
  // Check if it looks like a file path
  const isFilePath =
    input.endsWith(".yaml") ||
    input.endsWith(".yml") ||
    input.endsWith(".json") ||
    (input.length < 500 && !input.includes("\n") && !input.startsWith("{"))

  if (isFilePath) {
    try {
      return await readFile(input, "utf-8")
    } catch (error) {
      // If file doesn't exist, maybe it's actually content
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // Check if it looks like actual content
        if (input.includes("openapi") || input.includes("swagger")) {
          return input
        }
        throw new Error(`File not found: ${input}`)
      }
      throw error
    }
  }

  return input
}

/**
 * Parse string content as YAML or JSON
 */
function parseContent(
  content: string,
  format?: "yaml" | "json"
): OpenAPISpec {
  // Auto-detect format if not specified
  const detectedFormat = format || detectFormat(content)

  try {
    if (detectedFormat === "json") {
      return JSON.parse(content) as OpenAPISpec
    } else {
      // YAML parser also handles JSON
      return parseYaml(content) as OpenAPISpec
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Failed to parse OpenAPI specification: ${message}`)
  }
}

/**
 * Detect whether content is JSON or YAML
 */
function detectFormat(content: string): "yaml" | "json" {
  const trimmed = content.trim()
  // JSON starts with { or [
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json"
  }
  return "yaml"
}

/**
 * Basic validation of the parsed spec
 */
function validateSpec(spec: OpenAPISpec): void {
  if (!spec) {
    throw new Error("Invalid OpenAPI specification: empty document")
  }

  if (!spec.openapi && !spec.swagger) {
    throw new Error(
      "Invalid OpenAPI specification: missing 'openapi' or 'swagger' version field"
    )
  }

  if (!spec.info) {
    throw new Error("Invalid OpenAPI specification: missing 'info' object")
  }

  if (!spec.info.title) {
    throw new Error("Invalid OpenAPI specification: missing 'info.title'")
  }

  if (!spec.info.version) {
    throw new Error("Invalid OpenAPI specification: missing 'info.version'")
  }
}

/**
 * Extract the OpenAPI/Swagger version
 */
function getSpecVersion(spec: OpenAPISpec): string {
  if (spec.openapi) {
    return spec.openapi
  }
  if (spec.swagger) {
    return spec.swagger
  }
  return "unknown"
}

/**
 * Check if the spec is OpenAPI 3.x
 */
export function isOpenAPI3(spec: OpenAPISpec): boolean {
  return !!spec.openapi && spec.openapi.startsWith("3.")
}

/**
 * Check if the spec is Swagger 2.x
 */
export function isSwagger2(spec: OpenAPISpec): boolean {
  return !!spec.swagger && spec.swagger.startsWith("2.")
}
