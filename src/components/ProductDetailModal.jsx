import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ArrowRight, TrendingUp, Users, DollarSign,
    Activity, ShieldCheck, Sparkles, GitCompareArrows, ChevronRight
} from 'lucide-react';
import { getGradeColor } from '../engine/gradingEngine';
import './ProductDetailModal.css';

// ---- Signal helpers (duplicated from Finder for independence) ----
function getDemandLevel(p) {
    if (p.trendVelocity > 70) return { label: 'High', color: '#10b981' };
    if (p.trendVelocity > 40) return { label: 'Medium', color: '#f59e0b' };
    return { label: 'Low', color: '#ef4444' };
}

function getCompetitionLevel(p) {
    const avg = ((p.adCompetition || 50) + (p.marketSaturation || 50)) / 2;
    if (avg > 60) return { label: 'High', color: '#ef4444' };
    if (avg > 35) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'Low', color: '#10b981' };
}

function getTrendInfo(p) {
    if (p.trendVelocity >= 70) return { label: 'Rising', color: '#10b981', icon: '↑' };
    if (p.trendVelocity >= 40) return { label: 'Stable', color: '#f59e0b', icon: '→' };
    return { label: 'Declining', color: '#ef4444', icon: '↓' };
}

function getSaturationInfo(p) {
    if (p.marketSaturation < 40) return { label: 'Low', color: '#10b981' };
    if (p.marketSaturation < 65) return { label: 'Medium', color: '#f59e0b' };
    return { label: 'High', color: '#ef4444' };
}

function getAIVerdict(score) {
    if (score >= 85) return { emoji: '🔥', headline: 'HIGH POTENTIAL', color: '#10b981', confidence: Math.round(75 + (score - 85) * 1.3) };
    if (score >= 70) return { emoji: '✅', headline: 'SOLID PRODUCT', color: '#06b6d4', confidence: Math.round(60 + (score - 70) * 1.5) };
    if (score >= 55) return { emoji: '⚠️', headline: 'MODERATE RISK', color: '#f59e0b', confidence: Math.round(45 + (score - 55) * 1.0) };
    return { emoji: '🚫', headline: 'HIGH RISK', color: '#ef4444', confidence: Math.round(20 + score * 0.4) };
}

function getScoreLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Strong';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Moderate';
    return 'Weak';
}

// Overlay animation
const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Modal animation
const modalVariants = {
    hidden: { opacity: 0, scale: 0.93, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', damping: 28, stiffness: 350 },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 10,
        transition: { duration: 0.15 },
    },
};

export default function ProductDetailModal({ product, isOpen, onClose, onCompare, isInCompare }) {
    const navigate = useNavigate();

    // ESC to close
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!product) return null;

    const demand = getDemandLevel(product);
    const competition = getCompetitionLevel(product);
    const trend = getTrendInfo(product);
    const saturation = getSaturationInfo(product);
    const verdict = getAIVerdict(product.score);
    const gradeColor = getGradeColor(product.grade);

    const signals = [
        { label: 'Demand', value: demand.label, color: demand.color, icon: TrendingUp },
        { label: 'Competition', value: competition.label, color: competition.color, icon: Users },
        { label: 'Trend', value: `${trend.icon} ${trend.label}`, color: trend.color, icon: Activity },
        { label: 'Profit', value: `${product.profitMargin}%`, color: '#10b981', icon: DollarSign },
        { label: 'Saturation', value: saturation.label, color: saturation.color, icon: ShieldCheck },
        { label: 'Supplier', value: product.supplierReliability > 70 ? 'Reliable' : product.supplierReliability > 50 ? 'Average' : 'Risky', color: product.supplierReliability > 70 ? '#10b981' : product.supplierReliability > 50 ? '#f59e0b' : '#ef4444', icon: ShieldCheck },
    ];

    const handleViewAnalysis = () => {
        onClose();
        navigate('/dashboard', { state: { product } });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="pdm-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={onClose}
                >
                    <motion.div
                        className="pdm-modal"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close */}
                        <button className="pdm-close" onClick={onClose}>
                            <X size={16} />
                        </button>

                        {/* Image */}
                        <div className="pdm-image-section">
                            {product.image?.startsWith('http') ? (
                                <img src={product.image} alt={product.name} className="pdm-product-img" />
                            ) : (
                                <span className="pdm-emoji">{product.image}</span>
                            )}
                            <div className="pdm-grade-badge-float" style={{ backgroundColor: gradeColor }}>
                                {product.grade}
                            </div>
                        </div>

                        <div className="pdm-body">
                            {/* Header */}
                            <div className="pdm-header">
                                <h2 className="pdm-product-name">{product.name}</h2>
                                <span className="pdm-category">{product.category}</span>
                            </div>

                            {/* Score */}
                            <div className="pdm-score-section">
                                <div className="pdm-score-circle" style={{ backgroundColor: gradeColor }}>
                                    {product.grade}
                                </div>
                                <div className="pdm-score-info">
                                    <div className="pdm-score-value" style={{ color: gradeColor }}>
                                        {product.score}<span className="pdm-score-denom">/100</span>
                                    </div>
                                    <div className="pdm-score-label" style={{ color: gradeColor }}>
                                        {getScoreLabel(product.score)}
                                    </div>
                                </div>
                            </div>

                            {/* Signals */}
                            <div>
                                <div className="pdm-signals-title">Product Signals</div>
                                <div className="pdm-signals-grid" style={{ marginTop: 8 }}>
                                    {signals.map((sig, i) => (
                                        <div key={i} className="pdm-signal">
                                            <div
                                                className="pdm-signal-icon"
                                                style={{ background: `${sig.color}15`, color: sig.color }}
                                            >
                                                <sig.icon size={16} />
                                            </div>
                                            <div className="pdm-signal-info">
                                                <span className="pdm-signal-label">{sig.label}</span>
                                                <span className="pdm-signal-value" style={{ color: sig.color }}>
                                                    {sig.value}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AI Verdict */}
                            <div
                                className="pdm-verdict"
                                style={{
                                    background: `${verdict.color}0a`,
                                    borderColor: `${verdict.color}30`,
                                }}
                            >
                                <span className="pdm-verdict-emoji">{verdict.emoji}</span>
                                <div className="pdm-verdict-content">
                                    <span className="pdm-verdict-headline" style={{ color: verdict.color }}>
                                        {verdict.headline}
                                    </span>
                                    <span className="pdm-verdict-confidence">
                                        Confidence: {verdict.confidence}%
                                    </span>
                                </div>
                            </div>

                            {/* Prices */}
                            <div className="pdm-prices">
                                <span className="pdm-price-cost">${Number(product.price).toFixed(2)}</span>
                                <ArrowRight size={14} className="pdm-price-arrow" />
                                <span className="pdm-price-sell">${Number(product.sellPrice).toFixed(2)}</span>
                                <span className="pdm-price-margin">{product.profitMargin}% margin</span>
                            </div>

                            {/* Actions */}
                            <div className="pdm-actions">
                                <button className="btn pdm-btn-analyze" onClick={handleViewAnalysis}>
                                    <Sparkles size={14} />
                                    View Full Analysis
                                    <ChevronRight size={14} />
                                </button>
                                {onCompare && (
                                    <button
                                        className={`btn pdm-btn-compare ${isInCompare ? 'active' : ''}`}
                                        onClick={() => onCompare(product)}
                                    >
                                        <GitCompareArrows size={14} />
                                        {isInCompare ? 'Added' : 'Compare'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
