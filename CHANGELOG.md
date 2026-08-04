# Changelog

## [1.3.0](https://github.com/raslan/swapyard/compare/v1.2.2...v1.3.0) (2026-08-04)


### Features

* add linking to the other page on the model itself ([d6e02c1](https://github.com/raslan/swapyard/commit/d6e02c1e17dcb25206190b0dd05a7f2d60107b3b))

## [1.2.2](https://github.com/raslan/swapyard/compare/v1.2.1...v1.2.2) (2026-08-04)


### Bug Fixes

* permissions for hf_cache ([083d166](https://github.com/raslan/swapyard/commit/083d166bb24c29a0bc022405beeacb34afd6a752))

## [1.2.1](https://github.com/raslan/swapyard/compare/v1.2.0...v1.2.1) (2026-08-04)


### Bug Fixes

* adjust dockerfile tmp mounting ([b662f08](https://github.com/raslan/swapyard/commit/b662f0896a5f4d09acddfa60136a90a1f4d0ccd7))

## [1.2.0](https://github.com/raslan/swapyard/compare/v1.1.0...v1.2.0) (2026-08-04)


### Features

* add new mmproj handler ([4bbe391](https://github.com/raslan/swapyard/commit/4bbe3917058776cb1d18590dc0613a9f1b90f458))

## [1.1.0](https://github.com/raslan/swapyard/compare/v1.0.0...v1.1.0) (2026-08-04)


### Features

* adjust browsepage sort width ([b7e7056](https://github.com/raslan/swapyard/commit/b7e7056e7a3745e5233ba4b50873bd77f4a044d6))
* adjust model weight cushion for recommendations ([5e522e8](https://github.com/raslan/swapyard/commit/5e522e82c1162c004a6c4d5118b9da8785d7cb50))
* allow scroll on settings page ([e758332](https://github.com/raslan/swapyard/commit/e7583322fab4edc34ce614ac5670e4ceee4befcd))

## 1.0.0 (2026-08-01)


### Features

* add add_model_entry for inserting a new config.yaml model entry ([d3d4315](https://github.com/raslan/swapyard/commit/d3d431581287d119f8c8914065276db170ed3794))
* add backend API client with snake_case to camelCase mapping ([71e42b9](https://github.com/raslan/swapyard/commit/71e42b92f9b9be12fab58bdd20f34811a7741bb4))
* add browse routes for search and model detail ([77054c1](https://github.com/raslan/swapyard/commit/77054c1635f9f8c40ccc0c4cb7723498eb083efe))
* add browse service for search and model detail ([06ab80f](https://github.com/raslan/swapyard/commit/06ab80fdc08833741697ca3d290fd507ddc9f3cd))
* add Create config entry action to ManageRow ([b58532e](https://github.com/raslan/swapyard/commit/b58532edc0affc4993545272198246ac03711316))
* add createConfigEntry API client function ([0e633c7](https://github.com/raslan/swapyard/commit/0e633c74f648f2ad4cf7ea9a75d54bcca943e7e8))
* add delete confirmation dialog to Manage screen ([b8d3859](https://github.com/raslan/swapyard/commit/b8d3859041ef0ae29145b9a33e79b0eb01f2468c))
* add downloads routes with SSE progress streaming ([d4fe5db](https://github.com/raslan/swapyard/commit/d4fe5db9a9ba387a43598c9fb22641b53cd6e435))
* add downloads service with progress tracking and cancellation ([ee247a9](https://github.com/raslan/swapyard/commit/ee247a9a04cd57608c363187a0d259706c824cfa))
* add GET /api/browse/{repo_id}/vram-estimate route ([9302afa](https://github.com/raslan/swapyard/commit/9302afa4aed494ddc4723b0d58742ccfa61e8646))
* add GET/PUT /api/settings routes ([04a592c](https://github.com/raslan/swapyard/commit/04a592c3a8b81bb146d8e54a0f1246dcb55e7359))
* add GGUF header range-fetch and binary metadata parser ([c999775](https://github.com/raslan/swapyard/commit/c999775bb731bd59d2ba2eb14373e0e5ff69dc6f))
* add lucide icons to Browse detail, Manage row, and Manage page ([3e7285c](https://github.com/raslan/swapyard/commit/3e7285c2b6b63fdef685d5a1f09057af3c9d2928))
* add lucide icons to Sidebar, Browse page, FileRow, and ModelCard ([34d448a](https://github.com/raslan/swapyard/commit/34d448a55d954bb349d7f0256dfcb9d599a9c4f6))
* add manage routes for listing and deleting models ([14e45c7](https://github.com/raslan/swapyard/commit/14e45c7921c5f4060b27ebfedb1fbf4662191756))
* add manage service for listing and deleting cached models ([ad8818f](https://github.com/raslan/swapyard/commit/ad8818f274210256d8ae27b9d681afa8b5dbaa98))
* add minimal --fit-only cmd builder for new config entries ([52c98f8](https://github.com/raslan/swapyard/commit/52c98f8158d3e5a6021e3b87a1f91492b7ec2557))
* add POST /api/config/models to create a config entry from a downloaded model ([588a9d7](https://github.com/raslan/swapyard/commit/588a9d76d49a5881186ded17cc635c731a1a78e1))
* add pydantic schemas for the config editor API ([c2bf3f2](https://github.com/raslan/swapyard/commit/c2bf3f2229417233b415222763ed65807e9963d2))
* add QuantGroup component for grouped VRAM-estimate display ([7cf6b56](https://github.com/raslan/swapyard/commit/7cf6b564b31c294f794319878751d050c03f04b7))
* add react-router setup with app shell and page routes ([6ce756a](https://github.com/raslan/swapyard/commit/6ce756ae5c799633c1bf1d0322ef11c68ba134dd))
* add scoped Motion transitions to grid, list, and route changes ([5ced279](https://github.com/raslan/swapyard/commit/5ced279dc9bec4c8d8f0bf1bac72faa956502b5f))
* add settings API client and useSettings hook ([46c40f3](https://github.com/raslan/swapyard/commit/46c40f36820722890ccad04493f965de8a75e42f))
* add Settings page, nav entry, and route ([9f3f25d](https://github.com/raslan/swapyard/commit/9f3f25d2b40d0f078d98431ced9bef319b0cc4e9))
* add settings service for persisting the VRAM budget ([a78839e](https://github.com/raslan/swapyard/commit/a78839e0cbc29ce41bf7c80625f6542f16aba1cb))
* add shared frontend type definitions ([e7a5f56](https://github.com/raslan/swapyard/commit/e7a5f56790556c6172b9757d2cef2b28d980d506))
* add size, number, and speed formatting utilities ([d6406a3](https://github.com/raslan/swapyard/commit/d6406a30f8bf62be37a4813572b0cfbc3a42847a))
* add uniform error response handling ([6292907](https://github.com/raslan/swapyard/commit/6292907ee740807ad6cad5e66138ca99082de491))
* add useDownloads hook with SSE reattachment ([8d3dbaf](https://github.com/raslan/swapyard/commit/8d3dbaf4b2aa31c88266ed3314c79a0ae55cef6c))
* add useManagedModels hook ([5883a48](https://github.com/raslan/swapyard/commit/5883a48c1908d0bb5c46a1a321ad5544cc286e17))
* add useModelDetail hook ([9b4cd07](https://github.com/raslan/swapyard/commit/9b4cd07063e2c0e2e7733834a30d64b14af227d5))
* add useModelSearch hook with debounced search ([cd1eb34](https://github.com/raslan/swapyard/commit/cd1eb340875b80b96fecaa0a0c1fde3b592a65f9))
* add VRAM estimate API client and useVramEstimate hook ([499b1f0](https://github.com/raslan/swapyard/commit/499b1f06dd0116de9e693f3c87a48e39e0de6243))
* add VRAM estimate service (shard grouping + weights+KV formula) ([bbdd4fc](https://github.com/raslan/swapyard/commit/bbdd4fcb5a91f00e719399c8ba37a9478ad0b9bb))
* advisory-only llama-server flag hover/completion inside cmd blocks ([12eeed9](https://github.com/raslan/swapyard/commit/12eeed9fea87d1e57e983996111c32bb2a134440))
* apply_config orchestrates conflict check, validation, write, and health verification ([5e8ae74](https://github.com/raslan/swapyard/commit/5e8ae74eb0bc3a27b617514b3873027d7d5f5821))
* assembled config editor page ([8181d10](https://github.com/raslan/swapyard/commit/8181d1008fdbc61a104ed4e9bab008f5ae206c58))
* badge every fitting quant, mark the largest as Recommended ([2d240e2](https://github.com/raslan/swapyard/commit/2d240e2835c55402aaaa8252f609194e0739b61f))
* config editor API client and types ([90b784a](https://github.com/raslan/swapyard/commit/90b784a06c48e9bb50c57c591d819fbf34bd44c6))
* config editor REST API (read, schema, status, history, apply) ([c1ac49c](https://github.com/raslan/swapyard/commit/c1ac49caf78a725e1c8096b884222e196f123c4e))
* Config nav entry with failure badge, wire /config route ([384d7e5](https://github.com/raslan/swapyard/commit/384d7e50569b80e368eb04f85b7d6a5cf5f63efd))
* create llama-swap config entries from a downloaded model in one dialog ([916730b](https://github.com/raslan/swapyard/commit/916730b78fb84d4d270198381c2aac538e05db88))
* custom Swapyard Monaco theme plus curated preset themes ([7eadc40](https://github.com/raslan/swapyard/commit/7eadc400ea9c83dccdc3c46f171d0ccb8d2ffe59))
* derive VRAM fit budget from structured hardware profile ([89a300d](https://github.com/raslan/swapyard/commit/89a300d327d5c622bfcd5cf3235d634e47877d6e))
* enable --jinja and KV cache quantization in the generated config entry ([3dfc2c1](https://github.com/raslan/swapyard/commit/3dfc2c1869d7cd27078350e6f6c43fa24420f336))
* extract llama-server flags into the image at build time ([a6b306c](https://github.com/raslan/swapyard/commit/a6b306cd4071e50c6307517dfc46a36c2852fb6a))
* git-backed config revision history via dulwich ([e76fbaa](https://github.com/raslan/swapyard/commit/e76fbaad681f90842a01690a4573dfd6ece64a24))
* hardware profile UI (GPU list / unified memory) on Settings page ([e29941b](https://github.com/raslan/swapyard/commit/e29941b0905d16a68b923af9d0c1fdea68204da7))
* implement Browse detail page with overview and files tabs ([564c532](https://github.com/raslan/swapyard/commit/564c5320c38fbb20d0b8a8dbcf373d2ae457a851))
* implement Browse page with model search grid ([54d622d](https://github.com/raslan/swapyard/commit/54d622d068fda6d9f7765eb3cf06c3f2bead0e2d))
* implement collapsible sidebar with route-aware nav links ([7fb2d68](https://github.com/raslan/swapyard/commit/7fb2d68372fcf18b11b9bbe1afe63c39bb4f7603))
* implement Manage page with active downloads and delete ([fceb0a2](https://github.com/raslan/swapyard/commit/fceb0a27417940104f3a8ca13c5541443135b3d1))
* match config entries to downloaded models, synced deletion, and fix monaco integration ([e949a03](https://github.com/raslan/swapyard/commit/e949a0368916ae071a87d9e9aa10e3c1349d717b))
* Monaco worker environment and YAML schema wiring ([edfe5b7](https://github.com/raslan/swapyard/commit/edfe5b71527b0eb62d33ce883448db9052e06f1f))
* port mockup visual effects (card glow, gradient borders, ambient background, noise overlay) ([bd7c931](https://github.com/raslan/swapyard/commit/bd7c931111548d5642b09547cf4a5efe1b3643b6))
* read config.yaml content and compute a content hash ([aa234fd](https://github.com/raslan/swapyard/commit/aa234fdefc7927f501a6ae4a5c6f9ef032603008))
* rebuild Browse into a Discover surface, richer cards, per-quant delete ([ee7075e](https://github.com/raslan/swapyard/commit/ee7075e3770231e63b699bb3936ec078467f8242))
* replace flat VRAM budget setting with structured hardware profile ([72fb94c](https://github.com/raslan/swapyard/commit/72fb94c3917a578bd154c5f1521bdee79cbbeffa))
* replace placeholder favicon with the anchor logo icon ([519c372](https://github.com/raslan/swapyard/commit/519c37235d4474b444455ed26960830af5fd81f3))
* reusable Monaco diff view component ([554e5eb](https://github.com/raslan/swapyard/commit/554e5ebd605e6e0cd515e263b18212bba865a6fa))
* revision history list with diff preview ([3fc19d9](https://github.com/raslan/swapyard/commit/3fc19d99aa9a31d23a93af562b4e951fdf591670))
* scaffold FastAPI backend with health endpoint ([96efc71](https://github.com/raslan/swapyard/commit/96efc71c4b2543f7fb29041c0a4a91f5d3195184))
* self-host JetBrainsMono Nerd Font for the config editor ([516f3ac](https://github.com/raslan/swapyard/commit/516f3acb0b2791d2f248dadcd5efabb21bffa907))
* serve built frontend as static files when present ([97b5d97](https://github.com/raslan/swapyard/commit/97b5d972a21a078da415f322ab31a7f2fe176c53))
* serve extracted llama-server flags via GET /api/config/flags ([b907ff1](https://github.com/raslan/swapyard/commit/b907ff1910e69aff10bd42c40a0f84cc4d520ce2))
* show a loading spinner while the README iframe measures its height ([180dec2](https://github.com/raslan/swapyard/commit/180dec2d0640bcb708b750550566c3c42d7a0663))
* show grouped VRAM estimates and fit badge on the Files tab ([a073404](https://github.com/raslan/swapyard/commit/a0734049f8e4172077e8f82201fcfe6c23c4f556))
* structured hardware settings, first-run onboarding, GPU catalog ([02ad89b](https://github.com/raslan/swapyard/commit/02ad89b863bba88c9c72b3ccfd6f619c6736f96c))
* surface downloaded quant filenames on the Manage screen (backend) ([b4b4fd7](https://github.com/raslan/swapyard/commit/b4b4fd78956f69b46c17115c7a29bd6c7ac077cc))
* surface downloaded quant filenames on the Manage screen (frontend) ([55bebaf](https://github.com/raslan/swapyard/commit/55bebaf91a7fab9a478547b694d9ce16b3eebc40))
* switch frontend settings API client to structured hardware profile ([93b4c1e](https://github.com/raslan/swapyard/commit/93b4c1e403011eca1ba4387adac1e5a90bc6c687))
* update useSettings hook for structured hardware profile ([b1cc1a3](https://github.com/raslan/swapyard/commit/b1cc1a37cde5016334cba1395d9322ba8dda64be))
* useConfig hook - load, save/apply, conflict, status, history state ([afa8d1d](https://github.com/raslan/swapyard/commit/afa8d1d7dbd266e749042293f76294f80240fa1a))
* validate and serve structured hardware profile via settings API ([4ea20b5](https://github.com/raslan/swapyard/commit/4ea20b5bbf46884b4e22c789016c43b4a1ca8f80))
* validate config.yaml against llama-swap's vendored JSON schema ([83a2108](https://github.com/raslan/swapyard/commit/83a2108e1b39d3bdd84be605064281ce9bd939e3))


### Bug Fixes

* --fit requires an explicit on/off value, not a bare flag ([3c23a3b](https://github.com/raslan/swapyard/commit/3c23a3b7777a1cb67c35edda79dad51e2913002b))
* add SPA fallback for client-side routes ([2c574d7](https://github.com/raslan/swapyard/commit/2c574d75aa2c90aea7756e5e849fbd40b1c2b936))
* add type hints, non-404-masking test, and API 404 fix to SPAStaticFiles ([84b4c16](https://github.com/raslan/swapyard/commit/84b4c1699d6c070d8689ed02b8e9f2817abf7a6b))
* avoid redundant HF fetch in VRAM estimate, guard against deeply nested GGUF arrays ([7600993](https://github.com/raslan/swapyard/commit/7600993c215497bfe7400dc770db8a06ccf292c3))
* cancel_download returns false for already-finished tasks ([4d68bb6](https://github.com/raslan/swapyard/commit/4d68bb6d6c45a496e9152416cb41510d33177276))
* convert HTTP/network errors in fetch_gguf_header to GgufParseError ([0f8cdbc](https://github.com/raslan/swapyard/commit/0f8cdbc68708a10dfee42e884224ac18795c53ca))
* correct hsl()/oklch() color-function mismatch in shadcn Tailwind config ([e2a76c7](https://github.com/raslan/swapyard/commit/e2a76c703f7da738df71ad3ff2fef4eccc4a0f4c))
* defer setState calls in useModelDetail effect to satisfy set-state-in-effect lint rule ([b8ed024](https://github.com/raslan/swapyard/commit/b8ed02439847777b12ebaa4e149eacf158b1fa7b))
* diff each revision against the one before it, not against live editor content ([22de2e1](https://github.com/raslan/swapyard/commit/22de2e1df743c128f9a1877b794c440c079c4665))
* distinguish ConfigConflict from model-id-collision in createConfigEntry's 409 handling ([5aec1fc](https://github.com/raslan/swapyard/commit/5aec1fc67bc9fc7543a8a6b93d71ab3dde7bbb8a))
* explicit --fit, visible proxy/checkEndpoint defaults, no more cmd line-wrap ([d98df08](https://github.com/raslan/swapyard/commit/d98df08549bb6623947ed227eecbefb0e7ba814c))
* fetch README via raw HTTP GET instead of hf_hub_download to avoid polluting the managed-models cache ([c15a366](https://github.com/raslan/swapyard/commit/c15a3662cceafc985fa5d6096f08fe12f68145fe))
* handle missing cache dir and strengthen sort test coverage ([9703369](https://github.com/raslan/swapyard/commit/9703369fdf7fac2ed310eaf406703d3fbe77c38c))
* handle per-layer attention.head_count_kv arrays in KV cache formula ([351a95b](https://github.com/raslan/swapyard/commit/351a95b245efa6ed6461f6ae46666c2cd456b9f7))
* make apply_config properly async instead of calling asyncio.run() from a running loop ([0ed0836](https://github.com/raslan/swapyard/commit/0ed08366a0670c58f31340639c43f58baa75f387))
* make shadcn primitives use dark theme permanently (app has no light mode) ([410e06a](https://github.com/raslan/swapyard/commit/410e06a5c4889f0478dbcc228f36e1f595615265))
* multiline cmd block style, correct key order, proxy=127.0.0.1, add ttl ([71e9de7](https://github.com/raslan/swapyard/commit/71e9de7cd7a5973223a213a9b11e9448f8b701b9))
* narrow browse service error handling and add detail happy-path test ([27b1e4c](https://github.com/raslan/swapyard/commit/27b1e4c105ba4867de2370a9222de0b3021f465f))
* put --fit and its on/off value on one line, matching other flags ([d71517b](https://github.com/raslan/swapyard/commit/d71517b575ae0c50d330303829e96d2c434914cd))
* QuantGroup label test now exercises real filename extraction, not a pre-extracted string ([9dad526](https://github.com/raslan/swapyard/commit/9dad5267fbde4e64aad700892d0ff4f8e12b27f2))
* README iframe sizing, loading state, and color-token cleanup ([2e776ea](https://github.com/raslan/swapyard/commit/2e776ea3248fd4d6ebc07a8845ade8f8f0c3a023))
* refresh managed models list when a download completes ([2e8520b](https://github.com/raslan/swapyard/commit/2e8520be6028fc76a532edd41b41fc31d707832e))
* register YAML syntax highlighting, missing after narrowing the monaco-editor import ([3bdcc6e](https://github.com/raslan/swapyard/commit/3bdcc6ec811b02b536f416434b06853dcde60ab8))
* reject unhonored HTTP Range requests in GGUF header fetch ([9eeb483](https://github.com/raslan/swapyard/commit/9eeb483976b2eb333915e563bd561dca0eb8cae4))
* remove nonexistent direction param from list_models call ([e5002f0](https://github.com/raslan/swapyard/commit/e5002f00741be1aea907826aaa48f5188b151ffa))
* render raw HTML embedded in README markdown, sanitized against XSS ([a130ce6](https://github.com/raslan/swapyard/commit/a130ce676e9610a8bacba340b6cf61295cd16957))
* resolve lint errors in useVramEstimate and SettingsPage ([9f0324f](https://github.com/raslan/swapyard/commit/9f0324f9b445749fa7d4392af7a086f79020a080))
* restore baked-in border/input hairline opacity after opacity-modifier fix ([74f7d21](https://github.com/raslan/swapyard/commit/74f7d2166ab9f6a1934b1a3af134e928aa6dec03))
* restore Tailwind opacity-modifier support for shadcn color tokens ([283d569](https://github.com/raslan/swapyard/commit/283d5697b5df8b36525bb13098ceb0a6860fcae6))
* restore visual parity with mockup, rework README rendering, add richer download progress ([307d7d7](https://github.com/raslan/swapyard/commit/307d7d72c018e01bbad2155fa94f3027cec2d64b))
* revision history layout, no-feedback apply, and always-clickable Save & Apply ([f428436](https://github.com/raslan/swapyard/commit/f4284361c5a53e7c1d6d4ac81c5ae52ff1242c0a))
* route /browse/:repoId as a wildcard so slash-containing repo ids match ([cd3a8ac](https://github.com/raslan/swapyard/commit/cd3a8ac385503a6b3df4a78c7ffade823df4ef9a))
* show error feedback for invalid VRAM input and save failures ([5cc734f](https://github.com/raslan/swapyard/commit/5cc734fc3184c151fa372b4d73eeea00d2c0679e))
* strip .gguf extension from the -hf colon value, llama.cpp appends it internally ([18a1433](https://github.com/raslan/swapyard/commit/18a14334c729b65c44e0564727e3150042c48f15))
* surface unexpected save errors, and give revision diff a proper full-size view ([620f26b](https://github.com/raslan/swapyard/commit/620f26b7400d693e82aa4689e16eb373f525d0b3))
* switch to eslint flat config instead of pinning deprecated v8 ([5c2307f](https://github.com/raslan/swapyard/commit/5c2307f27bd5c22053605c3be35f6e2f98345de2))
* wire Monaco to the locally bundled monaco-editor, not the CDN default ([45fda3f](https://github.com/raslan/swapyard/commit/45fda3fe296b9c283fa83b76f8e481a17458d6a6))


### Performance Improvements

* parallelize model-detail fetches and stop blocking the event loop ([826f4b7](https://github.com/raslan/swapyard/commit/826f4b7fc519a01a319860acfc96be183c4e9c34))

## Changelog

All notable changes to this project will be documented in this file.
Commits follow the [Conventional Commits](https://www.conventionalcommits.org/) spec.
