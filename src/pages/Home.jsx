import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Search, ArrowRight, TrendingUp, Zap, BarChart3,
    Star, Clock, ShieldCheck, Target, Flame, ChevronRight,
    Globe, DollarSign, Sparkles, Loader2
} from 'lucide-react';
import { dailyAGrade, marketSnapshot } from '../data/mockData';
import { getGradeColor } from '../engine/gradingEngine';
import { fetchTrendingProducts } from '../services/api';
import SkeletonGrid from '../components/SkeletonCard';
import './Home.css';

export default function Home() {
    const [searchUrl, setSearchUrl] = useState('');
    const [trendingProducts, setTrendingProducts] = useState([]);
    const [loadingTrending, setLoadingTrending] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchTrendingProducts();
                setTrendingProducts(data);
            } catch (err) {
                console.error('Failed to load trending:', err);
            } finally {
                setLoadingTrending(false);
            }
        };
        load();
    }, []);

    const goToProduct = (product) => {
        navigate('/dashboard', { state: { product } });
    };

    const handleAnalyze = () => {
        if (searchUrl.trim()) {
            navigate('/finder', { state: { keyword: searchUrl.trim() } });
        }
    };

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero-section animate-fade-in-up">
                <div className="hero-glow" />
                <div className="hero-content">
                    <div className="hero-badge">
                        <Sparkles size={14} />
                        AI-Powered Product Intelligence
                    </div>
                    <h1 className="hero-title">
                        Find <span className="gradient-text">Winning Products</span> Before
                        <br />Everyone Else
                    </h1>
                    <p className="hero-subtitle">
                        Analyze any product in seconds. Get AI-powered grades, profit predictions,
                        and risk assessments to make data-driven decisions.
                    </p>

                    {/* Search Bar */}
                    <div className="hero-search">
                        <div className="search-container">
                            <Search size={20} className="hero-search-icon" />
                            <input
                                type="text"
                                placeholder="Paste product URL or enter keywords..."
                                value={searchUrl}
                                onChange={(e) => setSearchUrl(e.target.value)}
                                className="hero-search-input"
                                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                            />
                            <button className="hero-search-btn" onClick={handleAnalyze}>
                                <Zap size={16} />
                                Analyze
                            </button>
                        </div>
                        <div className="search-hints">
                            <span>Try:</span>
                            <button onClick={() => navigate('/finder', { state: { keyword: 'LED Sunset Lamp' } })}>LED Sunset Lamp</button>
                            <button onClick={() => navigate('/finder', { state: { keyword: 'Portable Neck Fan' } })}>Portable Neck Fan</button>
                            <button onClick={() => navigate('/finder', { state: { keyword: 'Star Projector' } })}>Star Projector</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="stats-bar animate-fade-in-up delay-1">
                <div className="stat-item">
                    <div className="stat-icon"><Globe size={18} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{marketSnapshot.risingProducts}</span>
                        <span className="stat-label">Rising Products</span>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon"><DollarSign size={18} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{marketSnapshot.avgCPC}</span>
                        <span className="stat-label">Avg CPC</span>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon"><Flame size={18} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{marketSnapshot.topNiche}</span>
                        <span className="stat-label">Top Niche</span>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon"><Target size={18} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{marketSnapshot.demandIndex}%</span>
                        <span className="stat-label">Demand Index</span>
                    </div>
                </div>
            </section>

            {/* Daily A-Grade Product */}
            <section className="daily-grade-section animate-fade-in-up delay-2">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">🏆 Daily A-Grade Product</h2>
                        <p className="section-subtitle">Top-rated product discovered today by our AI engine</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => goToProduct(dailyAGrade)}>
                        View Analysis <ChevronRight size={14} />
                    </button>
                </div>

                <div className="daily-card glass-card" onClick={() => goToProduct(dailyAGrade)}>
                    <div className="daily-emoji">{dailyAGrade.image}</div>
                    <div className="daily-info">
                        <h3 className="daily-name">{dailyAGrade.name}</h3>
                        <div className="daily-meta">
                            <span className="badge badge-success">Grade {dailyAGrade.grade}</span>
                            <span className="badge badge-info">{dailyAGrade.category}</span>
                            <span className="badge badge-purple">Score: {dailyAGrade.score}</span>
                        </div>
                        <div className="daily-metrics">
                            <div className="daily-metric">
                                <span className="dm-label">Profit Margin</span>
                                <span className="dm-value" style={{ color: '#10b981' }}>{dailyAGrade.profitMargin}%</span>
                            </div>
                            <div className="daily-metric">
                                <span className="dm-label">Trend Velocity</span>
                                <span className="dm-value" style={{ color: '#06b6d4' }}>{dailyAGrade.trendVelocity}/100</span>
                            </div>
                            <div className="daily-metric">
                                <span className="dm-label">Competition</span>
                                <span className="dm-value" style={{ color: '#10b981' }}>Low</span>
                            </div>
                            <div className="daily-metric">
                                <span className="dm-label">Est. ROI</span>
                                <span className="dm-value" style={{ color: '#f59e0b' }}>269%</span>
                            </div>
                        </div>
                    </div>
                    <div className="daily-grade-display">
                        <div className="daily-grade-circle" style={{ borderColor: getGradeColor(dailyAGrade.grade) }}>
                            <span className="daily-grade-letter" style={{ color: getGradeColor(dailyAGrade.grade) }}>
                                {dailyAGrade.grade}
                            </span>
                            <span className="daily-grade-score">{dailyAGrade.score}/100</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trending Products */}
            <section className="trending-section animate-fade-in-up delay-3">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">🔥 Trending Products</h2>
                        <p className="section-subtitle">Products gaining momentum right now</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/finder')}>
                        View All <ChevronRight size={14} />
                    </button>
                </div>

                <div className="trending-grid">
                    {loadingTrending ? (
                        <SkeletonGrid count={6} />
                    ) : (() => {
                        // Filter to B+ grades (score ≥ 65) for credibility
                        let filtered = trendingProducts.filter(p => p.score >= 65);
                        // If too few qualify, lower threshold to C (≥ 55)
                        if (filtered.length < 3) filtered = trendingProducts.filter(p => p.score >= 55);
                        // Fallback: if still too few, take the top 6 by score
                        if (filtered.length < 3) filtered = [...trendingProducts].sort((a, b) => b.score - a.score);
                        return filtered.slice(0, 6);
                    })().map((product, idx) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: idx * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="product-card glass-card"
                            onClick={() => goToProduct(product)}
                        >
                            <div className="pc-header">
                                <div className="pc-emoji">
                                    {product.image?.startsWith('http') ? (
                                        <img src={product.image} alt={product.name} className="pc-img" />
                                    ) : (
                                        product.image
                                    )}
                                </div>
                                <div className="pc-grade-badge" style={{
                                    background: `${getGradeColor(product.grade)}22`,
                                    color: getGradeColor(product.grade),
                                    border: `1px solid ${getGradeColor(product.grade)}44`
                                }}>
                                    {product.grade}
                                </div>
                            </div>
                            <h4 className="pc-name">{product.name}</h4>
                            <div className="pc-category">{product.category}</div>
                            <div className="pc-prices">
                                <span className="pc-cost">${product.price}</span>
                                <ArrowRight size={12} />
                                <span className="pc-sell">${product.sellPrice}</span>
                            </div>
                            <div className="pc-footer">
                                <div className="pc-metric">
                                    <TrendingUp size={12} />
                                    <span>{product.profitMargin}% margin</span>
                                </div>
                                <div className={`pc-trend ${product.trend}`}>
                                    {product.trend === 'rising' ? '↑' : product.trend === 'declining' ? '↓' : '→'}
                                    {product.trend}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Recently Scanned */}
            <section className="recent-section animate-fade-in-up delay-4">
                <div className="section-header">
                    <h2 className="section-title">🕐 Recently Scanned</h2>
                </div>
                <div className="recent-list">
                    {trendingProducts.slice(0, 4).map((product) => (
                        <div key={product.id} className="recent-item glass-card glass-card-sm" onClick={() => goToProduct(product)}>
                            <span className="recent-emoji">
                                {product.image?.startsWith('http') ? (
                                    <img src={product.image} alt={product.name} className="recent-img" />
                                ) : (
                                    product.image
                                )}
                            </span>
                            <div className="recent-info">
                                <span className="recent-name">{product.name}</span>
                                <span className="recent-time">2 hours ago</span>
                            </div>
                            <div className="recent-grade" style={{ color: getGradeColor(product.grade) }}>
                                {product.grade}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
