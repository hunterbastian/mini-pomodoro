# Security Practices

## Secret Scanning

This repository enforces secret scanning in two places:

1. CI: `.github/workflows/secret-scan.yml` runs `gitleaks` on pushes and pull requests.
2. Local git hook: `.githooks/pre-commit` blocks commits with high-signal secret patterns.

### Local setup

Run once after cloning:

```bash
npm run hooks:install
```

Manual scan:

```bash
npm run secrets:scan
```

## Firebase config safety

- `GoogleService-Info.plist` contains live values and must stay untracked.
- `GoogleService-Info.plist.example` is the only file that should be committed.
- If GitHub Secret Scanning reports a key, rotate/revoke it immediately.
