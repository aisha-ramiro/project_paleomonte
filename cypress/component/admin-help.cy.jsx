import { mount } from "cypress/react";
import AdminHelp from "../../src/components/AdminHelp.jsx";

describe("AdminHelp component", () => {
  it("normalizes accents when searching tutorial titles", () => {
    mount(<AdminHelp roles={["operator"]} />);
    cy.get("#help-search").type("traducoes");
    cy.contains("h3", "Gerar e revisar traduções em inglês e espanhol")
      .should("be.visible");
  });

  it("mostra a orientação de acesso ao abrir um tutorial restrito a admin", () => {
    mount(<AdminHelp roles={["operator"]} />);
    cy.contains("summary h3", "Convidar usuários e definir níveis de acesso").click();
    cy.contains(".help-permission-note", "Seu nível de Operador não permite gerenciar usuários.")
      .should("be.visible");
  });
});
