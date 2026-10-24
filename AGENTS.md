<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Outfit generation uses streaming server-route edits and two ordered image calls with the first result as a continuity reference, because streaming multi-output view indexing is not documented.
- Generation records and source photos remain device-only with optional front/back fields, preserving legacy records and permitting a single-view manual retry.
- Store only AI access-block status in Lovable Cloud; never store design history there, and fail closed when the access guard cannot be read.
- Customization catalogs and prompt rules are shared browser-safe logic; store selections in the existing device record and render their summary with one shared component to preserve legacy records without a migration.
- Keep wizard steps as presentation state around the existing generation configuration, and filter shared customization panels by section; this preserves complete requests when navigating between steps.
