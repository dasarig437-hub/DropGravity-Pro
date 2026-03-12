import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ArrowRight, TrendingUp, Users, DollarSign,
    Activity, ShieldCheck, Sparkles, GitCompareArrows,
    ChevronRight, Zap, CheckCircle2
} from 'lucide-react';
import { getGradeColor } from '../engine/gradingEngine';
import './ProductIntelPanel.css';

// ---- Signal helpers ----
function getDemandLevel(p) {
    if (p.trendVelocity > 70) return { label: 'High', pct: Math.min(p.trendVelocity, 100), color: '#10b981' };
    if (p.trendVelocity > 40) return { label: 'Medium', pct: Math.min(p.trendVelocity, 100), color: '#f59e0b' };
    return { label: 'Low', pct: Math.max(p.trendVelocity, 10), color: '#ef4444' };
}

function getCompetitionLevel(p) {
    const avg = ((p.adCompetition || 50) + (p.marketSaturation || 50)) / 2;
    if (avg > 60) return { label: 'High', pct: Math.min(avg, 100), color: '#ef4444' };
    if (avg > 35) return { label: 'Moderate', pct: Math.min(avg, 100), color: '#f59e0b' };
    return { label: 'Low', pct: Math.max(avg, 10), color: '#10b981' };
}

function getTrendInfo(p) {
    if (p.trendVelocity >= 70) return { label: '↑ Rising', pct: Math.min(p.trendVelocity, 100), color: '#10b981' };
    if (p.trendVelocity >= 40) return { label: '→ Stable', pct: Math.min(p.trendVelocity, 100), color: '#f59e0b' };
    return { label: '↓ Declining', pct: Math.max(p.trendVelocity, 10), color: '#ef4444' };
}

function getSaturationInfo(p) {
    const sat = p.marketSaturation || 50;
    if (sat < 40) return { label: 'Low', pct: Math.max(sat, 10), color: '#10b981' };
    if (sat < 65) return { label: 'Medium', pct: sat, color: '#f59e0b' };
    return { label: 'High', pct: Math.min(sat, 100), color: '#ef4444' };
}

function getSupplierInfo(p) {
    const rel = p.supplierReliability || 50;
    if (rel > 70) return { label: 'Reliable', pct: Math.min(rel, 100), color: '#10b981' };
    if (rel > 50) return { label: 'Average', pct: rel, color: '#f59e0b' };
    return { label: 'Risky', pct: Math.max(rel, 10), color: '#ef4444' };
}

function getAIVerdict(score) {
    if (score >= 85) return {
        emoji: '🔥', headline: 'HIGH POTENTIAL PRODUCT', color: '#10b981',
        confidence: Math.round(75 + (score - 85) * 1.3),
        reasons: ['Strong demand rising on Google Trends', 'Competition still moderate — early mover advantage', 'High profit margin opportunity']
    };
    if (score >= 70) return {
        emoji: '✅', headline: 'SOLID OPPORTUNITY', color: '#06b6d4',
        confidence: Math.round(60 + (score - 70) * 1.5),
        reasons: ['Steady market demand detected', 'Reasonable competition level', 'Viable profit margins']
    };
    if (score >= 55) return {
        emoji: '⚠️', headline: 'MODERATE RISK', color: '#f59e0b',
        confidence: Math.round(45 + (score - 55) * 1.0),
        reasons: ['Demand signals are mixed', 'Competition may be increasing', 'Profit margins require careful pricing']
    };
    return {
        emoji: '🚫', headline: 'HIGH RISK', color: '#ef4444',
        confidence: Math.round(20 + score * 0.4),
        reasons: ['Low market demand detected', 'Saturated competition environment', 'Thin profit margins']
    };
}

function getScoreLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Strong';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Moderate';
    return 'Weak';
}

// ---- Animation variants ----
const panelVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: { type: 'spring', damping: 30, stiffness: 300 },
    },
    exit: {
        x: '100%',
        opacity: 0,
        transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
    },
};

const signalVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 },
};

const verdictVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.97 },
    visible: {
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    },
};

// ---- Component ----
export default function ProductIntelPanel({ product, onClose, onCompare, isInCompare }) {
    const navigate = useNavigate();
    const [phase, setPhase] = useState('scanning'); // scanning | revealing | complete
    const [visibleSignals, setVisibleSignals] = useState(0);
    const [barWidths, setBarWidths] = useState([0, 0, 0, 0, 0, 0]);
    const productIdRef = useRef(null);
    const timersRef = useRef([]);

    // Build signal data
    const demand = getDemandLevel(product);
    const competition = getCompetitionLevel(product);
    const trend = getTrendInfo(product);
    const profit = { label: `${product.profitMargin}%`, pct: Math.min(product.profitMargin, 100), color: '#10b981' };
    const saturation = getSaturationInfo(product);
    const supplier = getSupplierInfo(product);
    const verdict = getAIVerdict(product.score);
    const gradeColor = getGradeColor(product.grade);

    const signals = [
        { label: 'Demand', ...demand, icon: TrendingUp },
        { label: 'Competition', ...competition, icon: Users },
        { label: 'Trend', ...trend, icon: Activity },
        { label: 'Profit', ...profit, icon: DollarSign },
        { label: 'Saturation', ...saturation, icon: ShieldCheck },
        { label: 'Supplier', ...supplier, icon: ShieldCheck },
    ];

    // Clear all timers
    const clearTimers = useCallback(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    }, []);

    // Animation state machine
    useEffect(() => {
        if (!product) return;

        // Reset when product changes
        const currentId = product.id;
        if (productIdRef.current !== currentId) {
            productIdRef.current = currentId;
            clearTimers();
            setPhase('scanning');
            setVisibleSignals(0);
            setBarWidths([0, 0, 0, 0, 0, 0]);
        }

        if (phase === 'scanning') {
            // After 600ms scanning, start revealing
            const t = setTimeout(() => {
                if (productIdRef.current === currentId) {
                    setPhase('revealing');
                }
            }, 600);
            timersRef.current.push(t);
        }

        if (phase === 'revealing') {
            // Stagger signals with 200ms delay each
            const targetWidths = signals.map(s => s.pct);
            signals.forEach((_, i) => {
                const t = setTimeout(() => {
                    if (productIdRef.current !== currentId) return;
                    setVisibleSignals(prev => Math.max(prev, i + 1));
                    // Animate bar after signal appears
                    const barTimer = setTimeout(() => {
                        if (productIdRef.current !== currentId) return;
                        setBarWidths(prev => {
                            const next = [...prev];
                            next[i] = targetWidths[i];
                            return next;
                        });
                    }, 50);
                    timersRef.current.push(barTimer);
                }, i * 200);
                timersRef.current.push(t);
            });

            // After all signals, move to complete
            const completeTimer = setTimeout(() => {
                if (productIdRef.current === currentId) {
                    setPhase('complete');
                }
            }, signals.length * 200 + 300);
            timersRef.current.push(completeTimer);
        }

        return () => {}; // cleanup handled via clearTimers
    }, [product?.id, phase]);

    // ESC to close
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    // Cleanup on unmount
    useEffect(() => {
        return () => clearTimers();
    }, [clearTimers]);

    const handleViewAnalysis = () => {
        onClose();
        navigate('/dashboard', { state: { product } });
    };

    return (
        <motion.div
            className="intel-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            key="intel-panel"
        >
            {/* Close */}
            <button className="intel-close" onClick={onClose}>
                <X size={14} />
            </button>

            {/* Header */}
            <div className="intel-header">
                <div className="intel-img-wrap">
                    {product.image?.startsWith('http') ? (
                        <img src={product.image} alt={product.name} />
                    ) : (
                        <span className="intel-emoji">{product.image}</span>
                    )}
                </div>
                <div className="intel-header-info">
                    <span className="intel-category">{product.category}</span>
                    <h3 className="intel-product-name">{product.name}</h3>
                    <span className="intel-grade-badge" style={{ backgroundColor: gradeColor }}>
                        {product.grade}
                    </span>
                </div>
            </div>

            {/* Scanning Line */}
            <div className={`intel-scan-bar ${phase === 'scanning' ? 'active' : ''}`}>
                <div className="intel-scan-line" />
            </div>

            {/* Status */}
            <div className={`intel-status ${phase === 'scanning' ? 'scanning' : 'complete'}`}>
                {phase === 'scanning' ? (
                    <>
                        <div className="intel-status-dot" />
                        <Zap size={12} />
                        <span>Analyzing product...</span>
                    </>
                ) : (
                    <>
                        <CheckCircle2 size={12} className="intel-status-icon" />
                        <span>Analysis Complete</span>
                    </>
                )}
            </div>

            <div className="intel-body">
                {/* Opportunity Score */}
                {phase !== 'scanning' && (
                    <motion.div
                        className="intel-score-block"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div
                            className={`intel-score-circle ${phase === 'complete' ? 'glow-pulse' : ''}`}
                            style={{ backgroundColor: gradeColor }}
                        >
                            {product.grade}
                        </div>
                        <div className="intel-score-info">
                            <div className="intel-score-value" style={{ color: gradeColor }}>
                                {product.score}<span className="intel-score-denom">/100</span>
                            </div>
                            <div className="intel-score-label" style={{ color: gradeColor }}>
                                {getScoreLabel(product.score)}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Signals */}
                {phase !== 'scanning' && (
                    <div>
                        <div className="intel-signals-title">Product Signals</div>
                        <div className="intel-signals-list">
                            {signals.map((sig, i) => (
                                <motion.div
                                    key={sig.label}
                                    className="intel-signal-row"
                                    variants={signalVariants}
                                    initial="hidden"
                                    animate={i < visibleSignals ? 'visible' : 'hidden'}
                                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    style={{ pointerEvents: i < visibleSignals ? 'auto' : 'none' }}
                                >
                                    <div
                                        className="intel-signal-icon"
                                        style={{ background: `${sig.color}15`, color: sig.color }}
                                    >
                                        <sig.icon size={14} />
                                    </div>
                                    <div className="intel-signal-info">
                                        <div className="intel-signal-label-row">
                                            <span className="intel-signal-label">{sig.label}</span>
                                            <span className="intel-signal-value" style={{ color: sig.color }}>
                                                {sig.label === 'Profit' ? `${product.profitMargin}%` : sig.value}
                                            </span>
                                        </div>
                                        <div className="intel-bar-track">
                                            <div
                                                className="intel-bar-fill"
                                                style={{ width: `${barWidths[i]}%` }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* AI Verdict */}
                <AnimatePresence>
                    {phase === 'complete' && (
                        <motion.div
                            className="intel-verdict"
                            variants={verdictVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            style={{
                                background: `${verdict.color}08`,
                                borderColor: `${verdict.color}25`,
                            }}
                        >
                            <div className="intel-verdict-header">
                                <span className="intel-verdict-emoji">{verdict.emoji}</span>
                                <div className="intel-verdict-title">
                                    <span className="intel-verdict-headline" style={{ color: verdict.color }}>
                                        {verdict.headline}
                                    </span>
                                    <span className="intel-verdict-confidence">
                                        Confidence: {verdict.confidence}%
                                    </span>
                                </div>
                            </div>
                            <div className="intel-verdict-reasons">
                                {verdict.reasons.map((r, i) => (
                                    <div key={i} className="intel-verdict-reason">{r}</div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Prices */}
                {phase !== 'scanning' && (
                    <motion.div
                        className="intel-prices"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                    >
                        <span className="intel-price-cost">${Number(product.price).toFixed(2)}</span>
                        <ArrowRight size={12} className="intel-price-arrow" />
                        <span className="intel-price-sell">${Number(product.sellPrice).toFixed(2)}</span>
                        <span className="intel-price-margin">{product.profitMargin}% margin</span>
                    </motion.div>
                )}

                {/* Actions */}
                {phase === 'complete' && (
                    <motion.div
                        className="intel-actions"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                    >
                        <button className="btn intel-btn-analyze" onClick={handleViewAnalysis}>
                            <Sparkles size={14} />
                            Full Analysis
                            <ChevronRight size={14} />
                        </button>
                        {onCompare && (
                            <button
                                className={`btn intel-btn-compare ${isInCompare ? 'active' : ''}`}
                                onClick={() => onCompare(product)}
                            >
                                <GitCompareArrows size={14} />
                                {isInCompare ? 'Added' : 'Compare'}
                            </button>
                        )}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
