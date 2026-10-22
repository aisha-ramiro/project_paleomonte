// Referências do plano confirmadas no Supabase em 22/10/2026.
// Alterações são feitas neste arquivo e exigem uma nova publicação do site.
// O limite do DeepL continua vindo da consulta autenticada ao próprio provedor.
export const diagnosticLimits = Object.freeze({
  databaseBytes: 500_000_000,
  storageBytes: 1_000_000_000,
  // Sem cota contratual de visitas: a contagem é apenas informativa.
  monthlyAccesses: null,
});
