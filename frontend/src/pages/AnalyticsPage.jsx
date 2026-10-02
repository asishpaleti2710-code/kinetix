import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  Target,
  Cpu,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  PieChart,
  Activity,
  Zap,
  Users,
  Calendar
} from 'lucide-react';
import {
  fetchAnalyticsOverview,
  fetchLeadTimeseries,
  fetchConversionFunnel,
  fetchAgentUsage,
  fetchRevenuePipeline,
  fetchConversationTimeseries
} from '../services/api';

// ── Mini Bar Chart (SVG) ────────────────────────────────────────────────────
function MiniBarChart({ labels = [], series = [], colors = [], height = 120 }) {
  if (!labels.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
      No data in this period
    </div>
  );
  const allVals = series.flat();
  const maxVal = Math.max(...allVals, 1);
  const totalWidth = 460;
  const groupW = Math.max(6, Math.floor(totalWidth / labels.length));
  const barW = Math.max(2, Math.floor(groupW / series.length) - 1);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={Math.max(totalWidth, labels.length * groupW)} height={height + 22} style={{ display: 'block' }}>
        {labels.map((label, i) => (
          series.map((s, si) => {
            const val = s[i] || 0;
            const barH = Math.max(2, (val / maxVal) * (height - 8));
            const x = i * groupW + si * barW;
            return (
              <rect key={`${i}-${si}`} x={x} y={height - barH} width={Math.max(1, barW - 1)} height={barH}
                fill={colors[si] || '#818cf8'} rx="2" opacity="0.85">
                <title>{`${label}: ${val}`}</title>
              </rect>
            );
          })
        ))}
        {labels.filter((_, i) => labels.length <= 14 || i % Math.ceil(labels.length / 14) === 0).map((label, idx) => {
          const origIdx = labels.indexOf(label);
          return (
            <text key={idx} x={origIdx * groupW + groupW / 2} y={height + 16} textAnchor="middle" fontSize="9" fill="var(--text-muted)">
              {label.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── Funnel Bar ──────────────────────────────────────────────────────────────
function FunnelBar({ stage, count, pct, color }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '6px' }}>
        <span style={{ fontWeight: 600 }}>{stage}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{count} <span style={{ color: 'var(--text-muted)' }}>({pct}%)</span></span>
      </div>
      <div style={{ width: '100%', height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '5px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

// ── Delta Chip ──────────────────────────────────────────────────────────────
function DeltaChip({ delta }) {
  if (delta === null || delta === undefined) return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>;
  const up = delta >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', fontWeight: 700,
      color: up ? '#34d399' : '#f87171',
      background: up ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
      padding: '2px 8px', borderRadius: '20px'
    }}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(delta)}%
    </span>
  );
}

// ── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({ segments = [], size = 130, thickness = 28 }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size / 2) - thickness / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth={thickness} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [timeseries, setTimeseries] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [agentUsage, setAgentUsage] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [convoTs, setConvoTs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [ov, ts, fn, ag, rv, cv] = await Promise.all([
        fetchAnalyticsOverview(),
        fetchLeadTimeseries(selectedPeriod),
        fetchConversionFunnel(),
        fetchAgentUsage(selectedPeriod),
        fetchRevenuePipeline(),
        fetchConversationTimeseries(14),
      ]);
      setOverview(ov); setTimeseries(ts); setFunnel(fn);
      setAgentUsage(ag); setRevenue(rv); setConvoTs(cv);
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const fmt = (n) => n?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '—';
  const fmtUSD = (n) => n !== undefined && n !== null ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—';

  if (loading) {
    return (
      <div className="view-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading analytics intelligence...</div>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Pipeline MRR', value: fmtUSD(revenue?.totals?.total_mrr_usd), sub: `${fmtUSD(revenue?.totals?.total_arr_usd)} ARR`, icon: DollarSign, gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', delta: overview?.trends?.leads_delta_pct },
    { label: 'Weighted Pipeline', value: fmtUSD(revenue?.totals?.weighted_pipeline_mrr_usd), sub: 'Probability-adjusted MRR', icon: Target, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', delta: null },
    { label: 'New Leads This Week', value: fmt(overview?.this_week?.new_leads), sub: 'vs. previous 7 days', icon: Users, gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', delta: overview?.trends?.leads_delta_pct },
    { label: 'Demos Booked (7d)', value: fmt(overview?.this_week?.appointments_booked), sub: 'Calendar slots reserved', icon: Calendar, gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)', delta: overview?.trends?.appointments_delta_pct },
  ];

  const funnelColors = ['#60a5fa', '#94a3b8', '#fbbf24', '#f43f5e', '#34d399'];
  const agentColors = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#60a5fa', '#fb923c'];
  const donutSegments = [
    { label: 'Hot', value: overview?.totals?.hot_leads || 0, color: '#f43f5e' },
    { label: 'Warm', value: overview?.totals?.warm_leads || 0, color: '#fbbf24' },
    { label: 'Cold', value: overview?.totals?.cold_leads || 0, color: '#64748b' },
  ];
  const donutTotal = donutSegments.reduce((a, s) => a + s.value, 0);

  return (
    <div className="view-canvas">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.03em' }}>
            Revenue &amp; Pipeline Analytics
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem' }}>
            Real-time intelligence across your autonomous sales pipeline
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            {[7, 30, 60, 90].map(d => (
              <button key={d} onClick={() => setSelectedPeriod(d)} style={{
                padding: '5px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                background: selectedPeriod === d ? 'var(--accent-gradient)' : 'transparent',
                color: selectedPeriod === d ? 'white' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s'
              }}>{d}d</button>
            ))}
          </div>
          <button onClick={() => loadAll(true)} disabled={refreshing} className="btn-secondary" style={{ fontSize: '0.82rem', padding: '7px 14px' }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '28px' }}>
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="stat-card">
              <div>
                <div className="stat-label">{kpi.label}</div>
                <div className="stat-value">{kpi.value}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{kpi.sub}</span>
                  <DeltaChip delta={kpi.delta} />
                </div>
              </div>
              <div className="stat-icon" style={{ background: kpi.gradient, color: 'white' }}>
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead Timeseries + Pipeline Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart2 size={18} color="#818cf8" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Lead Volume — {selectedPeriod}d Trend</h3>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
              {[['Hot', '#f43f5e'], ['Warm', '#fbbf24'], ['Cold', '#64748b']].map(([l, c]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '2px', background: c, display: 'inline-block' }} />{l}
                </span>
              ))}
            </div>
          </div>
          {timeseries ? (
            <MiniBarChart
              labels={timeseries.labels}
              series={[timeseries.series.hot, timeseries.series.warm, timeseries.series.cold]}
              colors={['#f43f5e', '#fbbf24', '#64748b']}
              height={140}
            />
          ) : <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>}
          {timeseries?.summary && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8rem' }}><span style={{ color: 'var(--text-muted)' }}>Total: </span><strong>{timeseries.summary.total_in_period}</strong></div>
              <div style={{ fontSize: '0.8rem' }}><span style={{ color: 'var(--text-muted)' }}>Peak: </span><strong>{timeseries.summary.peak_day?.slice(5) || '—'} ({timeseries.summary.peak_value})</strong></div>
            </div>
          )}
        </div>

        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <PieChart size={18} color="#f472b6" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Lead Distribution</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              <DonutChart segments={donutSegments} size={140} thickness={30} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{donutTotal}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Total</div>
              </div>
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {donutSegments.map((seg) => (
                <div key={seg.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{seg.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{seg.value}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({donutTotal ? Math.round(seg.value / donutTotal * 100) : 0}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue + Conversion Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <DollarSign size={18} color="#34d399" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Revenue Pipeline</h3>
          </div>
          {revenue ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Hot Pipeline', ...revenue.pipeline?.hot, color: '#f43f5e' },
                { label: 'Warm Pipeline', ...revenue.pipeline?.warm, color: '#fbbf24' },
                { label: 'Cold Pipeline', ...revenue.pipeline?.cold, color: '#64748b' },
              ].map((seg) => (
                <div key={seg.label} style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, display: 'inline-block' }} />
                      <span style={{ fontSize: '0.83rem', fontWeight: 600 }}>{seg.label}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '20px' }}>
                      {seg.win_probability}% win prob
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>MRR</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: seg.color }}>{fmtUSD(seg.mrr_usd)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>ARR</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{fmtUSD(seg.arr_usd)}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ padding: '12px 14px', background: 'rgba(129,140,248,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(129,140,248,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#818cf8' }}>Weighted ARR</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#818cf8' }}>{fmtUSD(revenue.totals?.weighted_pipeline_arr_usd)}</span>
              </div>
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No revenue data</div>}
        </div>

        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <TrendingUp size={18} color="#fbbf24" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Conversion Funnel</h3>
          </div>
          {funnel ? (
            <div>
              {funnel.funnel.map((stage, i) => (
                <FunnelBar key={stage.stage} {...stage} color={funnelColors[i]} />
              ))}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conversion Rates</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {Object.entries(funnel.conversion_rates || {}).map(([key, val]) => (
                    <div key={key} style={{ padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: val > 50 ? '#34d399' : val > 25 ? '#fbbf24' : '#f87171' }}>{val}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No funnel data</div>}
        </div>
      </div>

      {/* Agent Usage + Conversation Volume */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Cpu size={18} color="#c084fc" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Intelligence Skill Breakdown</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{selectedPeriod}d</span>
          </div>
          {agentUsage?.breakdown?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agentUsage.breakdown.map((agent, i) => (
                <div key={agent.agent}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 600 }}>{agent.agent ? agent.agent.replace(/_/g, ' ') : 'General Intelligence'}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{agent.conversations} <span style={{ color: agentColors[i % agentColors.length], fontWeight: 700 }}>({agent.share_pct}%)</span></span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${agent.share_pct}%`, height: '100%', background: agentColors[i % agentColors.length], borderRadius: '4px', transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                {agentUsage.total_agent_responses?.toLocaleString()} autonomous responses generated
              </div>
            </div>
          ) : (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Cpu size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <div>No interaction activity recorded yet.</div>
              <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Start an assistant session to view analytics.</div>
            </div>
          )}
        </div>

        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Activity size={18} color="#60a5fa" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Conversation Volume (14d)</h3>
          </div>
          {convoTs ? (
            <div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                {[['Customer', '#60a5fa'], ['Assistant', '#818cf8']].map(([l, c]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '2px', background: c, display: 'inline-block' }} />{l}
                  </span>
                ))}
              </div>
              <MiniBarChart
                labels={convoTs.labels}
                series={[convoTs.series.customer_messages, convoTs.series.assistant_responses]}
                colors={['#60a5fa', '#818cf8']}
                height={120}
              />
              <div style={{ display: 'flex', gap: '16px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem' }}><span style={{ color: 'var(--text-muted)' }}>Total Messages: </span><strong>{convoTs.summary?.total_messages?.toLocaleString()}</strong></div>
                <div style={{ fontSize: '0.8rem' }}><span style={{ color: 'var(--text-muted)' }}>Sessions: </span><strong>{convoTs.summary?.total_sessions}</strong></div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Activity size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <div>No conversation data yet.</div>
            </div>
          )}
        </div>
      </div>

      {/* System Summary Row */}
      {overview && (
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Zap size={18} color="#34d399" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>System Intelligence Summary</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: 'Avg Lead Score', value: `${overview.totals?.avg_lead_score}/100`, color: '#818cf8' },
              { label: 'Agent Accuracy', value: `${overview.totals?.agent_accuracy_score}%`, color: '#34d399' },
              { label: 'Hot ARR', value: fmtUSD(revenue?.pipeline?.hot?.arr_usd), color: '#f43f5e' },
              { label: 'Conversations (7d)', value: fmt(overview.this_week?.conversations), color: '#60a5fa' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '20px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color, marginBottom: '6px', letterSpacing: '-0.03em' }}>{value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
