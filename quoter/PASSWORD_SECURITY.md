# Password hashing compatible with Workers

The published signup reported a crypto_runtime failure after Turnstile. The former implementation required one native PBKDF2 call with 600,000 iterations. Passing on local workerd does not demonstrate support on the published runtime. This revision supports a 100,000-iteration native cap without retaining the failing requirement for new passwords.

New format: `pbkdf2-sha256-peppered$100000$v1$<digest>`. A domain-separated HMAC-SHA256 using an independent 256-bit PASSWORD_PEPPER prepares the password and its random 256-bit salt; PBKDF2-HMAC-SHA256 then derives a 256-bit digest with 100,000 iterations. No plaintext password or reversible password encryption is stored.

The pepper protects against offline verification of guesses from a database-only leak. It does not make 100,000 iterations equivalent to 600,000, nor meet the 600,000-iteration PBKDF2 recommendation if the application secret is also compromised. A future managed identity service or reviewed memory-hard KDF with measured production CPU/memory budget remains an improvement. No custom repeated-KDF construction is used.

## Configuration

Production already configured: `npm run password:provision` inspects remote secret **names only** and checks the existing local private file. It never uploads a key. A clone without the original private file fails before generating anything when the remote secret exists. Cloudflare does not reveal secret values: presence is not proof that a restored local copy matches production.

Only the **first initialization of an absent remote secret** uses:

```powershell
npm run password:provision -- --initialize
```

The helper first lists secret names. If PASSWORD_PEPPER is already present it refuses replacement, including with `--initialize`. If absent, explicit initialization creates `.env.password-pepper.production.local` once or reuses its validated existing value, then passes that value through stdin under the literal name PASSWORD_PEPPER. Provider output and values are not printed. Run initialization exclusively as a single infrastructure operator; Cloudflare's secret API does not provide an atomic create-if-absent operation, so simultaneous independent initializers are not supported. Do not delete the remote secret to bypass this safeguard.

The file is ignored by Git and must be backed up securely. Setup tightens an existing regular file to POSIX 0600 and rejects symlinks; on Windows configure and inspect NTFS ACLs as described in OPERATIONS.md. Do not reuse MFA_ENCRYPTION_KEY, Turnstile or Resend secrets. If the original pepper is missing, recover it from custody or perform a coordinated account recovery; this command deliberately has no rotation/overwrite switch.

Local: run `npm run password:setup`, which appends a random key to ignored .dev.vars without displaying or replacing an existing key. Restart Vite. Local and production keys can be different because their user databases are independent.

Preserve the production key across deployments and back it up securely. Never regenerate it as routine troubleshooting: changing it invalidates password checks for this format. Loss requires restoration of the old key or account recovery/password resets with a newly secured configuration. Rotation requires a coordinated versioned migration; changing only the secret is not such a migration. It is deliberately independent of MFA recovery/reset.

Missing or malformed pepper fails closed with 503 and a backend log containing only the missing secret's name. No new SQL migration is required. Business JSON backups do not contain authentication records or the pepper. A full user-database restore requires the matching pepper in the restored deployment.

## Existing accounts

Legacy 100,000-iteration hexadecimal hashes remain readable. The previous 600,000-iteration format remains readable where native runtime support exists. After a successful login, either old format is upgraded atomically using a new salt. Failure to authenticate does not rewrite credentials. Recovery writes the new format directly.

If a previous 600,000-iteration account is moved to a runtime that rejects that cost, password recovery is required; the server does not pretend its digest can be validated with 100,000 iterations. Existing local accounts can authenticate on the local runtime that already supported them. The failed public signup computes the hash before inserting its business/user records, so this failure does not itself create a partial account.

## Validation

Tests simulate a native 100,000-iteration cap, verify both old formats, test wrong passwords and wrong peppers, reject missing configuration and check malformed formats without accepting caller-selected work factors. Registration, email verification/recovery and master password/MFA operations all receive the server environment. Published signup and delivery must still be confirmed after configuration and deployment; local tests do not certify production readiness.
