describe("Verificações básicas de segurança da interface", () => {
  it("mantém a área administrativa indisponível quando Supabase não está configurado", () => {
    cy.visit("/#/admin");

    cy.contains("h1", "Supabase ainda não está disponível").should("be.visible");
    cy.contains("button", "Entrar").should("not.exist");
    cy.contains("Usuários").should("not.exist");
  });

  it("trata entrada de busca semelhante a XSS como texto", () => {
    cy.on("window:alert", (message) => {
      throw new Error(`A busca disparou alert: ${message}`);
    });

    cy.visit("/#/catalogo");
    cy.get('input[aria-label="Buscar fósseis, espécies, períodos..."]')
      .type("<img src=x onerror=alert(1)>");

    cy.get('img[src="x"]').should("not.exist");
  });
});
