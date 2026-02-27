import { useState, useEffect, useCallback, useRef } from 'react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle, CheckCircle2,
    DollarSign, Target, Users, Zap, ShieldCheck,
    MessageSquare, BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw, Download,
    Clock, Package, Loader2, XCircle, ChevronDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { dailyAGrade, trendChartData, demandForecast, revenueData } from '../data/mockData';
import { gradeProduct, getGradeColor, getLetterGrade } from '../engine/gradingEngine';
import { useAuth } from '../context/AuthContext';
import { fetchMyProducts, gradeProductAPI } from '../services/api';
import './Dashboard.css';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p className="tooltip-label">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color }}>
                        {p.name}: {p.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function Dashboard() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    // Get product from navigation state, fallback to dailyAGrade
    const incomingProduct = location.state?.product;
    const [product] = useState(incomingProduct || dailyAGrade);
    const [savedProducts, setSavedProducts] = useState([]);
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [grading, setGrading] = useState(false);
    const [regrading, setRegrading] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    const handleExportCSV = () => {
        const rows = [
            ['Product Name', 'Grade', 'Score', 'Profit Margin', 'Trend Velocity', 'Ad Competition', 'CPC Forecast', 'Supplier Reliability', 'Review Sentiment', 'Market Saturation', 'Risk Level'],
            [product.name, analysis.grade, analysis.score, product.profitMargin, product.trendVelocity, product.adCompetition, product.cpcForecast, product.supplierReliability, product.reviewSentiment, product.marketSaturation, analysis.risk.level]
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_grade.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('CSV exported successfully!');
    };

    const loadSavedProducts = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoadingSaved(true);
        try {
            const data = await fetchMyProducts();
            setSavedProducts(data);
        } catch (err) {
            console.error('Failed to load saved products:', err);
        } finally {
            setLoadingSaved(false);
        }
    }, [isAuthenticated]);

    // Load saved products on mount
    useEffect(() => {
        loadSavedProducts();
    }, [loadSavedProducts]);

    // Computed state to check if the current product is already saved
    const isSaved = savedProducts.some(p => p.productName === product.name);

    const handleSaveProduct = async () => {
        if (!isAuthenticated || grading || regrading) return;
        setGrading(true);
        try {
            await gradeProductAPI({
                productName: product.name,
                profitMargin: product.profitMargin,
                trendVelocity: product.trendVelocity,
                adCompetition: product.adCompetition,
                cpcForecast: product.cpcForecast,
                supplierReliability: product.supplierReliability,
                reviewSentiment: product.reviewSentiment,
                marketSaturation: product.marketSaturation,
            });
            await loadSavedProducts();
            showToast(`${product.name} saved successfully!`, 'success');
        } catch (err) {
            console.error('Failed to save product:', err);
            showToast('Failed to save product. Please try again.', 'error');
        } finally {
            setGrading(false);
        }
    };

    const analysis = gradeProduct({
        profitMargin: product.profitMargin,
        trendVelocity: product.trendVelocity,
        adCompetition: product.adCompetition,
        cpcForecast: product.cpcForecast,
        supplierReliability: product.supplierReliability,
        reviewSentiment: product.reviewSentiment,
        marketSaturation: product.marketSaturation,
    });

    const riskPercentage = analysis.risk.score;
    const saturationPercentage = product.marketSaturation;

    const handleReGrade = async () => {
        if (regrading || !isAuthenticated) return;
        setRegrading(true);
        try {
            await gradeProductAPI({
                productName: product.name,
                profitMargin: product.profitMargin,
                trendVelocity: product.trendVelocity,
                adCompetition: product.adCompetition,
                cpcForecast: product.cpcForecast,
                supplierReliability: product.supplierReliability,
                reviewSentiment: product.reviewSentiment,
                marketSaturation: product.marketSaturation,
            });
            await loadSavedProducts();
            showToast(`${product.name} re-graded successfully!`, 'success');
        } catch (err) {
            console.error('Re-grade failed:', err);
            showToast('Re-grade failed. Please try again.', 'error');
        } finally {
            setRegrading(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const metricsCards = [
        { label: 'Profit Margin', value: `${product.profitMargin}%`, icon: DollarSign, color: '#10b981', change: '+5.2%', up: true },
        { label: 'Competition Index', value: `${product.adCompetition}/100`, icon: Users, color: '#06b6d4', change: '-2.1%', up: false },
        { label: 'Trend Momentum', value: `${product.trendVelocity}/100`, icon: TrendingUp, color: '#8b5cf6', change: '+12.4%', up: true },
        { label: 'CPC Estimate', value: `$${(product.cpcForecast * 0.05).toFixed(2)}`, icon: Target, color: '#f59e0b', change: '+0.8%', up: true },
        { label: 'Conversion Prob.', value: '3.2%', icon: Zap, color: '#ec4899', change: '+0.4%', up: true },
        { label: 'Supplier Trust', value: `${product.supplierReliability}/100`, icon: ShieldCheck, color: '#10b981', change: '+1.0%', up: true },
    ];

    return (
        <div className="dashboard-page">
            {/* Top Bar */}
            <div className="dash-header animate-fade-in-up">
                <div className="dash-header-left">
                    <div className="dash-product-icon">{product.image}</div>
                    <div>
                        <h1 className="dash-product-name">{product.name}</h1>
                        <div className="dash-product-meta">
                            <span className="badge badge-info">{product.category}</span>
                            <span className="badge badge-purple">{product.orders.toLocaleString()} orders</span>
                        </div>
                    </div>
                </div>
                <div className="dash-header-actions">
                    {isAuthenticated && (
                        <button
                            className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                            onClick={handleSaveProduct}
                            disabled={grading || regrading || isSaved}
                        >
                            {grading ? <Loader2 size={14} className="spin-icon" /> : isSaved ? <CheckCircle size={14} /> : <Package size={14} />}
                            {grading ? 'Saving...' : isSaved ? 'Saved' : 'Save Product'}
                        </button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={handleReGrade} disabled={regrading}>
                        {regrading ? <Loader2 size={14} className="spin-icon" /> : <RefreshCw size={14} />}
                        {regrading ? 'Re-Grading...' : 'Re-Grade'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}><Download size={14} /> Export</button>
                </div>
            </div>

            {/* Grade + Risk + Saturation + ROI */}
            <div className="dash-top-row animate-fade-in-up delay-1">
                {/* Grade Badge */}
                <div className="grade-card glass-card">
                    <div className="grade-label">Overall Grade</div>
                    <div className="grade-circle" style={{ '--grade-color': getGradeColor(analysis.grade) }}>
                        <span className="grade-letter">{analysis.grade}</span>
                    </div>
                    <div className="grade-score">{analysis.score}/100</div>
                    <div className="grade-tag" style={{ color: getGradeColor(analysis.grade) }}>
                        {analysis.grade === 'A' ? 'Excellent' : analysis.grade === 'B' ? 'Good' : analysis.grade === 'C' ? 'Average' : 'Below Average'}
                    </div>
                </div>

                {/* Risk Meter */}
                <div className="risk-card glass-card">
                    <div className="risk-label">Risk Level</div>
                    <div className="risk-gauge">
                        <svg viewBox="0 0 120 70" className="risk-svg">
                            <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" strokeLinecap="round" />
                            <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke={analysis.risk.color} strokeWidth="8" strokeLinecap="round"
                                strokeDasharray={`${(riskPercentage / 100) * 157} 157`}
                                style={{ transition: 'stroke-dasharray 1s ease' }}
                            />
                        </svg>
                        <div className="risk-value" style={{ color: analysis.risk.color }}>
                            {analysis.risk.level}
                        </div>
                    </div>
                    <div className="risk-score">{riskPercentage}% risk score</div>
                </div>

                {/* Saturation */}
                <div className="saturation-card glass-card">
                    <div className="sat-label">Market Saturation</div>
                    <div className="sat-value">{saturationPercentage}%</div>
                    <div className="meter-track">
                        <div
                            className={`meter-fill`}
                            style={{
                                width: `${saturationPercentage}%`,
                                background: saturationPercentage < 40 ? 'var(--gradient-success)' :
                                    saturationPercentage < 65 ? 'linear-gradient(90deg, #f59e0b, #f97316)' :
                                        'var(--gradient-danger)'
                            }}
                        />
                    </div>
                    <div className="sat-status" style={{
                        color: saturationPercentage < 40 ? '#10b981' : saturationPercentage < 65 ? '#f59e0b' : '#ef4444'
                    }}>
                        {saturationPercentage < 40 ? 'Low — Great opportunity' : saturationPercentage < 65 ? 'Moderate — Proceed carefully' : 'High — Risky market'}
                    </div>
                </div>

                {/* ROI */}
                <div className="roi-card glass-card">
                    <div className="roi-label">Expected ROI</div>
                    <div className="roi-value">
                        {analysis.profitScenarios.likely.roi}%
                        <ArrowUpRight size={20} className="roi-arrow" />
                    </div>
                    <div className="roi-scenarios">
                        <div className="roi-scenario">
                            <span className="rs-label">Best</span>
                            <span className="rs-value" style={{ color: '#10b981' }}>{analysis.profitScenarios.best.roi}%</span>
                        </div>
                        <div className="roi-scenario">
                            <span className="rs-label">Likely</span>
                            <span className="rs-value" style={{ color: '#06b6d4' }}>{analysis.profitScenarios.likely.roi}%</span>
                        </div>
                        <div className="roi-scenario">
                            <span className="rs-label">Worst</span>
                            <span className="rs-value" style={{ color: '#ef4444' }}>{analysis.profitScenarios.worst.roi}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="metrics-grid animate-fade-in-up delay-2">
                {metricsCards.map((m, i) => (
                    <div key={i} className="metric-card glass-card glass-card-sm">
                        <div className="metric-header">
                            <div className="metric-icon" style={{ background: `${m.color}18`, color: m.color }}>
                                <m.icon size={18} />
                            </div>
                            <div className={`metric-change ${m.up ? 'up' : 'down'}`}>
                                {m.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {m.change}
                            </div>
                        </div>
                        <div className="metric-value">{m.value}</div>
                        <div className="metric-label">{m.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="charts-row animate-fade-in-up delay-3">
                {/* Trend Chart */}
                <div className="chart-card glass-card">
                    <div className="chart-header">
                        <h3><TrendingUp size={16} /> Google Trend</h3>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={trendChartData}>
                                <defs>
                                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="interest" stroke="#8b5cf6" fill="url(#trendGradient)" strokeWidth={2} name="Interest" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Competition Spike */}
                <div className="chart-card glass-card">
                    <div className="chart-header">
                        <h3><Users size={16} /> Competition</h3>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={trendChartData}>
                                <defs>
                                    <linearGradient id="compGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="competition" stroke="#06b6d4" fill="url(#compGradient)" strokeWidth={2} name="Competition" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Charts */}
            <div className="charts-row animate-fade-in-up delay-4">
                {/* Revenue Breakdown */}
                <div className="chart-card glass-card">
                    <div className="chart-header">
                        <h3><DollarSign size={16} /> Cost vs Revenue</h3>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={revenueData} barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="$" />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Amount">
                                    {revenueData.map((entry, index) => (
                                        <Cell key={index} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Demand Forecast */}
                <div className="chart-card glass-card">
                    <div className="chart-header">
                        <h3><BarChart3 size={16} /> 30-Day Demand Forecast</h3>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={demandForecast}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="actual" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6' }} name="Actual" connectNulls={false} />
                                <Line type="monotone" dataKey="forecast" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#06b6d4' }} name="Forecast" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Saved Products */}
            <div className="saved-products-section animate-fade-in-up delay-4">
                <div className="glass-card">
                    <div className="saved-header">
                        <h3 className="suggestions-title">
                            <Package size={18} /> Your Saved Products
                        </h3>
                        {isAuthenticated && (
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={loadSavedProducts}
                                disabled={loadingSaved}
                            >
                                <RefreshCw size={14} className={loadingSaved ? 'spin-icon' : ''} />
                                Refresh
                            </button>
                        )}
                    </div>

                    {!isAuthenticated ? (
                        <div className="saved-empty">
                            <ShieldCheck size={32} />
                            <p>Login to see your graded products</p>
                        </div>
                    ) : loadingSaved ? (
                        <div className="saved-loading">
                            <Loader2 size={24} className="spin-icon" />
                            <p>Loading your products...</p>
                        </div>
                    ) : savedProducts.length === 0 ? (
                        <div className="saved-empty">
                            <Package size={32} />
                            <p>No products graded yet</p>
                            <span>Grade a product to see it here</span>
                        </div>
                    ) : (() => {
                        // Group saved products by productName, latest first
                        const groups = {};
                        savedProducts.forEach(sp => {
                            if (!groups[sp.productName]) groups[sp.productName] = [];
                            groups[sp.productName].push(sp);
                        });
                        // Sort each group by version desc
                        Object.values(groups).forEach(arr => arr.sort((a, b) => b.version - a.version));

                        // Sort groups by the newest createdAt across the whole group, then take top 5
                        const groupEntries = Object.entries(groups)
                            .sort((a, b) => new Date(b[1][0].createdAt) - new Date(a[1][0].createdAt))
                            .slice(0, 5);

                        return (
                            <div className="saved-products-list">
                                {groupEntries.map(([name, versions]) => {
                                    const latest = versions[0];
                                    const hasHistory = versions.length > 1;
                                    const isExpanded = expandedGroups[name];

                                    return (
                                        <div key={name} className="sp-group">
                                            <div
                                                className={`saved-product-row ${hasHistory ? 'has-history' : ''}`}
                                                onClick={() => hasHistory && setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }))}
                                            >
                                                <div className="sp-grade-badge" style={{
                                                    background: `${getGradeColor(latest.grade)}33`,
                                                    color: getGradeColor(latest.grade),
                                                    border: `1px solid ${getGradeColor(latest.grade)}66`,
                                                }}>
                                                    {latest.grade}
                                                </div>
                                                <div className="sp-info">
                                                    <span className="sp-name">
                                                        {latest.productName}
                                                        {latest.version > 1 && <span className="sp-version">v{latest.version}</span>}
                                                        {hasHistory && (
                                                            <span className="sp-version-count" title={`Graded ${versions.length} times`}>
                                                                {versions.length} grades
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="sp-date">
                                                        <Clock size={11} />
                                                        {formatDate(latest.createdAt)}
                                                    </span>
                                                </div>
                                                <div className="sp-score">
                                                    <span className="sp-score-value">{latest.score}</span>
                                                    <span className="sp-score-label">/100</span>
                                                    {hasHistory && (() => {
                                                        const prev = versions[1];
                                                        const delta = latest.score - prev.score;
                                                        if (delta === 0) return null;
                                                        return (
                                                            <span className={`sp-score-delta ${delta > 0 ? 'positive' : 'negative'}`}>
                                                                {delta > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                                                                {Math.abs(delta)}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                {hasHistory && (
                                                    <ChevronDown
                                                        size={14}
                                                        className={`sp-expand-icon ${isExpanded ? 'expanded' : ''}`}
                                                    />
                                                )}
                                            </div>
                                            {/* Version History */}
                                            {isExpanded && hasHistory && (
                                                <div className="sp-version-history">
                                                    {versions.slice(1).map(v => (
                                                        <div key={v._id} className="sp-version-row">
                                                            <div className="sp-grade-badge sp-grade-badge-sm" style={{
                                                                background: `${getGradeColor(v.grade)}22`,
                                                                color: getGradeColor(v.grade),
                                                                border: `1px solid ${getGradeColor(v.grade)}44`,
                                                            }}>
                                                                {v.grade}
                                                            </div>
                                                            <span className="sp-version-label">v{v.version}</span>
                                                            <span className="sp-version-score">{v.score}/100</span>
                                                            <span className="sp-version-date">{formatDate(v.createdAt)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* AI Suggestions */}
            <div className="suggestions-section animate-fade-in-up delay-5">
                <div className="glass-card">
                    <h3 className="suggestions-title">
                        <Zap size={18} /> AI Insights & Suggestions
                    </h3>
                    <div className="suggestions-list">
                        {analysis.suggestions.map((s, i) => (
                            <div key={i} className="suggestion-item">
                                <div className="suggestion-icon">
                                    {i === 0 ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                </div>
                                <p>{s}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Weak Metrics */}
                {analysis.weakMetrics.length > 0 && (
                    <div className="glass-card weak-metrics-card">
                        <h3 className="suggestions-title">
                            <AlertTriangle size={18} /> Flagged Weak Metrics
                        </h3>
                        <div className="weak-metrics-list">
                            {analysis.weakMetrics.map((wm, i) => (
                                <div key={i} className="weak-metric-item">
                                    <span className="wm-name">{wm.name}</span>
                                    <div className="wm-bar-track">
                                        <div className="wm-bar-fill" style={{ width: `${wm.value}%`, background: 'var(--gradient-danger)' }} />
                                    </div>
                                    <span className="wm-value">{wm.value}/100</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Toast Notification */}
            <div className={`toast-container ${toast.visible ? 'visible' : ''}`}>
                <div className={`toast toast-${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    <span>{toast.message}</span>
                </div>
            </div>
        </div>
    );
}
