# Barbearia Caixa

Sistema web simples para:
- controle de entradas e saídas;
- cadastro de clientes;
- histórico de atendimentos;
- emissão de recibos;
- envio do recibo pelo WhatsApp.

## Publicação

Este projeto é uma aplicação estática e pode ser publicada diretamente na Vercel.

1. Extraia o ZIP.
2. No GitHub, abra `barbearia-caixa`.
3. Clique em **Add file → Upload files**.
4. Envie `index.html`, `style.css`, `app.js` e este `README.md`.
5. Faça o commit.
6. Na Vercel: **Add New → Project → Import Git Repository** e selecione `barbearia-caixa`.
7. Framework Preset: **Other**.
8. Clique em **Deploy**.

O frontend usa apenas a chave pública do Supabase. A segurança dos dados é feita pelas políticas RLS do banco.
