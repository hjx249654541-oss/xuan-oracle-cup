import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Dices,
  Lock,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Trophy
} from "lucide-react";
import { formatChinaKickoff, formatLocalKickoff, getChinaKickoffDate, worldCupMatches, type MatchPhase, type WorldCupMatch } from "./data/schedule";
import { buildPrediction, getMethodAuditTrail, predictionMethods, type MethodAudit, type MethodId } from "./lib/prediction";
import { buildAccuracy, type MethodAccuracy } from "./lib/accuracy";
import { loadAccuracy, loadMarketData, loadMatches, type MarketDataResponse } from "./lib/apiClient";
import { getDefaultScheduleDate, getDefaultSelectedMatchId } from "./lib/scheduleView";
import { getPrimaryActionLabel } from "./lib/uiCopy";
import type { MatchDTO, MarketSnapshotDTO } from "./server/types";

type PhaseFilter = "全部" | MatchPhase;
type ViewTab = "赛程" | "测算" | "结果";

const methodIcons: Record<MethodId, string> = {
  tarot: "☉",
  liuren: "✦",
  astro: "♍",
  meihua: "卦",
  qimen: "门",
  oracle: "签",
  ai: "AI"
};

function App() {
  const [todayKey, setTodayKey] = useState(getTodayDateKey);
  const [matches, setMatches] = useState<WorldCupMatch[]>(worldCupMatches);
  const dates = useMemo(() => Array.from(new Set(matches.map(getChinaKickoffDate))).sort(), [matches]);
  const [activeDate, setActiveDate] = useState(() => getDefaultScheduleDate(worldCupMatches, getTodayDateKey()));
  const [dateTouched, setDateTouched] = useState(false);
  const [phase, setPhase] = useState<PhaseFilter>("全部");
  const [selectedMatchId, setSelectedMatchId] = useState(() => getDefaultSelectedMatchId(worldCupMatches, getTodayDateKey()));
  const [enabledMethods, setEnabledMethods] = useState<MethodId[]>(["ai", "qimen", "tarot"]);
  const [tab, setTab] = useState<ViewTab>("赛程");
  const [hasRun, setHasRun] = useState(false);
  const [openReadingId, setOpenReadingId] = useState<MethodId | null>(null);
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);
  const [marketError, setMarketError] = useState("");
  const [accuracy, setAccuracy] = useState<MethodAccuracy[]>(buildAccuracy(worldCupMatches));

  useEffect(() => {
    refreshRemoteData({ jumpToToday: true });
    const clockId = window.setInterval(() => setTodayKey(getTodayDateKey()), 60000);
    const intervalId = window.setInterval(refreshRemoteData, 60000);
    return () => {
      window.clearInterval(clockId);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const nextActiveDate = getDefaultScheduleDate(matches, todayKey);
    if (!dates.includes(activeDate) || (!dateTouched && activeDate < todayKey)) {
      setActiveDate(nextActiveDate);
      setSelectedMatchId(getDefaultSelectedMatchId(matches, nextActiveDate));
    }
  }, [activeDate, dateTouched, dates, matches, todayKey]);

  useEffect(() => {
    setMarketData(null);
    setMarketError("");
  }, [selectedMatchId]);

  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? matches[0] ?? worldCupMatches[0];
  const visibleMatches = matches.filter((match) => {
    const dateMatches = getChinaKickoffDate(match) === activeDate;
    const phaseMatches = phase === "全部" || match.phase === phase;
    return dateMatches && phaseMatches;
  });
  const prediction = useMemo(() => buildPrediction(selectedMatch, enabledMethods), [enabledMethods, selectedMatch]);

  function toggleMethod(methodId: MethodId) {
    setEnabledMethods((current) => {
      if (current.includes(methodId)) {
        return current.length === 1 ? current : current.filter((id) => id !== methodId);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, methodId];
    });
  }

  function runPrediction() {
    if (tab === "结果" && hasRun) {
      setTab("测算");
      setOpenReadingId(null);
      return;
    }
    setHasRun(true);
    setOpenReadingId(enabledMethods[0] ?? null);
    setTab("结果");
  }

  function refreshSchedule() {
    refreshRemoteData({ jumpToToday: true });
  }

  function refreshRemoteData(options: { jumpToToday?: boolean } = {}) {
    loadMatches()
      .then((items) => {
        const nextMatches = items.map(matchDtoToWorldCupMatch);
        setMatches(nextMatches);
        if (options.jumpToToday) {
          const nextToday = getTodayDateKey();
          const nextDate = getDefaultScheduleDate(nextMatches, nextToday);
          setTodayKey(nextToday);
          setDateTouched(false);
          setActiveDate(nextDate);
          setSelectedMatchId(getDefaultSelectedMatchId(nextMatches, nextDate));
        }
      })
      .catch(() => setMatches(worldCupMatches));
    loadAccuracy()
      .then(setAccuracy)
      .catch(() => setAccuracy(buildAccuracy(worldCupMatches)));
  }

  async function revealMarketData() {
    setMarketError("");
    try {
      const response = await loadMarketData(selectedMatch.id, getVisitorId());
      setMarketData(response);
    } catch (error) {
      setMarketData(null);
      setMarketError(error instanceof Error ? error.message : "市场数据暂不可用");
    }
  }

  return (
    <main className="page-shell">
      <section className="phone-frame" aria-label="玄球 Oracle">
        <div className="stadium-glow" aria-hidden="true" />
        <header className="app-header">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Trophy size={24} aria-hidden="true" />
            </div>
            <div>
              <h1>玄球 Oracle</h1>
              <p>世界杯赛程 · 多术法测算</p>
            </div>
          </div>
          <button className="ghost-button" type="button" aria-label="更新赛程" onClick={refreshSchedule}>
            <RefreshCw size={17} aria-hidden="true" />
            <span>更新赛程</span>
          </button>
        </header>

        <nav className="tab-bar" aria-label="主要视图">
          {([
            ["赛程", CalendarDays],
            ["测算", CircleDot],
            ["结果", BarChart3]
          ] as const).map(([item, Icon]) => (
            <button key={item} className={tab === item ? "active" : ""} type="button" onClick={() => setTab(item)}>
              <Icon size={18} aria-hidden="true" />
              <span>{item}</span>
            </button>
          ))}
        </nav>

        <div className="content-scroll">
          {tab === "赛程" && (
            <section className="schedule-panel" aria-label="世界杯赛程">
              <div className="filter-row">
                {(["全部", "小组赛", "淘汰赛"] as const).map((item) => (
                  <button key={item} className={phase === item ? "filter active" : "filter"} type="button" onClick={() => setPhase(item)}>
                    {item === "全部" ? "今日" : item}
                  </button>
                ))}
                <button className="calendar-button" type="button" aria-label="打开日期">
                  <CalendarDays size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="date-strip" aria-label="比赛日期">
                <ChevronLeft size={22} aria-hidden="true" />
                <div className="date-list">
                  {dates.map((date) => (
                    <button
                      key={date}
                      className={activeDate === date ? "date-pill active" : "date-pill"}
                      type="button"
                      onClick={() => {
                        setDateTouched(true);
                        setActiveDate(date);
                      }}
                    >
                      <strong>{date.slice(5).replace("-", "/")}</strong>
                      <span>{date === todayKey ? "今天" : weekdayLabel(date)}</span>
                    </button>
                  ))}
                </div>
                <ChevronRight size={22} aria-hidden="true" />
              </div>

              <AccuracyPanel accuracy={accuracy} compact />

              <OddsPanel
                match={selectedMatch}
                matches={matches}
                marketData={marketData}
                marketError={marketError}
                onReveal={revealMarketData}
                onSelectMatch={setSelectedMatchId}
              />

              <div className="match-list">
                {(visibleMatches.length > 0 ? visibleMatches : matches.slice(0, 3)).map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    selected={match.id === selectedMatch.id}
                    onSelect={() => {
                      setSelectedMatchId(match.id);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {tab !== "赛程" && <SelectedMatch match={selectedMatch} />}

          {tab === "测算" && (
            <>
              <section className="selected-note">
                <Sparkles size={16} aria-hidden="true" />
                <span>按比赛时间、球队、场馆起算；结果后可换法复核</span>
              </section>

              <section className="method-panel" aria-label="选择测算方式">
                <div className="section-title">
                  <h2>选择测算方式</h2>
                  <span>任选 1-3 种</span>
                </div>
                <div className="method-grid">
                  {predictionMethods.map((method) => {
                    const enabled = enabledMethods.includes(method.id);
                    const disabled = !enabled && enabledMethods.length >= 3;
                    return (
                      <button
                        key={method.id}
                        className={`${enabled ? "method-card selected" : "method-card"}${disabled ? " disabled" : ""}`}
                        type="button"
                        onClick={() => toggleMethod(method.id)}
                        aria-disabled={disabled}
                      >
                        <span className="method-symbol">{methodIcons[method.id]}</span>
                        <strong>{method.name}</strong>
                        <small>{method.subtitle}</small>
                        <span className="check-dot">{enabled ? "✓" : "+"}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <OddsPanel
                match={selectedMatch}
                matches={matches}
                marketData={marketData}
                marketError={marketError}
                onReveal={revealMarketData}
                onSelectMatch={setSelectedMatchId}
              />
            </>
          )}

          {tab === "结果" && (
            <>
              <section className={hasRun ? "result-panel revealed" : "result-panel"} aria-label="综合判词">
                <div className="result-heading">
                  <div>
                    <h2>综合判词</h2>
                    <p>{hasRun ? "测算结果已生成，可换法复核" : "测算结果预览"}</p>
                  </div>
                  <span className="status-pill">{hasRun ? "已测算" : "未测算"}</span>
                </div>

                <div className="score-board">
                  <ResultRow label="预测胜者">
                    <strong className="winner">
                      <Trophy size={18} aria-hidden="true" />
                      {prediction.winner}
                    </strong>
                    <span>信心值：{prediction.confidence}%</span>
                  </ResultRow>
                  <ResultRow label="预测比分">
                    <strong className="big-score">{prediction.score}</strong>
                    <span>{selectedMatch.home} vs {selectedMatch.away}</span>
                  </ResultRow>
                  <ResultRow label="总进球">
                    <strong className="consensus">{prediction.totalGoals}</strong>
                    <span>含常规时间进球数推演</span>
                  </ResultRow>
                  <ResultRow label="开球队伍">
                    <strong className="consensus">{prediction.kickoffTeam}</strong>
                    <span>按赛前掷硬币/攻守选择倾向推演</span>
                  </ResultRow>
                  <ResultRow label="爆冷指数">
                    <div className="stars" aria-label={`爆冷指数 ${prediction.upsetIndex}`}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} size={18} fill={index < Math.ceil(prediction.upsetIndex / 20) ? "currentColor" : "none"} />
                      ))}
                    </div>
                    <span>{prediction.upsetIndex} / 100</span>
                  </ResultRow>
                  <ResultRow label="综合共识">
                    <strong className="consensus">{prediction.consensus}</strong>
                    <span>{prediction.readings.length} 法结论已汇总</span>
                  </ResultRow>
                </div>
              </section>

              <AlgorithmAuditPanel items={getMethodAuditTrail(enabledMethods)} />

              <section className="reading-list" aria-label="测算明细">
                {prediction.readings.map((reading) => {
                  const isOpen = openReadingId === reading.methodId;
                  return (
                    <article key={reading.methodId} className={isOpen ? "reading-card open" : "reading-card"}>
                      <div>
                        <h3>{reading.title}</h3>
                        <p>{reading.explanation}</p>
                        <div className="signal-summary" aria-label="测算势能">
                          {reading.signalSummary}
                        </div>
                      </div>
                      <div className="reading-meta">
                        <span>{reading.scoreHint}</span>
                        <strong>{reading.confidence}%</strong>
                      </div>
                      <button className="process-toggle" type="button" onClick={() => setOpenReadingId(isOpen ? null : reading.methodId)}>
                        {isOpen ? "收起过程" : "查看过程"}
                      </button>
                      {isOpen && (
                        <div className="process-panel">
                          <div className="process-head">
                            <h4>{reading.processTitle}</h4>
                            <code>{reading.calculationKey}</code>
                          </div>
                          <p className="basis-line">{reading.basis}</p>
                          <div className="process-steps">
                            {reading.processSteps.map((step) => (
                              <div className="process-step" key={`${reading.methodId}-${step.label}`}>
                                <span>{step.label}</span>
                                <strong>{step.value}</strong>
                                <p>{step.note}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>

              <AccuracyPanel accuracy={accuracy} />
            </>
          )}
        </div>

        <div className="bottom-action">
          <button type="button" onClick={runPrediction}>
            <Dices size={22} aria-hidden="true" />
            <span>{getPrimaryActionLabel(tab === "结果" && hasRun ? "afterResult" : "beforeResult")}</span>
          </button>
        </div>
      </section>
    </main>
  );
}

function SelectedMatch({ match }: { match: WorldCupMatch }) {
  return (
    <section className="selected-match" aria-label="当前选择比赛">
      <div>
        <span>{match.phase} · {match.group}</span>
        <strong>{match.home} vs {match.away}</strong>
      </div>
      <p>{match.result ? `${match.result.home}-${match.result.away} ${match.result.status === "finished" ? "完场" : match.result.minute ?? "进行中"}` : `北京时间 ${formatChinaKickoff(match)} · ${match.city}`}</p>
    </section>
  );
}

function MatchCard({ match, selected, onSelect }: { match: WorldCupMatch; selected: boolean; onSelect: () => void }) {
  return (
    <button className={selected ? "match-card selected" : "match-card"} type="button" onClick={onSelect}>
      <div className="match-time">
        <strong>{formatChinaKickoff(match).slice(6)}</strong>
        <span>{match.phase} · {match.group}</span>
      </div>
      <div className="teams">
        <TeamBadge name={match.home} />
        <span className={match.result ? "versus score-live" : "versus"}>{match.result ? `${match.result.home}-${match.result.away}` : "VS"}</span>
        <TeamBadge name={match.away} />
      </div>
      <div className={match.result?.status === "live" ? "match-status live" : "match-status"}>
        {match.result?.status === "finished" ? "FT" : match.result?.status === "live" ? match.result.minute ?? "LIVE" : selected ? "✓" : "○"}
      </div>
      <p className="venue-line">北京时间 {formatChinaKickoff(match)} · 当地 {formatLocalKickoff(match)} · {match.city} · {match.venue}</p>
      {match.result && <p className="result-source">{match.result.status === "finished" ? "赛果" : "实时比分"}：{match.result.source}</p>}
    </button>
  );
}

function OddsPanel({
  match,
  matches,
  marketData,
  marketError,
  onReveal,
  onSelectMatch
}: {
  match: WorldCupMatch;
  matches: WorldCupMatch[];
  marketData: MarketDataResponse | null;
  marketError: string;
  onReveal: () => void;
  onSelectMatch: (matchId: string) => void;
}) {
  const activeMarketData = marketData?.market.matchId === match.id ? marketData : null;
  const odds = activeMarketData?.market ?? match.odds;
  const sourceName = odds ? ("sourceName" in odds ? odds.sourceName : odds.bookmaker) : "待接实时源";
  const updatedAt = odds ? ("fetchedAt" in odds ? odds.fetchedAt : odds.updatedAt) : "未解锁";
  const provider = odds && "provider" in odds ? odds.provider : match.odds?.provider;
  const dataType = marketDataType(provider, odds?.locked);

  if (!odds) {
    return (
      <section className="odds-panel" aria-label="盘口赔率">
        <div className="section-title">
          <h2>实时盘口</h2>
          <span>{updatedAt}</span>
        </div>
        <MarketMatchSelect match={match} matches={matches} onSelectMatch={onSelectMatch} />
        <div className="odds-empty">
          <strong>{match.home} vs {match.away}</strong>
          <span>暂无赛前快照，可查看实时数据源返回。</span>
        </div>
        <div className="odds-foot">
          <span>{sourceName}</span>
          <button className="inline-unlock" type="button" onClick={onReveal}>
            查看实时数据
          </button>
          {marketError && (
            <strong>
              <Lock size={13} aria-hidden="true" />
              {marketError}
            </strong>
          )}
        </div>
        <p className="data-source-line">数据类型：待接实时源 · 数据来源：{sourceName}</p>
      </section>
    );
  }

  return (
    <section className="odds-panel" aria-label="盘口赔率">
      <div className="section-title">
        <h2>实时盘口</h2>
        <span>{updatedAt}</span>
      </div>
      <MarketMatchSelect match={match} matches={matches} onSelectMatch={onSelectMatch} />
      <div className={odds.locked ? "odds-grid locked" : "odds-grid"}>
        <div>
          <span>{match.home}</span>
          <strong>{odds.home}</strong>
        </div>
        <div>
          <span>平局</span>
          <strong>{odds.draw}</strong>
        </div>
        <div>
          <span>{match.away}</span>
          <strong>{odds.away}</strong>
        </div>
      </div>
      <div className="total-line">
        <TrendingUp size={16} aria-hidden="true" />
        <span>大小 {odds.totalLine}：大 {odds.over} / 小 {odds.under}</span>
      </div>
      <div className="odds-foot">
        <span>{sourceName}</span>
        {!activeMarketData && (
          <button className="inline-unlock" type="button" onClick={onReveal}>
            查看实时数据
          </button>
        )}
        {(odds.locked || marketError) && (
          <strong>
            <Lock size={13} aria-hidden="true" />
            {marketError || "付费查看实时"}
          </strong>
        )}
      </div>
      <p className="data-source-line">数据类型：{dataType} · 数据来源：{sourceName}</p>
      {activeMarketData && <p className="data-disclaimer">{activeMarketData.disclaimer}</p>}
    </section>
  );
}

function MarketMatchSelect({
  match,
  matches,
  onSelectMatch
}: {
  match: WorldCupMatch;
  matches: WorldCupMatch[];
  onSelectMatch: (matchId: string) => void;
}) {
  const options = [...matches].sort((left, right) => `${getChinaKickoffDate(left)} ${formatChinaKickoff(left)}`.localeCompare(`${getChinaKickoffDate(right)} ${formatChinaKickoff(right)}`));
  return (
    <label className="market-match-select">
      <span>选择盘口比赛</span>
      <select value={match.id} onChange={(event) => onSelectMatch(event.target.value)}>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {formatChinaKickoff(item)} {item.home} vs {item.away}
          </option>
        ))}
      </select>
    </label>
  );
}

function AccuracyPanel({ accuracy, compact = false }: { accuracy: ReturnType<typeof buildAccuracy>; compact?: boolean }) {
  const played = accuracy[0]?.played ?? 0;
  return (
    <section className={compact ? "accuracy-panel compact" : "accuracy-panel"} aria-label="测算准确率">
      <div className="section-title">
        <h2>赛后准确率</h2>
        <span>{played} 场已结算</span>
      </div>
      <div className="accuracy-list">
        {accuracy.map((item) => (
          <div className="accuracy-row" key={item.methodId}>
            <strong>{item.name}</strong>
            <span>胜平负 {item.winnerRate}%</span>
            <span>比分 {item.scoreRate}%</span>
            <span>总球 {item.totalGoalsRate}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamBadge({ name }: { name: string }) {
  return (
    <span className="team-badge">
      <span className="flag-chip">{name.slice(0, 1)}</span>
      <span>{name}</span>
    </span>
  );
}

function ResultRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="result-row">
      <span className="row-label">{label}</span>
      <div className="row-value">{children}</div>
    </div>
  );
}

function AlgorithmAuditPanel({ items }: { items: MethodAudit[] }) {
  return (
    <section className="audit-panel" aria-label="算法审计">
      <div className="section-title">
        <h2>算法审计</h2>
        <span>固定输入 · 可复核</span>
      </div>
      <div className="audit-list">
        {items.map((item) => {
          const method = predictionMethods.find((entry) => entry.id === item.methodId);
          return (
            <article className="audit-item" key={item.methodId}>
              <strong>{method?.shortName ?? item.methodId}</strong>
              <p>{item.engine}</p>
              <span>{item.determinism}</span>
              <code>{item.inputs.join(" / ")}</code>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function weekdayLabel(date: string) {
  const day = new Date(`${date}T00:00:00`).getDay();
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][day];
}

function getVisitorId() {
  const key = "xuan-oracle-visitor-id";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const created = `visitor-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, created);
  return created;
}

function matchDtoToWorldCupMatch(match: MatchDTO): WorldCupMatch {
  return {
    id: match.id,
    date: match.date,
    localTime: match.localTime,
    group: match.group,
    phase: match.phase,
    home: match.home,
    away: match.away,
    venue: match.venue,
    city: match.city,
    country: match.country,
    source: match.sourceAudit.source_name,
    lastUpdated: match.lastUpdated,
    result: match.result,
    odds: match.odds ? marketSnapshotToOdds(match.odds) : undefined
  };
}

function marketSnapshotToOdds(snapshot: MarketSnapshotDTO) {
  return {
    home: snapshot.home,
    draw: snapshot.draw,
    away: snapshot.away,
    totalLine: snapshot.totalLine,
    over: snapshot.over,
    under: snapshot.under,
    bookmaker: snapshot.sourceName,
    updatedAt: snapshot.fetchedAt,
    locked: snapshot.locked,
    provider: snapshot.provider,
    sourceUrl: snapshot.sourceUrl
  };
}

function marketDataType(provider: string | undefined, locked: boolean | undefined) {
  if (provider === "the-odds-api") {
    return "实时API";
  }
  if (provider === "manual-snapshot") {
    return "赛前快照";
  }
  if (provider === "demo-market-data" || locked) {
    return "演示/待接实时源";
  }
  return "待确认";
}

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

export default App;
