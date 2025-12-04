import { describe, it, expect } from "vitest"
import { analyzeOpenAPI, analyzeOpenAPISync } from "../src/index.js"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, "fixtures")

describe("analyzeOpenAPI", () => {
  describe("minimal spec", () => {
    it("should score a minimal spec low", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "minimal.yaml"))

      expect(report.score).toBeLessThan(50)
      expect(report.grade).toMatch(/[DEF]/)
      expect(report.improvements.length).toBeGreaterThan(0)
    })

    it("should identify missing documentation", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "minimal.yaml"))

      // Check that documentation category scored low
      expect(report.categories.documentation.score).toBeLessThan(50)

      // Check that improvements include documentation suggestions
      const docImprovements = report.improvements.filter(
        (i) => i.category === "documentation"
      )
      expect(docImprovements.length).toBeGreaterThan(0)
    })

    it("should have examples category evaluated", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "minimal.yaml"))

      // Examples category is evaluated (may score high if there's nothing to check)
      expect(report.categories.examples).toBeDefined()
      expect(report.categories.examples.score).toBeGreaterThanOrEqual(0)
      expect(report.categories.examples.score).toBeLessThanOrEqual(100)
    })

    it("should identify missing security", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "minimal.yaml"))

      // Check that security category scored low
      expect(report.categories.security.score).toBeLessThan(50)
    })
  })

  describe("excellent spec", () => {
    it("should score an excellent spec high", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "excellent.yaml"))

      expect(report.score).toBeGreaterThan(80)
      expect(report.grade).toMatch(/[AB]/)
    })

    it("should have few or no improvements", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "excellent.yaml"))

      // High-priority improvements should be minimal
      const highPriority = report.improvements.filter(
        (i) => i.priority === "high"
      )
      expect(highPriority.length).toBeLessThan(3)
    })

    it("should score documentation category high", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "excellent.yaml"))

      expect(report.categories.documentation.score).toBeGreaterThan(70)
    })

    it("should score security category high", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "excellent.yaml"))

      expect(report.categories.security.score).toBeGreaterThan(70)
    })
  })

  describe("metadata extraction", () => {
    it("should extract spec metadata correctly", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "excellent.yaml"))

      expect(report.metadata.specVersion).toBe("3.0.3")
      expect(report.metadata.title).toBe("Pet Store API")
      expect(report.metadata.operationCount).toBeGreaterThan(0)
      expect(report.metadata.schemaCount).toBeGreaterThan(0)
      expect(report.metadata.analyzedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      )
    })
  })

  describe("analyzeOpenAPISync", () => {
    it("should work with a parsed object", () => {
      const spec = {
        openapi: "3.0.3",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
        paths: {
          "/test": {
            get: {
              responses: {
                "200": { description: "OK" },
              },
            },
          },
        },
      }

      const report = analyzeOpenAPISync(spec)

      expect(report.score).toBeGreaterThanOrEqual(0)
      expect(report.score).toBeLessThanOrEqual(100)
      expect(report.metadata.title).toBe("Test API")
    })
  })

  describe("custom options", () => {
    it("should respect custom weights", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "minimal.yaml"), {
        weights: {
          documentation: 50,
          completeness: 20,
          examples: 10,
          structure: 10,
          security: 10,
        },
      })

      // Documentation weight should be reflected
      expect(report.categories.documentation.weight).toBe(50)
    })

    it("should respect disabled rules", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "minimal.yaml"), {
        disabledRules: ["operation-description", "operation-summary"],
      })

      // Disabled rules should not appear in results
      const disabledResults = report.rules.filter(
        (r) => r.id === "operation-description" || r.id === "operation-summary"
      )
      expect(disabledResults.length).toBe(0)
    })
  })

  describe("report structure", () => {
    it("should have all required fields", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "minimal.yaml"))

      // Check top-level fields
      expect(report).toHaveProperty("score")
      expect(report).toHaveProperty("grade")
      expect(report).toHaveProperty("summary")
      expect(report).toHaveProperty("categories")
      expect(report).toHaveProperty("improvements")
      expect(report).toHaveProperty("rules")
      expect(report).toHaveProperty("metadata")

      // Check categories
      expect(report.categories).toHaveProperty("documentation")
      expect(report.categories).toHaveProperty("completeness")
      expect(report.categories).toHaveProperty("examples")
      expect(report.categories).toHaveProperty("structure")
      expect(report.categories).toHaveProperty("security")

      // Check category structure
      for (const category of Object.values(report.categories)) {
        expect(category).toHaveProperty("score")
        expect(category).toHaveProperty("weight")
        expect(category).toHaveProperty("earnedPoints")
        expect(category).toHaveProperty("maxPoints")
        expect(category).toHaveProperty("rulesPassed")
        expect(category).toHaveProperty("rulesFailed")
      }

      // Check improvements structure
      for (const improvement of report.improvements) {
        expect(improvement).toHaveProperty("priority")
        expect(improvement).toHaveProperty("category")
        expect(improvement).toHaveProperty("rule")
        expect(improvement).toHaveProperty("message")
        expect(improvement).toHaveProperty("impact")
      }
    })

    it("should sort improvements by priority and impact", async () => {
      const report = await analyzeOpenAPI(join(fixturesDir, "minimal.yaml"))

      // Check that high priority improvements come first
      let lastPriority = "high"
      let lastImpact = Infinity

      for (const improvement of report.improvements) {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        const currentOrder = priorityOrder[improvement.priority]
        const lastOrder = priorityOrder[lastPriority as keyof typeof priorityOrder]

        if (currentOrder > lastOrder) {
          // Priority changed to lower, reset impact
          lastImpact = Infinity
        } else if (currentOrder === lastOrder) {
          // Same priority, impact should be decreasing
          expect(improvement.impact).toBeLessThanOrEqual(lastImpact)
        }

        lastPriority = improvement.priority
        lastImpact = improvement.impact
      }
    })
  })
})
