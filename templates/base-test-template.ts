// @ts-nocheck
/**
 * Cypresso — Base Cypress Test Template
 *
 * This template contains mustache-style placeholders ({{...}}) that are
 * filled in by the TestGeneratorAgent when generating a test from a user story.
 *
 * Placeholders:
 *   {{Feature Name}} — Human-readable feature label (used in describe block)
 *   {{action}}       — What the test verifies (used in it block description)
 *   {{url}}          — The page URL to visit
 *   {{selector}}     — The DOM selector to target (prefer data-testid)
 *   {{assertion}}    — The Chai/Cypress assertion (e.g., "be.visible", "contain", "exist")
 *
 * Usage:
 *   The generate API reads this file, replaces placeholders, and returns
 *   the resulting code as the generated test.
 */

describe('{{Feature Name}}', () => {
  beforeEach(() => {
    cy.visit('{{url}}');
  });

  it('should {{action}}', () => {
    cy.get('{{selector}}').should('{{assertion}}');
  });
});
