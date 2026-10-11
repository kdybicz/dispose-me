# Dependency security updates

Use this process for routine dependency maintenance in Dispose Me. Update to compatible
releases that have passed the package age gate. Any bypass requires explicit user approval.

## Rules

- Use Node.js 22 or newer and the Yarn version pinned in `package.json`, via Corepack.
- Keep `npmMinimalAgeGate: 7d` and `enableScripts: false` in `.yarnrc.yml`.
- Do not reduce the age gate or enable install scripts. Do not add
  `npmPreapprovedPackages` without explicit user approval.
- If bypassing the age gate is the only available way to patch a vulnerability, ask the
  user whether to wait or approve an exact package/version exception before proceeding.
- Prefer a direct dependency upgrade, then an upgrade of its nearest direct parent.
- Add a resolution only when a compatible parent upgrade cannot supply the fix.
- Scope resolutions to the affected dependency descriptor and document the advisory,
  dependency path, fixed version, and reason for the pin here.
- Do not force incompatible major versions through resolutions. Major upgrades need
  migration work and verification before they can be included.
- Keep `@types/node` aligned with the minimum supported Node.js major version.

## 1. Establish the baseline

Start with a clean dependency installation:

```bash
corepack enable
yarn install --immutable
yarn audit
yarn npm audit --recursive
```

`yarn audit` checks recursive high and critical findings. The unfiltered command also
reports lower-severity findings and deprecated packages. Neither command fixes packages.

Record each advisory's identifier, severity, vulnerable and fixed versions, and whether
the package runs in Lambda or only in development. Find its dependency path with:

```bash
yarn why <package>
```

## 2. Refresh dependencies and review existing pins

Review existing security resolutions. Remove stale pins and regenerate the tree to check
whether parent dependencies now supply fixed versions. Preserve independently required
compatibility pins.

Use the interactive upgrade command to select direct dependencies:

```bash
yarn upgrade-interactive
```

For a targeted upgrade, use `yarn up <package>@<compatible-version>`. For a lockfile-only
refresh within the existing manifest ranges:

```bash
yarn up -R '*'
yarn install
```

The age gate still applies. If a fixed version is less than seven days old, first look for
a compatible, age-eligible fix through a direct or parent dependency upgrade. If none is
available and bypassing the age gate is the only way to patch the vulnerability, ask the
user what to do. Include the advisory, fixed package/version, release date, and date it
becomes eligible. Offer waiting or approving an exact package/version exception.

Do not add an exception until the user explicitly approves it. If approved, add only the
exact package/version to `npmPreapprovedPackages`, document the approval and reason here,
and remove the exception once the release is seven days old. Keep `npmMinimalAgeGate: 7d`
unchanged and verify the final immutable install and audits.

Review `package.json` and `yarn.lock` for unexpected major changes, downgrades, duplicate
versions, and pins that block newer fixes.

## 3. Remediate and audit again

For each remaining vulnerability:

1. Upgrade the direct dependency to a compatible fixed version.
2. Upgrade its nearest direct parent if the vulnerable package is transitive.
3. Use a narrowly scoped resolution only if neither upgrade supplies a compatible fix.

After each group of changes:

```bash
yarn install
yarn npm audit --recursive
yarn why <affected-package>
```

If no published compatible fix has passed the age gate, document the finding and the next
action below. Deprecation notices need separate review; they are not themselves advisories.

## 4. Verify

```bash
yarn install --immutable
yarn lint
yarn test:coverage
yarn build
yarn audit
yarn npm audit --recursive
```

Exercise rendered pages when upgrading Express or EJS, feed output when upgrading `feed`,
and email parsing when upgrading `mailparser`. Run local CDK synthesis for infrastructure
dependency changes. Do not deploy as part of dependency verification.

Completion requires passing install, lint, tests, and build checks. No high or critical
advisories should remain once a compatible, age-eligible fix is available. Document all
deferred findings and revisit them on the next maintenance pass. Audit failures stay visible;
do not hide them with exclusions or `|| true`.

## Deferred findings

Reviewed on 2026-10-11 against the npm registry and the regenerated Yarn dependency tree.

| Package and dependency path | Finding | Next action |
| --- | --- | --- |
| Tailwind/webpack tooling → `micromatch` → `braces@3.0.3` | GHSA-vfj7-8cjw-p6xm, high | The advisory specifies `3.0.4`, but the registry has no such release. Recheck upstream and update the parent or compatible fixed release when available. |
| Jest coverage tooling → `js-yaml` → `argparse` → `sprintf-js@1.0.3` | GHSA-hp3w-g68c-fv3c, moderate | The advisory specifies `1.1.4`, but the registry has no such release. Recheck upstream; do not force an unrelated major upgrade. |
| Jest coverage tooling → `test-exclude` → `glob@10.5.0` | Deprecation notice | Wait for a compatible `test-exclude` update that replaces its deprecated glob dependency. The direct webpack configuration uses `glob@13`. |

## Deferred direct upgrades

- TypeScript remains on `5.9.3`. TypeScript `7.0.2` is outside `ts-jest`'s supported
  `>=4.3 <7` peer range. Revisit with a supported compiler and test-tooling migration.
- `feed` remains on `4.2.2`. Version `6.0.0` is ESM-only; this project and its Jest setup
  use CommonJS. Migrate the module/test setup before upgrading.
- EJS `7.0.1`, newer dotenv/AWS SDK releases, Express `5.3.0`, and newer CDK releases
  were not yet seven days old. Recheck them on the next maintenance pass.

## Approved temporary exception

On 2026-10-11, the user explicitly approved upgrading Handlebars to `4.7.10` before it
passes the age gate. `.yarnrc.yml` preapproves only `handlebars@4.7.10` to fix
GHSA-xw65-4hp5-5hc7, GHSA-8r5x-fm3f-whwj, and GHSA-p8wg-vrv2-v86f through `ts-jest`.
No compatible, age-eligible fixed version was available. The existing `ts-jest` dependency
range accepts this patch release, so no resolution is needed.

Remove this preapproval and its configuration comment after 2026-10-12 at 22:37:38 UTC,
then run `yarn install --immutable`, `yarn test:coverage`, and both audits. Keep the
seven-day age gate and disabled install scripts unchanged.

## Additional verification finding

A standalone `yarn tsc --noEmit` check reports third-party declaration errors in
`@types/sinon`, which references the removed `FakeTimerInstallOpts` export, and
`aws-sdk-client-mock`, which needs synthetic default imports. This is outside the current
build/test commands. Review the mock library's typings and compiler interoperability
settings before adding standalone typechecking as a CI gate. The webpack build and Jest
coverage suite pass with the existing compiler configuration.
