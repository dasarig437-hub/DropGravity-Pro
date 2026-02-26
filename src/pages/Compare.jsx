import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Trophy, TrendingUp, TrendingDown, DollarSign,
    Users, Target, ShieldCheck, MessageSquare, BarChart3
} from 'lucide-react';
import { gradeProduct, getGradeColor } from '../engine/gradingEngine';
import './Compare.css';

const metricConfig = [
    { key: 'profitMargin', label: 'Profit Margin', icon: DollarSign, unit: '%', higherBetter: true },
    { key: 'trendVelocity', label: 'Trend Velocity', icon: TrendingUp, unit: '/100', higherBetter: true },
    { key: 'adCompetition', label: 'Ad Competition', icon: Users, unit: '/100', higherBetter: false },
    { key: 'cpcForecast', label: 'CPC Forecast', icon: Target, unit: '/100', higherBetter: false },
    { key: 'supplierReliability', label: 'Supplier Reliability', icon: ShieldCheck, unit: '/100', higherBetter: true },
    { key: 'reviewSentiment', label: 'Review Sentiment', icon: MessageSquare, unit: '/100', higherBetter: true },
    { key: 'marketSaturation', label: 'Market Saturation', icon: BarChart3, unit: '%', higherBetter: false },
];

export default function Compare() {
    const location = useLocation();
    const navigate = useNavigate();

    // Read from route state first, fallback to sessionStorage
    const products = location.state?.products || (() => {
        try {
            return JSON.parse(sessionStorage.getItem('compareProducts') || '[]');
        } catch { return []; }
    })();

    // Persist to sessionStorage whenever we have products
    useEffect(() => {
        if (products.length >= 2) {
            sessionStorage.setItem('compareProducts', JSON.stringify(products));
        }
    }, []);

    if (products.length < 2) {
        return (
            <div className="compare-page">
                <div className="compare-empty glass-card">
                    <BarChart3 size={48} />
                    <h2>No Products to Compare</h2>
                    <p>Select 2–3 products from the Finder to compare them side by side.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/finder')}>
                        Go to Finder
                    </button>
                </div>
            </div>
        );
    }

    // Grade each product
    const analyses = products.map(p => ({
        ...p,
        analysis: gradeProduct({
            profitMargin: p.profitMargin,
            trendVelocity: p.trendVelocity,
            adCompetition: p.adCompetition,
            cpcForecast: p.cpcForecast,
            supplierReliability: p.supplierReliability,
            reviewSentiment: p.reviewSentiment,
            marketSaturation: p.marketSaturation,
        }),
    }));

    // Find overall winner (highest score)
    const winnerIdx = analyses.reduce((best, curr, idx) =>
        curr.analysis.score > analyses[best].analysis.score ? idx : best, 0);

    // Find best value per metric row
    const getRowBest = (key, higherBetter) => {
        const values = products.map(p => p[key]);
        if (higherBetter) return Math.max(...values);
        return Math.min(...values);
    };

    return (
        <div className="compare-page">
            {/* Header */}
            <div className="compare-header animate-fade-in-up">
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
                    <ArrowLeft size={14} /> Back
                </button>
                <div>
                    <h1 className="compare-title">Product Comparison</h1>
                    <p className="compare-subtitle">Side-by-side analysis of {products.length} products</p>
                </div>
            </div>

            {/* Product Header Cards */}
            <div className="compare-grid animate-fade-in-up delay-1" style={{ '--cols': products.length }}>
                {analyses.map((p, i) => (
                    <div key={i} className={`compare-product-header glass-card ${i === winnerIdx ? 'winner' : ''}`}>
                        {i === winnerIdx && (
                            <div className="winner-badge">
                                <Trophy size={12} /> Best Pick
                            </div>
                        )}
                        <div className="cph-emoji">{p.image}</div>
                        <h3 className="cph-name">{p.name}</h3>
                        <span className="cph-category">{p.category}</span>
                        <div className="cph-grade-circle" style={{ '--grade-color': getGradeColor(p.analysis.grade) }}>
                            <span className="cph-grade-letter">{p.analysis.grade}</span>
                        </div>
                        <div className="cph-score">{p.analysis.score}/100</div>
                        <div className="cph-prices">
                            <span className="cph-cost">${p.price}</span>
                            <span className="cph-arrow">→</span>
                            <span className="cph-sell">${p.sellPrice}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Metrics Comparison Table */}
            <div className="compare-table glass-card animate-fade-in-up delay-2">
                <h3 className="compare-section-title">Metric Breakdown</h3>
                <div className="compare-metrics">
                    {metricConfig.map(({ key, label, icon: Icon, unit, higherBetter }) => {
                        const bestVal = getRowBest(key, higherBetter);

                        return (
                            <div key={key} className="compare-metric-row">
                                <div className="cmr-label">
                                    <Icon size={14} />
                                    <span>{label}</span>
                                </div>
                                <div className="cmr-values" style={{ '--cols': products.length }}>
                                    {products.map((p, i) => {
                                        const val = p[key];
                                        const isBest = val === bestVal;
                                        const isWorst = higherBetter
                                            ? val === Math.min(...products.map(x => x[key]))
                                            : val === Math.max(...products.map(x => x[key]));

                                        return (
                                            <div key={i} className={`cmr-value ${isBest ? 'best' : ''} ${isWorst && products.length > 2 ? 'worst' : ''}`}>
                                                <div className="cmr-bar-track">
                                                    <div
                                                        className="cmr-bar-fill"
                                                        style={{
                                                            width: `${val}%`,
                                                            background: isBest ? 'var(--gradient-success)' :
                                                                isWorst && products.length > 2 ? 'var(--gradient-danger)' :
                                                                    'var(--gradient-primary)',
                                                        }}
                                                    />
                                                </div>
                                                <span className="cmr-number">{val}{unit}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Verdict */}
            <div className="compare-verdict glass-card animate-fade-in-up delay-3">
                <Trophy size={24} className="verdict-icon" />
                <div className="verdict-text">
                    <h3>AI Recommendation</h3>
                    <p>
                        <strong style={{ color: getGradeColor(analyses[winnerIdx].analysis.grade) }}>
                            {analyses[winnerIdx].name}
                        </strong> scores highest at {analyses[winnerIdx].analysis.score}/100 with a Grade {analyses[winnerIdx].analysis.grade}.
                        {analyses[winnerIdx].analysis.grade === 'A' ? ' This is an excellent product — consider scaling aggressively.' :
                            analyses[winnerIdx].analysis.grade === 'B' ? ' A solid pick — address weak areas before scaling.' :
                                ' Proceed with caution and review the weak metrics.'}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard', { state: { product: products[winnerIdx] } })}>
                    Analyze Winner →
                </button>
            </div>
        </div>
    );
}
