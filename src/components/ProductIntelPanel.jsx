import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, GitCompareArrows, ChevronRight, ArrowRight } from 'lucide-react';
import { getGradeColor } from '../engine/gradingEngine';
import './ProductIntelPanel.css';

// ---- Data helpers ----
function getDemandInfo(p) {
    const v = p.trendVelocity || 50;
    if (v > 70) return { pct: Math.min(v, 100), label: 'High', color: '#00e5ff' };
    if (v > 40) return { pct: Math.min(v, 100), label: 'Medium', color: '#f59e0b' };
    return { pct: Math.max(v, 8), label: 'Low', color: '#ef4444' };
}
function getCompetitionInfo(p) {
    const avg = ((p.adCompetition || 50) + (p.marketSaturation || 50)) / 2;
    if (avg > 60) return { pct: Math.min(avg, 100), label: 'High', color: '#ef4444' };
    if (avg > 35) return { pct: Math.min(avg, 100), label: 'Moderate', color: '#f59e0b' };
    return { pct: Math.max(avg, 8), label: 'Low', color: '#00e5ff' };
}
function getTrendInfo(p) {
    const v = p.trendVelocity || 50;
    if (v >= 70) return { pct: Math.min(v, 100), label: 'Rising ↑', color: '#00e5ff' };
    if (v >= 40) return { pct: Math.min(v, 100), label: 'Stable →', color: '#f59e0b' };
    return { pct: Math.max(v, 8), label: 'Declining ↓', color: '#ef4444' };
}
function getSatInfo(p) {
    const s = p.marketSaturation || 50;
    if (s < 40) return { pct: Math.max(s, 8), label: 'Low', color: '#00e5ff' };
    if (s < 65) return { pct: s, label: 'Medium', color: '#f59e0b' };
    return { pct: Math.min(s, 100), label: 'High', color: '#ef4444' };
}
function getVerdict(score) {
    if (score >= 85) return { tag: 'HIGH POTENTIAL PRODUCT', color: '#00e5ff', border: 'rgba(0,229,255,0.5)', bg: 'rgba(0,229,255,0.07)', detail: `Analyzed by JARVIS AI Protocol v4.1 — Optimal market fit detected. Predicted Growth: +${Math.round(score * 0.5)}%` };
    if (score >= 70) return { tag: 'SOLID OPPORTUNITY', color: '#a855f7', border: 'rgba(168,85,247,0.5)', bg: 'rgba(168,85,247,0.07)', detail: 'Strong signals confirm viable entry point. Moderate competition advantage detected.' };
    if (score >= 55) return { tag: 'MODERATE RISK', color: '#f59e0b', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.06)', detail: 'Mixed market signals. Careful positioning and pricing strategy required.' };
    return { tag: 'HIGH RISK — AVOID', color: '#ef4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.06)', detail: 'Low demand and high saturation detected. Not recommended for current market.' };
}
function getScoreVerdict(score) {
    if (score >= 85) return 'STRONG POTENTIAL';
    if (score >= 70) return 'SOLID PICK';
    if (score >= 55) return 'MODERATE';
    return 'HIGH RISK';
}

// ---- Arc Score Gauge ----
function ArcGauge({ score, grade, color, animated }) {
    const S = 120;
    const cx = S / 2, cy = S / 2, r = 46, sw = 7;
    const startDeg = -220, sweep = 260;
    const toRad = d => d * Math.PI / 180;
    const pt = (deg) => ({
        x: cx + r * Math.cos(toRad(deg)),
        y: cy + r * Math.sin(toRad(deg)),
    });
    const arc = (from, to) => {
        const s = pt(from), e = pt(to);
        const large = Math.abs(to - from) > 180 ? 1 : 0;
        return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
    };
    const endDeg = startDeg + (animated ? (score / 100) * sweep : 2);
    return (
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ overflow: 'visible' }}>
            {/* Track */}
            <path d={arc(startDeg, startDeg + sweep)} fill="none"
                stroke="rgba(255,255,255,0.06)" strokeWidth={sw} strokeLinecap="round" />
            {/* Fill */}
            <path d={arc(startDeg, endDeg)} fill="none"
                stroke={color} strokeWidth={sw} strokeLinecap="round"
                style={{
                    filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color}60)`,
                    transition: animated ? 'all 1.3s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
                }} />
            {/* Grade */}
            <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
                fill={color} fontSize="30" fontWeight="900" fontFamily="'Courier New', monospace"
                style={{ filter: `drop-shadow(0 0 10px ${color})` }}>
                {grade}
            </text>
            {/* Divider */}
            <text x={cx} y={cy + 6} textAnchor="middle"
                fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="'Courier New', monospace">/</text>
            {/* Score */}
            <text x={cx} y={cy + 20} textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.9)" fontSize="16" fontWeight="800"
                fontFamily="'Courier New', monospace">
                {score}
            </text>
        </svg>
    );
}

// ---- Single Signal Bar Row ---- (matches Image 1: NAME ... BAR ... PCT | LABEL)
function SignalRow({ name, pct, label, color, show, barWidth }) {
    return (
        <motion.div className="jp2-sig-row"
            initial={{ opacity: 0, x: 12 }}
            animate={show ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}>
            <span className="jp2-sig-name">{name}</span>
            <div className="jp2-sig-track">
                <div className="jp2-sig-fill"
                    style={{
                        width: `${barWidth}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}70)`,
                        boxShadow: `0 0 8px ${color}70`,
                    }} />
            </div>
            <span className="jp2-sig-stat" style={{ color }}>
                {Math.round(pct)}% <span className="jp2-sig-label">| {label}</span>
            </span>
        </motion.div>
    );
}

// ---- Hex Grid SVG Background ----
function HexGrid() {
    const hexes = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 6; col++) {
            const x = col * 60 + (row % 2) * 30 + 10;
            const y = row * 52 + 10;
            const pts = Array.from({ length: 6 }, (_, k) => {
                const a = (Math.PI / 3) * k - Math.PI / 6;
                return `${x + 22 * Math.cos(a)},${y + 22 * Math.sin(a)}`;
            }).join(' ');
            hexes.push(<polygon key={`${row}-${col}`} points={pts}
                fill="none" stroke="rgba(0,229,255,0.04)" strokeWidth="1" />);
        }
    }
    return (
        <svg className="jp2-hexbg" viewBox="0 0 400 500"
            xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {hexes}
        </svg>
    );
}

// ---- Panel variants ----
const variants = {
    hidden: { x: '100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 26, stiffness: 240 } },
    exit: { x: '100%', opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

// ---- Main ----
export default function ProductIntelPanel({ product, onClose, onCompare, isInCompare }) {
    const navigate = useNavigate();
    const [phase, setPhase] = useState('scanning');
    const [gaugeOn, setGaugeOn] = useState(false);
    const [visibleSigs, setVisibleSigs] = useState(0);
    const [barWidths, setBarWidths] = useState([0, 0, 0, 0, 0]);
    const [scanPct, setScanPct] = useState(0);
    const productIdRef = useRef(null);
    const timersRef = useRef([]);

    const demand = getDemandInfo(product);
    const competition = getCompetitionInfo(product);
    const trend = getTrendInfo(product);
    const profit = { pct: Math.min(product.profitMargin, 100), label: product.profitMargin >= 50 ? 'High' : product.profitMargin >= 30 ? 'Medium' : 'Low', color: '#00e5ff' };
    const saturation = getSatInfo(product);
    const verdict = getVerdict(product.score);
    const gradeColor = getGradeColor(product.grade);

    const signals = [
        { name: 'DEMAND', ...demand },
        { name: 'COMPETITION', ...competition },
        { name: 'TREND', ...trend },
        { name: 'PROFIT MARGIN', ...profit },
        { name: 'SATURATION', ...saturation },
    ];

    const clearTimers = useCallback(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    }, []);

    useEffect(() => {
        if (!product) return;
        const cid = product.id;
        if (productIdRef.current !== cid) {
            productIdRef.current = cid;
            clearTimers();
            setPhase('scanning');
            setGaugeOn(false);
            setVisibleSigs(0);
            setBarWidths([0, 0, 0, 0, 0]);
            setScanPct(0);
        }
        if (phase === 'scanning') {
            // progress bar 0→100 over ~900ms
            let p = 0;
            const tick = () => {
                p = Math.min(p + 4, 100);
                setScanPct(p);
                if (p < 100) {
                    const t = setTimeout(tick, 38);
                    timersRef.current.push(t);
                } else {
                    const t = setTimeout(() => {
                        if (productIdRef.current === cid) setPhase('revealing');
                    }, 120);
                    timersRef.current.push(t);
                }
            };
            const t0 = setTimeout(tick, 80);
            timersRef.current.push(t0);
        }
        if (phase === 'revealing') {
            const tg = setTimeout(() => { if (productIdRef.current === cid) setGaugeOn(true); }, 100);
            timersRef.current.push(tg);
            signals.forEach((sig, i) => {
                const t = setTimeout(() => {
                    if (productIdRef.current !== cid) return;
                    setVisibleSigs(prev => Math.max(prev, i + 1));
                    const bt = setTimeout(() => {
                        if (productIdRef.current !== cid) return;
                        setBarWidths(prev => { const n = [...prev]; n[i] = sig.pct; return n; });
                    }, 50);
                    timersRef.current.push(bt);
                }, 250 + i * 200);
                timersRef.current.push(t);
            });
            const tc = setTimeout(() => {
                if (productIdRef.current === cid) setPhase('complete');
            }, 250 + signals.length * 200 + 250);
            timersRef.current.push(tc);
        }
        return () => clearTimers();
    }, [product?.id, phase]);

    useEffect(() => {
        const fn = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [onClose]);

    useEffect(() => () => clearTimers(), [clearTimers]);

    const scanning = phase === 'scanning';

    return (
        <motion.div className="jp2-panel" variants={variants}
            initial="hidden" animate="visible" exit="exit" key="jp2-panel">

            <HexGrid />

            {/* HUD Corners */}
            <div className="jp2-c jp2-c-tl" /><div className="jp2-c jp2-c-tr" />
            <div className="jp2-c jp2-c-bl" /><div className="jp2-c jp2-c-br" />

            {/* ── TOP STATUS BAR ── */}
            <div className="jp2-topbar">
                <div className="jp2-topbar-left">
                    <span className={`jp2-dot ${scanning ? 'blink' : 'done'}`} />
                    <span className="jp2-topbar-text">
                        {scanning ? 'AI ACTIVE | ANALYZING...' : 'AI ACTIVE | ANALYSIS COMPLETE'}
                    </span>
                    {/* tick marks like in image */}
                    <div className="jp2-ticks" aria-hidden="true">
                        {Array.from({ length: 18 }, (_, i) => (
                            <div key={i} className="jp2-tick"
                                style={{ opacity: i < Math.round(scanPct / 100 * 18) ? 0.8 : 0.15 }} />
                        ))}
                    </div>
                </div>
                <button className="jp2-close" onClick={onClose} aria-label="Close"><X size={11} /></button>
            </div>

            {/* Scan progress line */}
            <div className="jp2-scanbar">
                <div className="jp2-scanfill" style={{ width: `${scanPct}%` }} />
            </div>

            {/* ── PANEL LABEL + PRODUCT NAME ── */}
            <div className="jp2-header">
                <div className="jp2-panel-label">AI INTELLIGENCE PANEL</div>
                <h2 className="jp2-product-name">{product.name.toUpperCase()}</h2>
            </div>

            {/* ── MAIN BODY: IMAGE LEFT | SCORE RIGHT ── */}
            <div className="jp2-main">

                {/* Product image — holographic */}
                <div className="jp2-img-col">
                    <div className="jp2-img-box">
                        {/* Hex pattern inside image box */}
                        <div className="jp2-img-hex-overlay" aria-hidden="true" />
                        {/* Scan line during scanning */}
                        {scanning && <div className="jp2-img-scan" />}
                        {/* Image */}
                        <div className="jp2-img-inner">
                            {product.image?.startsWith('http') ? (
                                <img src={product.image} alt={product.name} className="jp2-img" />
                            ) : (
                                <span className="jp2-emoji">{product.image}</span>
                            )}
                        </div>
                        {/* Holographic floor line */}
                        <div className="jp2-img-floor" style={{ background: `linear-gradient(90deg, transparent, ${gradeColor}30, transparent)` }} />
                        {/* Outer ring */}
                        <div className="jp2-img-ring" style={{ borderColor: `${gradeColor}25` }} />
                    </div>
                    {/* Price row under image */}
                    {phase !== 'scanning' && (
                        <div className="jp2-price-row">
                            <span className="jp2-price-cost">${Number(product.price).toFixed(2)}</span>
                            <ArrowRight size={10} className="jp2-price-arr" />
                            <span className="jp2-price-sell">${Number(product.sellPrice).toFixed(2)}</span>
                            <span className="jp2-margin-badge">{product.profitMargin}%</span>
                        </div>
                    )}
                </div>

                {/* Score + signals column */}
                <div className="jp2-score-col">
                    <div className="jp2-score-label">OPPORTUNITY SCORE</div>
                    <div className="jp2-arc-wrap">
                        <div className="jp2-arc-glow"
                            style={{ background: `radial-gradient(circle, ${gradeColor}25 0%, transparent 65%)` }} />
                        <ArcGauge score={product.score} grade={product.grade}
                            color={gradeColor} animated={gaugeOn} />
                    </div>
                    <div className="jp2-score-verdict" style={{ color: gradeColor }}>
                        {getScoreVerdict(product.score)}
                    </div>

                    {/* Divider */}
                    {phase !== 'scanning' && <div className="jp2-inner-divider" />}

                    {/* Signal bars */}
                    {phase !== 'scanning' && (
                        <div className="jp2-signals">
                            {signals.map((sig, i) => (
                                <SignalRow key={sig.name}
                                    name={sig.name} pct={sig.pct}
                                    label={sig.label} color={sig.color}
                                    show={i < visibleSigs}
                                    barWidth={barWidths[i] || 0} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── AI VERDICT ── */}
            <AnimatePresence>
                {phase === 'complete' && (
                    <motion.div className="jp2-verdict"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                        style={{ background: verdict.bg, borderColor: verdict.border, boxShadow: `0 0 20px ${verdict.color}15` }}>
                        <div className="jp2-verdict-label">AI VERDICT</div>
                        <div className="jp2-verdict-tag"
                            style={{ color: verdict.color, textShadow: `0 0 14px ${verdict.color}` }}>
                            {verdict.tag}
                        </div>
                        <div className="jp2-verdict-detail">{verdict.detail}</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── ACTIONS ── */}
            {phase === 'complete' && (
                <motion.div className="jp2-actions"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}>
                    <button className="jp2-btn-analyze"
                        onClick={() => { onClose(); navigate('/dashboard', { state: { product } }); }}>
                        <Sparkles size={12} />FULL ANALYSIS<ChevronRight size={12} />
                    </button>
                    {onCompare && (
                        <button className={`jp2-btn-compare ${isInCompare ? 'active' : ''}`}
                            onClick={() => onCompare(product)}>
                            <GitCompareArrows size={12} />
                            {isInCompare ? 'ADDED ✓' : 'COMPARE'}
                        </button>
                    )}
                </motion.div>
            )}

            {/* ── BOTTOM BAR ── */}
            <div className="jp2-footer">
                <span className="jp2-footer-left">AI ACTIVE | ANALYZING...</span>
                {phase === 'complete' && (
                    <span className="jp2-footer-right" style={{ color: '#a855f7' }}>
                        PREDICTED GROWTH: +{Math.round(product.score * 0.45)}%
                    </span>
                )}
            </div>
        </motion.div>
    );
}