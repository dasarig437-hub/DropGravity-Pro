import { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle, CheckCircle2,
    DollarSign, Target, Users, Zap, ShieldCheck,
    ArrowUpRight, ArrowDownRight, RefreshCw, Download,
    Clock, Package, Loader2, XCircle, ChevronDown, ArrowUp, ArrowDown, Lock,
    Flame, Sparkles, ChevronRight, Tv, Activity, ShoppingCart, Star
} from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { dailyAGrade } from '../data/mockData';
import { gradeProduct, getGradeColor, getLetterGrade } from '../engine/gradingEngine';
import { useAuth } from '../context/AuthContext';
import { fetchMyProducts, gradeProductAPI, createCheckoutSession } from '../services/api';
import './Dashboard.css';

// ---- Derived helper functions ----
function getDemandLevel(trendVelocity) {
    if (trendVelocity > 70) return { label: 'High', color: '#10b981' };
    if (trendVelocity > 40) return { label: 'Medium', color: '#f59e0b' };
    return { label: 'Low', color: '#ef4444' };
}

function getCompetitionLevel(adCompetition) {
    if (adCompetition > 65) return { label: 'High', color: '#ef4444' };
    if (adCompetition > 35) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'Low', color: '#10b981' };
}

function getSaturationLevel(marketSaturation) {
    if (marketSaturation < 40) return { label: 'Low', color: '#10b981' };
    if (marketSaturation < 65) return { label: 'Medium', color: '#f59e0b' };
    return { label: 'High', color: '#ef4444' };
}

function getProfitLabel(profitMargin) {
    if (profitMargin >= 60) return { label: 'Strong', color: '#10b981' };
    if (profitMargin >= 35) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'Weak', color: '#ef4444' };
}

function getTrendLabel(trendVelocity) {
    if (trendVelocity >= 70) return { label: 'Rising', color: '#10b981', icon: '↑' };
    if (trendVelocity >= 40) return { label: 'Stable', color: '#f59e0b', icon: '→' };
    return { label: 'Declining', color: '#ef4444', icon: '↓' };
}

function getSupplierLabel(supplierReliability) {
    if (supplierReliability >= 75) return { label: 'Reliable', color: '#10b981' };
    if (supplierReliability >= 50) return { label: 'Average', color: '#f59e0b' };
    return { label: 'Risky', color: '#ef4444' };
}

/**
 * Determine the AI Verdict headline based on score
 */
function getAIVerdict(score, grade) {
    if (score >= 85) return { emoji: '🔥', headline: 'HIGH POTENTIAL PRODUCT', color: '#10b981', confidence: Math.round(75 + (score - 85) * 1.3) };
    if (score >= 70) return { emoji: '✅', headline: 'SOLID PRODUCT', color: '#06b6d4', confidence: Math.round(60 + (score - 70) * 1.5) };
    if (score >= 55) return { emoji: '⚠️', headline: 'MODERATE OPPORTUNITY', color: '#f59e0b', confidence: Math.round(45 + (score - 55) * 1.0) };
    return { emoji: '🚫', headline: 'HIGH RISK — AVOID', color: '#ef4444', confidence: Math.round(20 + score * 0.4) };
}

/**
 * Generate AI reason bullets
 */
function getAIReasons(product, analysis) {
    const reasons = [];
    if (product.trendVelocity > 60) reasons.push({ ok: true, text: 'Demand rising on Google Trends' });
    else if (product.trendVelocity < 40) reasons.push({ ok: false, text: 'Demand is declining or weak' });

    if (product.adCompetition < 45) reasons.push({ ok: true, text: 'Competition still moderate' });
    else if (product.adCompetition > 65) reasons.push({ ok: false, text: 'Market heavily saturated with ads' });

    if (product.profitMargin > 50) reasons.push({ ok: true, text: 'Strong profit margin' });
    else if (product.profitMargin < 30) reasons.push({ ok: false, text: 'Thin profit margin — risky' });

    if (product.supplierReliability > 70) reasons.push({ ok: true, text: 'Supplier has strong reliability score' });
    if (product.marketSaturation < 40) reasons.push({ ok: true, text: 'Low market saturation — early mover advantage' });
    else if (product.marketSaturation > 65) reasons.push({ ok: false, text: 'Market saturation is high' });

    return reasons.slice(0, 4);
}

/**
 * Generate action plan based on product signals
 */
function getActionPlan(product, analysis) {
    const category = product.category || 'General';
    const sellPrice = product.sellPrice || Math.round((product.price || 15) * 2.8);
    const budgetMin = product.adCompetition > 60 ? 150 : 80;
    const budgetMax = budgetMin + 70;

    // Determine best platform
    const platform = product.trendVelocity > 65
        ? 'TikTok Ads'
        : product.adCompetition < 45
            ? 'Facebook / Instagram'
            : 'Google Shopping';

    // Determine rough audience
    const audienceMap = {
        'Home Decor': '25–45 Home Enthusiasts',
        'Electronics': '18–35 Tech Buyers',
        'Beauty': '18–34 Beauty Enthusiasts',
        'Fashion': '18–30 Fashion Buyers',
        'Kitchen': '28–45 Home Cooks',
        'Fitness': '20–40 Fitness Enthusiasts',
        'Pet Supplies': '25–45 Pet Owners',
        'Toys': '25–40 Parents',
        'Baby': '25–35 New Parents',
        'Health': '30–55 Health-Conscious Buyers',
        'Garden': '35–60 Outdoor Lovers',
        'Automotive': '25–50 Car Owners',
    };
    const audience = audienceMap[category] || '18–40 Online Shoppers';

    const supplyRisk = product.supplierReliability < 50 ? 'High' : product.supplierReliability < 70 ? 'Medium' : 'Low';
    const competitionGrowth = product.adCompetition > 60 ? 'High' : product.adCompetition > 35 ? 'Medium' : 'Low';
    const seasonality = product.trendVelocity > 70
        ? 'Year-round demand' : product.trendVelocity > 45
            ? 'Stable' : 'Seasonal — plan carefully';

    return { sellPrice, budgetMin, budgetMax, platform, audience, supplyRisk, competitionGrowth, seasonality };
}

export default function Dashboard() {
    const { isAuthenticated, refreshUser, user } = useAuth();
    const isPro = user?.plan === 'pro';
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        if (searchParams.get('upgrade') === 'success') {
            refreshUser().then(() => {
                setSearchParams({}, { replace: true });
            });
        }
    }, [searchParams]);

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
            ['Product Name', 'Grade', 'Score', 'Profit Margin', 'Trend Velocity', 'Ad Competition', 'CPC Forecast', 'Supplier Reliability', 'Review Sentiment', 'Market Saturation'],
            [product.name, analysis.grade, analysis.score, product.profitMargin, product.trendVelocity, product.adCompetition, product.cpcForecast, product.supplierReliability, product.reviewSentiment, product.marketSaturation]
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_grade.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('CSV exported!');
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

    useEffect(() => {
        loadSavedProducts();
    }, [loadSavedProducts]);

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
            showToast(`${product.name} saved!`, 'success');
        } catch (err) {
            showToast('Failed to save. Please try again.', 'error');
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

    const verdict = getAIVerdict(analysis.score, analysis.grade);
    const reasons = getAIReasons(product, analysis);
    const actionPlan = getActionPlan(product, analysis);

    const demand = getDemandLevel(product.trendVelocity);
    const competition = getCompetitionLevel(product.adCompetition);
    const saturation = getSaturationLevel(product.marketSaturation);
    const profitLevel = getProfitLabel(product.profitMargin);
    const trendLabel = getTrendLabel(product.trendVelocity);
    const supplierLabel = getSupplierLabel(product.supplierReliability);

    const [upgrading, setUpgrading] = useState(false);
    const handleUpgrade = async () => {
        setUpgrading(true);
        try {
            const data = await createCheckoutSession();
            if (data.url) window.location.href = data.url;
        } catch (err) {
            console.error('Upgrade failed:', err);
        } finally {
            setUpgrading(false);
        }
    };

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
            showToast(`${product.name} re-graded!`, 'success');
        } catch (err) {
            showToast('Re-grade failed.', 'error');
        } finally {
            setRegrading(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    };

    return (
        <div className="dashboard-page">
            {/* ---- Header ---- */}
            <div className="dash-header animate-fade-in-up">
                <div className="dash-header-left">
                    <div className="dash-product-icon">
                        {product.image?.startsWith('http') ? (
                            <img src={product.image} alt={product.name} className="dash-product-img" />
                        ) : (
                            product.image
                        )}
                    </div>
                    <div>
                        <h1 className="dash-product-name">{product.name}</h1>
                        <div className="dash-product-meta">
                            <span className="badge badge-info">{product.category}</span>
                            {product.orders && <span className="badge badge-purple">{product.orders.toLocaleString()} orders</span>}
                            {isPro && <span className="badge badge-pro">🚀 Pro</span>}
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
                    <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            {/* ---- Opportunity Score Meter ---- */}
            <div className="opp-meter-section animate-fade-in-up delay-1">
                <div className="opp-meter-card glass-card">
                    <div className="opp-meter-label-top">Opportunity Score</div>
                    <div className="opp-meter-row">
                        <div className="opp-grade-circle" style={{ '--grade-color': getGradeColor(analysis.grade) }}>
                            <span className="opp-grade-letter">{analysis.grade}</span>
                        </div>
                        <div className="opp-score-meta">
                            <div className="opp-score-big" style={{ color: getGradeColor(analysis.grade) }}>
                                {analysis.score}<span className="opp-score-denom">/100</span>
                            </div>
                            <div className="opp-score-sublabel" style={{ color: getGradeColor(analysis.grade) }}>
                                {analysis.grade === 'A' ? 'Excellent' : analysis.grade === 'B' ? 'Good' : analysis.grade === 'C' ? 'Average' : 'Below Average'}
                            </div>
                        </div>
                        <div className="opp-meter-track-wrap">
                            <div className="opp-meter-labels">
                                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                            </div>
                            <div className="opp-meter-track">
                                <div
                                    className="opp-meter-fill"
                                    style={{
                                        width: `${analysis.score}%`,
                                        background: `linear-gradient(90deg, ${getGradeColor(analysis.grade)}, ${getGradeColor(analysis.grade)}cc)`
                                    }}
                                />
                                <div className="opp-meter-glow" style={{ left: `${analysis.score}%`, background: getGradeColor(analysis.grade) }} />
                            </div>
                            <div className="opp-meter-bar-label">Opportunity Meter</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ---- Section 1: AI Verdict ---- */}
            <div className="ai-verdict-section animate-fade-in-up delay-2">
                <div className="ai-verdict-card glass-card" style={{ '--verdict-color': verdict.color }}>
                    <div className="av-header">
                        <div className="av-sparkle"><Sparkles size={16} /></div>
                        <span className="av-section-label">AI Verdict</span>
                    </div>
                    <div className="av-headline-row">
                        <span className="av-emoji">{verdict.emoji}</span>
                        <div>
                            <div className="av-headline" style={{ color: verdict.color }}>{verdict.headline}</div>
                            <div className="av-confidence">Confidence: <strong>{verdict.confidence}%</strong></div>
                        </div>
                    </div>
                    <div className="av-divider" />
                    <div className="av-reasons-title">Why</div>
                    <div className="av-reasons">
                        {reasons.map((r, i) => (
                            <div key={i} className={`av-reason ${r.ok ? 'ok' : 'bad'}`}>
                                <span className="av-reason-dot">{r.ok ? '•' : '✗'}</span>
                                {r.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ---- Section 2: Product Intelligence Grid ---- */}
            <div className="intelligence-section animate-fade-in-up delay-3">
                <div className="glass-card">
                    <div className="section-header">
                        <Activity size={18} className="section-header-icon" />
                        <h3 className="section-title">Product Intelligence Signals</h3>
                    </div>
                    <div className="signal-grid">
                        {[
                            { label: 'Demand', value: demand.label, color: demand.color, icon: TrendingUp, sub: `${product.trendVelocity}/100 trend score` },
                            { label: 'Competition', value: competition.label, color: competition.color, icon: Users, sub: `${product.adCompetition}/100 ad density` },
                            { label: 'Trend', value: `${trendLabel.icon} ${trendLabel.label}`, color: trendLabel.color, icon: TrendingUp, sub: 'Momentum direction' },
                            { label: 'Profit Margin', value: `${profitLevel.label} (${product.profitMargin}%)`, color: profitLevel.color, icon: DollarSign, sub: 'After COGS estimate' },
                            { label: 'Market Saturation', value: saturation.label, color: saturation.color, icon: Activity, sub: `${product.marketSaturation}% occupied` },
                            { label: 'Supplier', value: supplierLabel.label, color: supplierLabel.color, icon: ShieldCheck, sub: `${product.supplierReliability}/100 reliability` },
                            { label: 'Ad Cost', value: product.cpcForecast > 60 ? 'Expensive' : product.cpcForecast > 35 ? 'Moderate' : 'Affordable', color: product.cpcForecast > 60 ? '#ef4444' : product.cpcForecast > 35 ? '#f59e0b' : '#10b981', icon: Target, sub: `CPC index ${product.cpcForecast}/100` },
                            { label: 'Review Score', value: product.reviewSentiment > 70 ? 'Positive' : product.reviewSentiment > 45 ? 'Mixed' : 'Negative', color: product.reviewSentiment > 70 ? '#10b981' : product.reviewSentiment > 45 ? '#f59e0b' : '#ef4444', icon: Star, sub: `${product.reviewSentiment}/100 sentiment` },
                        ].map((sig, i) => (
                            <div key={i} className="signal-tile glass-card-sm" style={{ '--sig-color': sig.color }}>
                                <div className="sig-icon-wrap" style={{ background: `${sig.color}18`, color: sig.color }}>
                                    <sig.icon size={16} />
                                </div>
                                <div className="sig-label">{sig.label}</div>
                                <div className="sig-value" style={{ color: sig.color }}>{sig.value}</div>
                                <div className="sig-sub">{sig.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ---- Section 3: Action Plan ---- */}
            <div className="action-plan-section animate-fade-in-up delay-3">
                <div className="glass-card action-plan-card">
                    <div className="section-header">
                        <Zap size={18} className="section-header-icon" style={{ color: '#f59e0b' }} />
                        <h3 className="section-title">Action Plan</h3>
                        <span className="section-subtitle">Your recommended launch strategy</span>
                    </div>

                    <div className="action-plan-grid">
                        <div className="ap-tile ap-sell-price">
                            <div className="ap-tile-label"><ShoppingCart size={14} /> Selling Price</div>
                            <div className="ap-tile-value ap-price">${actionPlan.sellPrice}</div>
                            <div className="ap-tile-sub">Recommended retail</div>
                        </div>
                        <div className="ap-tile ap-budget">
                            <div className="ap-tile-label"><DollarSign size={14} /> Ad Budget</div>
                            <div className="ap-tile-value">${actionPlan.budgetMin}–${actionPlan.budgetMax}</div>
                            <div className="ap-tile-sub">Per week to start</div>
                        </div>
                        <div className="ap-tile ap-platform">
                            <div className="ap-tile-label"><Tv size={14} /> Best Platform</div>
                            <div className="ap-tile-value ap-platform-val">{actionPlan.platform}</div>
                            <div className="ap-tile-sub">By demand signal</div>
                        </div>
                        <div className="ap-tile ap-audience">
                            <div className="ap-tile-label"><Users size={14} /> Target Audience</div>
                            <div className="ap-tile-value ap-audience-val">{actionPlan.audience}</div>
                            <div className="ap-tile-sub">Core demographic</div>
                        </div>
                    </div>

                    {/* Market Risk Section */}
                    <div className="market-risk-section">
                        <div className="mr-title">Market Risk Assessment</div>
                        <div className="mr-grid">
                            {[
                                { label: 'Supply Risk', value: actionPlan.supplyRisk, color: actionPlan.supplyRisk === 'Low' ? '#10b981' : actionPlan.supplyRisk === 'Medium' ? '#f59e0b' : '#ef4444' },
                                { label: 'Competition Growth', value: actionPlan.competitionGrowth, color: actionPlan.competitionGrowth === 'Low' ? '#10b981' : actionPlan.competitionGrowth === 'Medium' ? '#f59e0b' : '#ef4444' },
                                { label: 'Seasonality', value: actionPlan.seasonality, color: '#06b6d4' },
                            ].map((r, i) => (
                                <div key={i} className="mr-row">
                                    <span className="mr-label">{r.label}</span>
                                    <span className="mr-value" style={{ color: r.color }}>{r.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ---- Pro Upsell / AI Suggestions ---- */}
            {!isPro ? (
                <div className="pro-upsell-card glass-card animate-fade-in-up delay-4">
                    <div className="pro-upsell-left">
                        <Lock size={20} className="pro-upsell-lock" />
                        <div>
                            <div className="pro-upsell-title">Unlock Advanced AI Insights</div>
                            <div className="pro-upsell-sub">Demand Momentum, Commercial Intent, and deeper competitor analysis — Pro only</div>
                        </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleUpgrade} disabled={upgrading}>
                        {upgrading ? <Loader2 size={14} className="spin-icon" /> : <Zap size={14} />}
                        Upgrade to Pro
                    </button>
                </div>
            ) : (
                <div className="pro-insight-section animate-fade-in-up delay-4">
                    <div className="glass-card pro-insight-card">
                        <div className="pro-insight-header">
                            <Flame size={16} className="pro-insight-icon" />
                            <span className="pro-insight-title">Pro Insights</span>
                        </div>
                        <div className="pro-insight-metrics">
                            <div className="pro-insight-metric">
                                <span className="pim-label">Demand Momentum</span>
                                <span className="pim-value">{Math.round(product.trendVelocity * 0.7 + (100 - product.marketSaturation) * 0.3)}/100</span>
                            </div>
                            <div className="pro-insight-metric">
                                <span className="pim-label">Commercial Intent</span>
                                <span className={`pim-value pim-${product.profitMargin > 60 ? 'high' : product.profitMargin > 35 ? 'moderate' : 'low'}`}>
                                    {product.profitMargin > 60 ? 'High' : product.profitMargin > 35 ? 'Moderate' : 'Low'}
                                </span>
                            </div>
                            <div className="pro-insight-metric">
                                <span className="pim-label">Competition Pressure</span>
                                <span className={`pim-value pim-${product.adCompetition > 65 ? 'high' : product.adCompetition > 35 ? 'moderate' : 'low'}`}>
                                    {product.adCompetition > 65 ? 'High' : product.adCompetition > 35 ? 'Moderate' : 'Low'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- Saved Products ---- */}
            <div className="saved-products-section animate-fade-in-up delay-4">
                <div className="glass-card">
                    <div className="saved-header">
                        <h3 className="suggestions-title">
                            <Package size={18} /> Your Saved Products
                        </h3>
                        {isAuthenticated && (
                            <button className="btn btn-secondary btn-sm" onClick={loadSavedProducts} disabled={loadingSaved}>
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
                        const groups = {};
                        savedProducts.forEach(sp => {
                            if (!groups[sp.productName]) groups[sp.productName] = [];
                            groups[sp.productName].push(sp);
                        });
                        Object.values(groups).forEach(arr => arr.sort((a, b) => b.version - a.version));
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

            {/* Toast */}
            <div className={`toast-container ${toast.visible ? 'visible' : ''}`}>
                <div className={`toast toast-${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    <span>{toast.message}</span>
                </div>
            </div>
        </div>
    );
}
