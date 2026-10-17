> Estado vigente: el propietario confirmó entrega a su propia cuenta y acceso online. Para entregar a clientes sigue siendo necesario un dominio de envío verificado. En local, crear `.dev.vars` solo si falta, ejecutar `npm run password:setup` y `npm run mfa:setup`, migrar D1 y usar preview. Las afirmaciones de ausencia de entrega que siguen son historia de la preparación inicial. La integración rechaza redirects y conserva el timeout.

# Account emails with Resend

Real delivery is prepared but requires a verified sender, a public HTTPS app URL and an API key. These were not supplied during implementation; no live email delivery was tested.

## Test on your computer now

Stop Vite, then in PowerShell from `QuoterSaaS\quoter`:

```powershell
if (!(Test-Path .dev.vars)) { Copy-Item .dev.vars.example .dev.vars }
npm run db:migrate
npm run dev
```

The example sets `EMAIL_MODE=preview`. It works only on localhost/127.0.0.1/::1, and shows **Abrir correo de prueba**. No external mail is sent. Existing accounts need verification too: log in and click Reenviar verificación. Follow the local link, then Verificar correo and Continuar. Recovery starts at Olvidé mi contraseña.

Do not overwrite an existing `.dev.vars` containing your configuration. If it already exists, add `EMAIL_MODE=preview` yourself for local tests. The file is ignored by Git. `.dev.vars.example` contains only non-secret examples.

## Enable real delivery later

1. In Resend, add your sending domain and complete its DNS verification. Choose a sender address on that domain.
2. Create a Resend API key authorized to send email. Store it securely as `RESEND_API_KEY`, never in Git or chat.
3. Set `MAIL_FROM` to your sender, for example `Quoter <accounts@your-domain.com>`.
4. Set `APP_URL` to the exact public HTTPS origin of Quoter, for example `https://quoter.your-domain.com` (no path, query or fragment).
5. Remove local `EMAIL_MODE=preview` to test live delivery. Configure these variables/secrets independently in the deployed Worker environment. Leave preview disabled in production.

The cloud environment configuration draft declares `RESEND_API_KEY` for destination `api.resend.com`, plus `MAIL_FROM` and `APP_URL`. That declaration stores requirements, not credential values, and does not activate or publish them. Review, save and publish environment settings when configuring that environment. A deployed Worker needs its own secret and variable configuration; the cloud development environment is separate.

Registration sends a verification email. Verification links expire after 24 hours. Recovery links expire after 30 minutes. Both contain random one-use tokens; only digests are stored. Tokens are placed in URL fragments, consumed via POST, and not written to logs. Password reset atomically changes the hash, revokes every session and invalidates other recovery links. Recovery never signs a user in automatically.

Accounts cannot access business data until verified. Existing customers, catalog, quotes and branding remain intact. Team invitations now use the same delivery adapter and local preview. They expire in three days and require a verified account with the invited email. Public quote sharing, WhatsApp and invoices remain deferred.

## Validation

With the local server running in preview mode:

```powershell
npm run test:email
npm run test:auth
npm run test:api
npm test
npm run lint
npm run build
```

If Vite uses another port, set `$env:QUOTER_TEST_URL = "http://127.0.0.1:PORT"` in the test terminal. Email tests are local-only: they exercise expiry by updating test token rows in local D1. Never point them at production. Tests create isolated temporary accounts; no existing business records are changed. The local-preview flow and the Resend payload adapter were tested, including mobile UI verification/reset. Real provider acceptance and inbox delivery remain pending.
