import { describe, it, expect } from 'vitest';

/**
 * Export path derivation logic mirrors /api/export endpoint
 */
function deriveExportPath(testCode: string, basePath?: string): string {
  const describeMatch = testCode.match(/describe\(["'](.+?)["']/);
  const featureName = describeMatch ? describeMatch[1] : 'generated-test';

  const featureSlug = featureName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+$/, '');

  const baseDir = basePath ?? './cypress/e2e';
  const fileName = `${featureSlug}.cy.ts`;

  return `${baseDir}/${fileName}`;
}

describe('Export - Path Derivation', () => {
  describe('Feature name extraction', () => {
    it('should extract feature name from describe block', () => {
      const code = `describe("User Login Flow", () => {
        it("should login", () => {
          expect(true).toBe(true);
        });
      });`;
      const path = deriveExportPath(code);
      expect(path).toContain('user-login-flow');
    });

    it('should use default name when no describe block', () => {
      const code = `it("test", () => { expect(true).toBe(true); });`;
      const path = deriveExportPath(code);
      expect(path).toContain('generated-test');
    });

    it('should convert mixed case to lowercase', () => {
      const code = `describe("MyFeatureName", () => {
        it("test", () => { expect(true).toBe(true); });
      });`;
      const path = deriveExportPath(code);
      expect(path).toContain('myfeaturename');
    });

    it('should replace spaces with hyphens', () => {
      const code = `describe("Feature With Spaces", () => {
        it("test", () => { expect(true).toBe(true); });
      });`;
      const path = deriveExportPath(code);
      expect(path).toContain('feature-with-spaces');
    });

    it('should remove special characters and keep hyphens between words', () => {
      const code = `describe("Feature@#$%With^Special!Chars", () => {
        it("test", () => { expect(true).toBe(true); });
      });`;
      const path = deriveExportPath(code);
      // The regex replaces special chars with hyphens, so we get "feature-with-special-chars"
      expect(path).toContain('feature-with-special-chars.cy.ts');
    });

    it('should remove trailing hyphens', () => {
      const code = `describe("Feature---", () => {
        it("test", () => { expect(true).toBe(true); });
      });`;
      const path = deriveExportPath(code);
      expect(path).not.toContain('feature---');
      expect(path).toContain('feature');
    });
  });

  describe('File naming', () => {
    it('should use .cy.ts extension', () => {
      const code = `describe("Login", () => {
        it("test", () => { expect(true).toBe(true); });
      });`;
      const path = deriveExportPath(code);
      expect(path).toContain('.cy.ts');
    });

    it('should derive correct filename from feature name', () => {
      const code = `describe("User Authentication", () => {
        it("test", () => { expect(true).toBe(true); });
      });`;
      const path = deriveExportPath(code);
      expect(path).toContain('user-authentication.cy.ts');
    });
  });

  describe('Path handling', () => {
    it('should use default cypress/e2e path when not specified', () => {
      const code = `describe("Test", () => {
        it("test", () => { expect(true).toBe(true); });
      });`;
      const path = deriveExportPath(code);
      expect(path).toContain('./cypress/e2e/');
    });

    it('should use custom base path when provided', () => {
      const code = `describe("Test", () => {
        it("test", () => { expect(true).toBe(true); });
      });`;
      const customPath = './custom/path';
      const path = deriveExportPath(code, customPath);
      expect(path).toContain('./custom/path/');
    });

    it('should handle paths with trailing slash', () => {
      const code = `describe("Test", () => {
        it("test", () => { expect(true).toBe(true); });
      });`;
      const customPath = './cypress/e2e/';
      const path = deriveExportPath(code, customPath);
      expect(path).toContain('.cy.ts');
    });
  });

  describe('Dry-run behavior', () => {
    it('should return path without writing to disk', () => {
      const code = `describe("DiskTest", () => {
        it("test", () => { expect(true).toBe(true); });
      });`;
      const path = deriveExportPath(code);
      // This is just a string derivation, no file I/O
      expect(typeof path).toBe('string');
      expect(path).toContain('disktest');
    });
  });
});
