# Release synchronization from GitLab to GitHub

GitLab is the source of truth. [.gitlab-ci.yml](../.gitlab-ci.yml) sends a release
to `github.com/delight-software/n8n-nodes-delight` only for a GitLab **push**
pipeline with a version tag such as `1.0.6` or `1.1.0-rc.1`. Tags have no `v`
prefix. Ordinary branch pushes, merge requests, schedules, web/manual pipelines,
API pipelines, and non-version tags do not run the synchronization job. There
are no global workflow rules that would exclude unrelated future jobs.

This replaces the automatic GitLab push mirror after an administrator disables
it. Until then, that mirror can still copy ordinary commits independently of CI.
GitHub Actions remains the only automated npm publisher; the GitLab job installs
only Git and OpenSSH, and does not build, test, publish npm packages, or create
GitHub Releases.

## Repository and release behavior verified locally

- `origin` is `git@gitlabssh.delight.ch:delight/delightbase/delightn8n.git`.
  Local `main` tracks `origin/main`; `package.json` identifies the public GitHub
  repository. Existing tags `1.0.1` through `1.0.5` are annotated tags.
- `npm run release` invokes `n8n-node release`. The installed/locked
  `@n8n/node-cli` 0.53.3 requires `main`, a clean working tree, upstream tracking,
  and new commits. It invokes `release-it` to bump, commit, tag, and push. No
  project-specific release-it configuration was found.
- Installed/locked `release-it` 21.1.1 defaults to bare version tags, annotated
  with `Release ${version}`, and pushes with `git push --follow-tags` to the
  tracked upstream. With this checkout's configuration, the version commit and
  reachable annotated tags are normally sent to GitLab in one push. If the
  branch and tag arrive in separate pushes, **the branch must arrive first**.
  A branch-only pipeline does nothing; the later tag pipeline fetches `main`
  anew. A tag that has not reached `main` fails explicitly and can be retried
  after the branch push succeeds.
- [.github/workflows/publish.yml](../.github/workflows/publish.yml) listens to
  tag pushes matching `*.*.*`, which includes this job's bare version tags and
  prereleases. Its `npm run release` sees `GITHUB_ACTIONS` and the CLI runs lint,
  build, and npm publish with provenance, without making another Git commit or
  tag. An SSH deploy-key push can produce the GitHub push event; this job does
  not use GitHub's workflow `GITHUB_TOKEN`.
- [.github/workflows/ci.yml](../.github/workflows/ci.yml) also runs for an update
  to GitHub `main`. That existing workflow and the publishing workflow are
  unchanged. Publishing does not wait for the separate branch CI workflow.

**Existing release-tool caveat:** the local CLI also passes `--github.release`.
Release-it derives that optional release's host/owner/project from the Git
remote, which here points to private GitLab, rather than from `package.json`'s
GitHub URL. Without a token it offers a web release; with a token its API checks
can fail before the Git push. This is pre-existing and is not repaired by ref
synchronization. Do not supply the synchronization SSH private key as a
`GITHUB_TOKEN`, or redirect the Git push to GitHub. This job needs only the
GitLab commit/tag push; a GitHub Release is not needed by `publish.yml`. The
existing local GitHub Release prompt/API setup needs separate review if that
part of the command is used. Neither release command nor publishing workflow
was executed during implementation.

## How refs are synchronized

1. GitLab runs `sync_github_release` only when `CI_PIPELINE_SOURCE == "push"`
   and `CI_COMMIT_TAG` matches the repository's version convention. The rule
   allows numeric `major.minor.patch` with optional prerelease/build suffixes;
   it is a routing filter, not a full SemVer validator. Tags must be immutable:
   the CI event alone does not distinguish a new tag from a moved tag.
2. `GIT_DEPTH: '0'` provides complete history. The script explicitly fetches
   GitLab `main` and the single triggering tag, without fetching incidental
   tags. It peels the tag to a commit, verifies it matches `CI_COMMIT_SHA`, and
   requires it to be an ancestor of GitLab `main`. This works with detached HEAD
   and annotated or lightweight tags; no local branch checkout is needed.
3. With a pinned SSH trust file and dedicated identity, it fetches only GitHub
   `main`. The already-mirrored GitHub repository must have that branch. Its tip
   must be in GitLab `main` history, preventing GitHub-only changes from being
   silently accepted as source history.
4. If GitHub `main` can fast-forward to the release commit, it pushes exactly
   `<release-commit>:refs/heads/main` and
   `refs/tags/<version>:refs/tags/<version>` in one atomic push. It never pushes
   the latest untagged GitLab tip. The tag ref retains its original annotated
   tag object, message, and any signature.
5. If GitHub `main` already contains that release commit, only the tag is sent.
   An older or retried tag pipeline cannot move the branch backward. If the
   histories cannot be reconciled this way, the job fails. An already-identical
   tag is an idempotent success; a different existing tag object is rejected.

The project-level `github-release-sync` resource group serializes these jobs.
It does not require pipeline ordering: newer releases may finish first and
older ones can still deliver their own tags. `interruptible: false` avoids
canceling a running synchronization merely because newer work arrives. Every
push uses explicit refs, `--atomic`, and `--no-follow-tags`; there is no force,
mirror, all-tags, or deletion push. A concurrent external writer can still make
a push fail; normal Git rejection and atomic updates prevent partial or
non-fast-forward updates. Errors are not converted into successful skips.

## Ordered setup checklist

These are **manual actions for the repository administrator**. No remote setup,
key generation, Git writes, or release was performed while preparing this change.

1. **GitLab — review and install the configuration.** Review the CI file and
   this guide, then integrate them into `main` through your normal reviewed
   commit/push process. Include them before creating the first release tag:
   GitLab reads CI configuration from the tagged commit. Existing unrelated
   local changes should be reviewed independently. Before cutover, verify that
   GitHub `main` has the expected shared history from the current mirror, with
   no GitHub-only commits. Do not create a test release tag on the live project
   just to test configuration: delivering it can publish to npm.

2. **GitLab — validate the YAML.** In this project's **Build > Pipeline editor >
   Validate** (or the instance's CI Lint page), paste the full configuration and
   run syntax validation. This uses your GitLab version's actual validator.
   If pipeline simulation supports selecting refs/sources, verify a version
   tag push includes the job, and a `main` push, merge request, schedule, and
   web/manual pipeline exclude it. A default-branch simulation can correctly
   report no jobs/empty pipeline because this file currently contains only a
   tag job. Use the validator; do not start a pipeline to test synchronization.

3. **Your workstation — generate a dedicated deploy key.** Use a unique filename
   that does not overwrite an existing key. Run this yourself, outside the
   repository, and keep the private key out of version control:

   ```sh
   ssh-keygen -t ed25519 -N '' \
     -C 'GitLab release sync: n8n-nodes-delight' \
     -f ~/.ssh/n8n_nodes_delight_github_sync
   ```

   An empty passphrase permits unattended use; access to its private half must
   be restricted to trusted release jobs. Do not reuse a personal key. Do not
   add this key to your local SSH agent/config or change `origin`.

4. **GitHub — authorize only this repository.** Open
   [n8n-nodes-delight settings](https://github.com/delight-software/n8n-nodes-delight/settings/keys)
   and choose **Deploy keys > Add deploy key**. Give it a descriptive title, paste
   the contents of `~/.ssh/n8n_nodes_delight_github_sync.pub`, and select **Allow
   write access**. Read-only access cannot push releases. This key needs no
   organization membership, npm permission, API token, or administration scope.
   A write deploy key can write repository refs, so protect its use on GitLab.

5. **Your workstation — prepare trusted host keys.** Obtain GitHub's full
   `github.com <key-type> <base64-public-key>` known_hosts entries from GitHub's
   official [SSH key fingerprints documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints).
   Save the verified entries, with LF line endings and a final newline, in a
   separate file such as `github_sync_known_hosts`. Check their fingerprints:

   ```sh
   ssh-keygen -lf ./github_sync_known_hosts
   ```

   Compare with the fingerprints published by GitHub through trusted HTTPS or
   your organization's independently verified source. Include at least the
   current Ed25519 host key; multiple independently verified key types are
   allowed. Store complete host-key entries, not just `SHA256:...` fingerprints.
   Do not trust an unverified `ssh-keyscan` result. The job never downloads host
   keys and uses `StrictHostKeyChecking=yes`; approved host-key rotations require
   updating this variable manually before retrying.

6. **GitLab — protect release access.** In **Settings > Repository**, verify
   `main` is protected and restrict who can update it. Under **Protected tags**
   (or the equivalent tag rules UI), protect `*.*.*` and allow only authorized
   releasers to create them. This wildcard includes the existing `1.0.5` style
   and prereleases; it is broader than the CI regex and does not validate
   versions. Check for overlapping permissive rules. The user running
   `n8n-node release` must be allowed to push the version commit to `main` and
   create protected release tags. Review CI code before tagging it: protected
   variables are available to the pipeline from that tagged commit. Do not move
   or reuse release tags.

7. **GitLab — create CI/CD variables.** In **Settings > CI/CD > Variables**, add
   these project variables with environment scope **All (`*`)**, **Protect
   variable enabled**, and **Expand variable reference disabled**:

   | Variable                      | Type     | Value                                                                                                                                                                                  |
   | ----------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `GITHUB_SYNC_SSH_PRIVATE_KEY` | **File** | Entire private key, including `BEGIN/END OPENSSH PRIVATE KEY` lines, LF line endings, and a final newline. Paste the private file's contents, not its workstation path. No passphrase. |
   | `GITHUB_SYNC_SSH_KNOWN_HOSTS` | **File** | Entire verified known_hosts file from step 5, with a final newline. Public host keys only.                                                                                             |

   GitLab supplies temporary **file paths** in these environment variables.
   Ordinary Variable/text types will fail the job's file checks. Multiline SSH
   keys generally cannot satisfy GitLab's masked-variable restrictions; do not
   flatten or corrupt the key to enable masking. Use masking/hidden visibility
   only if your instance supports the exact content. Limit variable/settings
   access and never enable `CI_DEBUG_TRACE` for a credential-bearing pipeline.
   The job does not print key contents, turns shell tracing off, copies files
   into a private temporary directory with mode 600, and removes its copies on
   exit. GitLab/Runner manages the original File-variable files.

8. **GitLab/runner administrator — make a compatible runner available.** Use a
   trusted Docker or Kubernetes executor that honors `image: alpine:3.22` and
   can run `apk add` in the container. It needs GitLab repository access, image
   registry/Alpine package access, and outbound SSH to `github.com:22`. No Docker
   privileged mode, npm, application services, or shell executor is needed. This
   job has no runner `tags`, so assign an eligible runner with **Run untagged
   jobs** enabled. A protected runner is recommended; check that it accepts
   protected tag pipelines in this project. A runner requiring labels will not
   accept this job unless an administrator deliberately adds matching `tags`
   to the job. A shell executor ignores `image` and is not the supported setup.

9. **GitHub — check ref rules and publishing readiness.** Review **Settings >
   Rules > Rulesets** and **Settings > Branches** for `main`, plus tag rules
   matching release versions. PR-only updates, required checks, restricted push
   actors, or tag-creation restrictions can reject a deploy-key push. Where
   supported, authorize this exact deploy key for the necessary branch/tag
   updates or a narrowly scoped bypass. Do not broadly disable protection. If
   your protection mode cannot authorize deploy keys, resolve that policy before
   releasing; this job will fail rather than bypass it. Keep direct human
   changes on GitLab. Confirm Actions is enabled, `publish.yml` is allowed, and
   its existing npm Trusted Publisher or `NPM_TOKEN` configuration is ready.
   The synchronization key does not configure npm authentication.

10. **GitLab — disable the old push mirror.** In **Settings > Repository >
    Mirroring repositories**, find the **Push** mirror targeting
    `github.com/delight-software/n8n-nodes-delight`. Disable its automatic update
    option if your instance provides one, or remove that mirror entry after
    recording its configuration for recovery. Do not delete either repository.
    Check that no mirror update remains in flight. Do this before the first
    tag-driven release and before verifying ordinary pushes. A still-active
    mirror defeats the tag-only policy and can race this job. Also check for
    other automation writing GitHub refs.

11. **Both sites — validate an ordinary push after cutover.** During the next
    normal GitLab `main` commit/push, record the GitLab and GitHub branch tips.
    Confirm GitLab accepts the new commit, `sync_github_release` is absent (a
    pipeline may not be created at all), and GitHub `main` remains at its prior
    tip with no new tag/push event. Do not use a manual pipeline as a substitute
    for a tag event.

12. **Both sites — validate the next intended release.** With a clean `main`
    tracking GitLab, use the existing `npm run release` / `n8n-node release`
    process. No extra per-release synchronization command is needed. Do not use
    `[skip ci]` or push options that suppress the tag pipeline. In GitLab,
    confirm the pipeline's source is `push`, its ref is the new protected version
    tag, and `sync_github_release` completes successfully. In GitHub, compare
    the release tag's **peeled commit SHA** with GitLab's tag commit and the
    branch tip with the expected release commit. Compare the tag-object SHA as
    well for an annotated tag. GitHub `main` should equal that commit unless a
    newer release has already synchronized; later untagged GitLab commits
    should be absent. Only the triggering tag should have been added.

13. **GitHub — confirm the existing publisher ran.** In **Actions > Publish**,
    find the run triggered by the new tag's push, check its commit SHA, and
    inspect its npm publish/provenance outcome. The separate **CI** workflow may
    also run for the `main` update. A successful GitLab synchronization proves
    only delivery of refs; it does not prove npm publishing succeeded. If the
    tag already existed identically, another no-op push will not create a new
    publishing event. Diagnose/re-run the original Actions run instead of
    deleting/recreating the tag or making a second publishing pipeline.

## Failure diagnosis and recovery

| Symptom                                                  | Check/action                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No pipeline/job for a release tag                        | The tagged commit must contain this CI file; source must be `push`, tag must match the bare version regex, and the push must not suppress CI. A manually started `web` or API pipeline is intentionally excluded.                                                                                                       |
| Job is pending                                           | Check runner availability, protected-tag eligibility, **Run untagged jobs**, executor support, and resource-group queue. A queued older release will not rewind the branch.                                                                                                                                             |
| Missing/nonempty File variable error                     | Check exact variable names/types, environment scope `*`, protected tag status, and permissions. Protected variables are unavailable on unprotected tags. Never print them for diagnosis.                                                                                                                                |
| Invalid key / `error in libcrypto` / passphrase error    | Re-paste the complete unencrypted OpenSSH private key as a File variable with LF line endings and a final newline. Confirm its matching public key was installed on GitHub.                                                                                                                                             |
| Host verification fails                                  | Verify `github.com` entries and current fingerprints independently, then update the trusted File variable. Do not disable host verification or dynamically scan/trust keys.                                                                                                                                             |
| `Permission denied (publickey)` / repository not found   | Check the destination repository, matching dedicated deploy key, **Allow write access**, and organizational deploy-key restrictions. The identity is isolated from other SSH agents/configuration.                                                                                                                      |
| GitLab fetch fails / tag SHA mismatch / tag outside main | Check source access, immutable tag, and successful version-commit push to GitLab `main`. If a separate branch push was delayed, let it complete and retry the failed **tag job**, which retains the original push pipeline source.                                                                                      |
| GitHub main missing / outside GitLab history / divergent | Inspect both histories. Preserve legitimate work by integrating it through GitLab's normal review process. The existing mirrored GitHub repository must already have `main`; this job does not bootstrap a missing branch or rewrite history. Then retry, or use the next intended release if the histories require it. |
| Push rejected by branch/tag rules                        | Check the exact key's ability to fast-forward `main` and create version tags under current GitHub rules. Atomic push means a rejected ref prevents all requested updates. Resolve policy narrowly, then retry the failed job.                                                                                           |
| Existing tag rejected                                    | Compare full tag-object SHAs, including annotations/signatures. Same commit with a different tag object is still a conflict. Do not force/delete/recreate the published tag; investigate and choose the next release version through the normal process.                                                                |
| Non-fast-forward after another writer ran                | Stop unexpected writers (especially the old mirror), inspect current refs, then retry the original failed tag job. There is no force fallback.                                                                                                                                                                          |
| Atomic push unsupported                                  | Use a destination/server setup that supports atomic Git pushes. The script intentionally fails without falling back to a partial update.                                                                                                                                                                                |
| GitLab succeeds, Actions/npm fails or does not start     | Confirm Actions settings, tag SHA/filter, original run, and existing npm authentication. Job success does not validate npm configuration. Re-running synchronization with an already-present tag will not retrigger publishing.                                                                                         |
| Local release command fails before pushing               | Check clean `main`, upstream/tag permissions, lint/build results, and the pre-existing optional `--github.release` host/API caveat above. The CI job cannot run before GitLab receives the tag.                                                                                                                         |

Retry the failed job in its original **push/tag** pipeline after correcting a
transient/setup error. Do not create a manual replacement pipeline or a new tag
for recovery. A retry with refs already delivered is safe and does not republish.
Keep synchronization enabled only for this GitLab project. If rollback of the
cutover is needed, decide explicitly whether to restore the recorded automatic
mirror: doing so also restores synchronization on ordinary pushes.

## Validation boundary

Implementation was reviewed and validated locally, without contacting GitLab,
GitHub, npm, or an SSH server. The following checks passed:

- YAML parsing with the installed `yaml` package and structural assertions;
  64 source/ref combinations for the tag-only rule.
- `/bin/sh -n` and `/bin/bash -n` on the extracted job script.
- 21 isolated command-stub scenarios covering forward/equal/older releases,
  missing or incorrectly typed credentials, changed tags, source/destination
  ancestry failures, key/host errors, rejected pushes, and concurrent writers.
  Assertions checked exact refspecs, SSH verification flags, temporary-file
  cleanup, and exclusion of the later untagged source tip.
- Read-only checks of existing local annotated tags and commit ancestry, plus
  installed release-tool and existing publishing-workflow contracts.
- `prettier --check` for the new CI file and guide, local documentation links,
  LF line endings, and `git diff --check`.

The simulations stubbed every Git fetch/push and SSH-key command; they did not
exercise a real server or generate credentials. No application build/test run
was needed for this CI/documentation change. Real instance CI Lint,
protected-ref/variable behavior, runner access, deploy-key authorization, atomic
server support, and Actions/npm behavior must be validated by the administrator
in the steps above. No successful remote synchronization or publication is
claimed.
