# Cloudflare Data Pro Design

## Product Positioning

玄球 Oracle will be positioned as a sports data and entertainment analysis product. It will not provide betting, bet placement, proxy betting, prize pools, wagering, lottery purchasing, or outbound links to betting platforms.

The paid feature will be named "赛事数据 Pro" instead of "盘口付费". Paid users buy access to real-time or near-real-time event data, market movement, and analysis displays. The product must avoid language such as "下注", "跟单", "红单", "稳胆", "必中", "代投", or "推荐投注".

Required disclaimer:

```text
本站仅提供体育赛事数据、赔率变化展示与娱乐分析，不提供下注、代投、返奖、奖金池或博彩服务，不构成投注、投资或财务建议。请遵守所在地法律法规。
```

## Legal And Payment Boundaries

The target users are primarily Chinese-language users. The site should therefore minimize payment and content-review risk by operating as an information technology and sports data service.

Recommended business scope wording for the operator:

```text
软件开发；网络技术服务；信息技术咨询服务；互联网数据服务；数据处理和存储支持服务；大数据服务；信息咨询服务（不含许可类信息咨询服务）；体育赛事策划；体育赛事咨询服务；广告设计、代理；广告发布。
```

Recommended payment product wording:

```text
赛事数据会员
体育赛事数据分析服务
实时赛事数据查看服务
Pro 数据会员
赛事信息订阅服务
```

Avoid payment product wording:

```text
盘口会员
赔率会员
投注技巧
下注推荐
红单服务
稳胆预测
```

If the site accepts paid access from mainland China and provides paid information services, the operator should review whether ICP filing and/or a commercial ICP license is required before production launch.

## Deployment Architecture

Use Cloudflare Workers as the full-stack runtime:

- Worker serves the frontend assets and backend API.
- D1 stores match data, results, user entitlements, prediction snapshots, free-use counters, and source audit records.
- KV caches odds/data-provider responses to reduce API cost and prevent excessive provider calls.
- Cloudflare Secrets stores provider API keys and payment secrets.
- Cron Triggers periodically update match results and data snapshots.

Initial API surface:

- `GET /api/matches`: schedules, match status, scores, source metadata.
- `GET /api/matches/:id/odds`: data-gated market data with daily free-use logic.
- `GET /api/predictions/:matchId`: deterministic prediction result for the selected methods.
- `GET /api/accuracy`: cumulative post-match accuracy per method.
- `POST /api/payments/create`: creates a paid plan order when payment integration is ready.
- `POST /api/payments/webhook`: updates user entitlement from payment provider callbacks.

## Data Source Rules

Every displayed score, schedule item, and market-data snapshot must include visible source and update time. The UI must not link users to betting sites.

Data categories:

- Schedule and results: FIFA, ESPN, CBS Sports, BBC, The Guardian, or equivalent sports media/API sources.
- Market data: licensed or authorized odds/data aggregators such as The Odds API, API-Football Odds, Sportmonks, Sportradar, or API-SPORTS.
- AI and metaphysical predictions: internal玄球 Oracle model.

Each imported data record should store:

```text
source_name
source_url
provider
fetched_at
market_type
match_id
raw_snapshot_hash
```

Frontend display pattern:

```text
数据来源：The Odds API
更新时间：2026-06-24 20:15
仅供赛事数据参考，不提供投注入口。
```

## Paid Access Model

Use a simple model:

- Free: one market-data view per user per day.
- Day Pass: unlock all market-data views for the current calendar day.
- Monthly Pro: unlock market-data views for 30 days.

Suggested initial prices:

- Day Pass: RMB 6.9
- Monthly Pro: RMB 29.9

The backend decides access. The frontend never receives provider API keys and never directly calls market-data providers.

Free-use tracking:

- Prefer account-based tracking once login exists.
- Before login, use a device/browser visitor ID with server-side daily counter.
- Do not claim strong anti-abuse until account login and payment identity exist.

## UI Requirements

Market-data cards should use safer labels:

- 实时赛事数据
- 市场热度
- 赔率变化
- 胜平负参考指数
- 大小球数据

Avoid unsafe labels:

- 投注盘口
- 下注赔率
- 买入推荐
- 红单
- 稳胆

Locked state:

```text
今日免费次数已用完
开通赛事数据 Pro 后可继续查看实时数据、赔率变化和市场热度。
```

The result and schedule screens should continue to show:

- Match score/status.
- Source and update time.
- Prediction result.
- Total goals prediction.
- Kickoff-team prediction.
- Per-method accuracy after matches finish.

## Deterministic Prediction Rule

Predictions must remain deterministic:

- Same match, same selected method set, same app version, same source snapshot should produce the same result for every user.
- User identity, payment state, browser randomness, and refresh count must not change prediction results.

If provider data changes, store a snapshot ID so predictions can explain which data version was used.

## Testing And Verification

Required tests:

- API returns source metadata for schedules, results, and market-data snapshots.
- Free daily market-data access decrements exactly once per match view.
- Paid entitlements unlock market data.
- Expired entitlements relock market data.
- Predictions remain deterministic for the same inputs.
- Accuracy updates from finished matches.
- Frontend never renders betting-platform outbound links.

Manual verification:

- Mobile viewport schedule page.
- Locked and unlocked market-data card.
- Result page with source labels.
- Payment webhook happy path and failed/expired path once payment is integrated.

## Out Of Scope For First Backend Version

- User-to-user competitions.
- Prize pools or rewards.
- Betting site redirects.
- Proxy betting or purchasing.
- Guaranteed prediction claims.
- Public betting recommendations.
