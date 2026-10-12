<!-- ARD template. The spec writer drafts it at apps/<app>/docs/ard.md, and the human approves it. Every requirement gets an ID that specs, tests, and gate verdicts can cite, and names the gate or check that verifies it. Write "None" in any section that doesn't apply. Delete these comments before review. -->

# <App name> architecture requirements

## Stack

<The stack profile name, and any way this app differs from the profile.>

## Security and privacy

| ID | Requirement | Verified by |
|---|---|---|
| ARD-SEC-01 | <For example, every route outside the public pages requires a signed-in user.> | Security gate |

## Security-sensitive areas

<Areas where the human approves every slice under risk-based approval, such as authentication, payments, and personal data.>

## Performance

| ID | Requirement | Verified by |
|---|---|---|
| ARD-PERF-01 | <For example, dashboard pages respond in under 300 ms at the 95th percentile with 50 concurrent users.> | Test gate |

## Data

| ID | Requirement | Verified by |
|---|---|---|
| ARD-DATA-01 | <Backups, retention, deletion, and export.> | <Gate or check> |

## Accessibility

<The target, such as WCAG 2.2 level AA. Automated checks catch part of it. Full conformance needs manual testing with assistive technologies and an expert review.>

## Browsers and devices

<Supported browsers, minimum versions, and screen sizes.>

## Observability

<What the app logs, what it measures, and where errors go.>

## Integrations

<Each external service, what the app uses it for, and which key or account it uses in each environment.>

## Cost limits

<Monthly limits for hosting, database, email, and other paid services.>
