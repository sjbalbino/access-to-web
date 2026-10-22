# Architecture rules

- Reuse `ClienteFornecedorDialog` for the client/supplier list and financial shortcuts, so fields, automatic lookups, validation and saving remain identical.
- Keep the financial title form shared between accounts payable and receivable, so both workflows receive the same presentation and shortcut behavior.
- Store ACBr API OAuth client credentials in emitentes_nfe_credentials.api_consumer_key/secret and route by emitentes_nfe.api_provider, so Focus NFe and ACBr can coexist per emitter.
- Store Unimake (UniNFe Cloud) App ID/Secret in the same emitentes_nfe_credentials.api_consumer_key/secret columns with api_provider = 'unimake'; shared logic lives in supabase/functions/_shared/unimake-api.ts (ambiente 2 = sandbox, otherwise production), so all three fiscal providers coexist per emitter.
