describe("Preferências de acessibilidade", () => {
  beforeEach(() => {
    cy.visit("/#/acessibilidade");
  });

  it("mantém o tema escuro e o tamanho do texto após recarregar", () => {
    cy.get(".access-controls")
      .contains("button", "Aumentar texto")
      .click();
    cy.get('input[aria-label="Modo escuro"]').check({ force: true });

    cy.get(".text-scale-status").should("have.text", "110%");
    cy.get("html").should("have.class", "dark-mode");

    cy.reload();

    cy.get(".text-scale-status").should("have.text", "110%");
    cy.get('input[aria-label="Modo escuro"]').should("be.checked");
    cy.get("html").should("have.class", "dark-mode");
  });

  it("respeita os limites mínimo e máximo da escala de texto", () => {
    cy.get(".access-controls")
      .contains("button", "Diminuir texto")
      .click();

    cy.get(".text-scale-status").should("have.text", "90%");
    cy.get(".access-controls")
      .contains("button", "Diminuir texto")
      .should("be.disabled");

    cy.get(".access-controls")
      .contains("button", "Aumentar texto")
      .click()
      .click()
      .click();

    cy.get(".text-scale-status").should("have.text", "120%");
    cy.get(".access-controls")
      .contains("button", "Aumentar texto")
      .should("be.disabled");
  });
});
