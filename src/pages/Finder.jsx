import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search, SlidersHorizontal, Upload, Link, Filter,
    ChevronDown, ChevronUp, ArrowRight, TrendingUp, Star,
    X, Grid, List, SearchX, Loader2, GitCompareArrows, AlertTriangle,
    Tv, Zap, Ban
} from 'lucide-react';
import { getGradeColor } from '../engine/gradingEngine';
import { analyzeProducts, fetchTrendingProducts, completeAd, createCheckoutSession } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Finder.css';

const GRADE_RANK = { A: 1, B: 2, C: 3, D: 4, F: 5 };

// ---- Signal helpers ----
function getDemandLevel(p) {
    if (p.trendVelocity > 70) return 'High';
    if (p.trendVelocity > 40) return 'Medium';
    return 'Low';
}

function getCompetitionLevel(p) {
    const avg = ((p.adCompetition || 50) + (p.marketSaturation || 50)) / 2;
    if (avg > 60) return 'High';
    if (avg > 35) return 'Moderate';
    return 'Low';
}

function getDemandScore(p) {
    const trendPart = (p.trendVelocity || 50) * 0.7;
    const ordersPart = Math.min((p.orders || 0) / 2000, 30) * 0.3;
    return Math.round(trendPart + ordersPart);
}

function getSignalColor(label) {
    const colors = {
        'High': '#10b981', 'Medium': '#f59e0b', 'Low': '#ef4444',
        'Moderate': '#f59e0b',
    };
    return colors[label] || 'var(--text-secondary)';
}

function getDemandColor(label) {
    return { 'High': '#10b981', 'Medium': '#f59e0b', 'Low': '#ef4444' }[label] || '#888';
}

function getCompetitionColor(label) {
    // Low competition = good (green), High = bad (red)
    return { 'Low': '#10b981', 'Moderate': '#f59e0b', 'High': '#ef4444' }[label] || '#888';
}

const DEFAULT_FILTERS = { demand: 'All', competition: 'All', profit: 'All', trend: 'All', price: 'All', grade: 'All' };

function getPerformanceLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Strong';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Risky';
    return 'Weak';
}

export default function Finder() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [activeTab, setActiveTab] = useState('keyword');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [signal, setSignal] = useState('high');
    const [searchShake, setSearchShake] = useState(false);
    const [searchTooltip, setSearchTooltip] = useState('');
    const searchDebounceRef = useRef(false);
    const [compareList, setCompareList] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem('compareList') || '[]');
        } catch { return []; }
    });
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
    const incomingHandled = useRef(false);

    // ---- Quota state (Phase 4) ----
    const [quotaInfo, setQuotaInfo] = useState(null);
    const [quotaBlocked, setQuotaBlocked] = useState(false);
    const [watchingAd, setWatchingAd] = useState(false);
    const [quotaUsage, setQuotaUsage] = useState(null); // from last successful analyze

    const isPro = user?.plan === 'pro';

    const [upgrading, setUpgrading] = useState(false);

    const searchTabs = [
        { id: 'keyword', label: 'Keyword' },
        { id: 'shopify', label: 'Shopify URL' },
        { id: 'tiktok', label: 'TikTok URL' },
        { id: 'aliexpress', label: 'AliExpress URL' },
        { id: 'csv', label: 'CSV Upload' },
    ];

    const advancedQueries = [
        { label: 'LED lamps', query: 'LED lamp' },
        { label: 'Phone accessories', query: 'phone case' },
        { label: 'Home decor', query: 'home decor' },
        { label: 'Fitness gear', query: 'resistance band' },
    ];

    // Helper: process analyze response (shared by all search paths)
    const processAnalyzeResult = (data) => {
        if (data.quotaBlocked) {
            setQuotaBlocked(true);
            setQuotaInfo(data);
            setProducts([]);
            return;
        }
        setQuotaBlocked(false);
        setQuotaInfo(null);
        setProducts(data.products || data);
        setSignal(data.signal || 'high');
        // Update quota usage from backend response
        if (data.quota) {
            setQuotaUsage(data.quota);
        }
    };

    // On mount: check for incoming keyword from header/home search, or load trending
    useEffect(() => {
        const incomingKeyword = location.state?.keyword;

        if (incomingKeyword && !incomingHandled.current) {
            incomingHandled.current = true;
            setSearchQuery(incomingKeyword);
            setSearched(true);
            setLoading(true);
            // Clear the navigation state so re-visit doesn't re-trigger
            window.history.replaceState({}, '');
            analyzeProducts(incomingKeyword)
                .then(processAnalyzeResult)
                .catch(err => { console.error('Search failed:', err); setProducts([]); })
                .finally(() => setLoading(false));
        } else if (!incomingHandled.current) {
            incomingHandled.current = true;
            setLoading(true);
            fetchTrendingProducts()
                .then(data => setProducts(data))
                .catch(err => console.error('Failed to load trending:', err))
                .finally(() => setLoading(false));
        }
    }, [location.state]);

    // Search handler
    const handleSearch = async () => {
        const query = searchQuery.trim();
        if (!query) {
            setSearchShake(true);
            setSearchTooltip('Enter a keyword to analyze');
            setTimeout(() => setSearchShake(false), 500);
            setTimeout(() => setSearchTooltip(''), 1500);
            return;
        }
        if (searchDebounceRef.current) return;

        searchDebounceRef.current = true;
        setLoading(true);
        setSearched(true);
        setQuotaBlocked(false);
        setQuotaInfo(null);
        try {
            const data = await analyzeProducts(query);
            processAnalyzeResult(data);
        } catch (err) {
            console.error('Search failed:', err);
            setProducts([]);
        } finally {
            setLoading(false);
            setTimeout(() => { searchDebounceRef.current = false; }, 300);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleQuickQuery = async (query) => {
        if (searchDebounceRef.current) return;
        searchDebounceRef.current = true;
        setSearchQuery(query);
        setLoading(true);
        setSearched(true);
        setQuotaBlocked(false);
        setQuotaInfo(null);
        try {
            const data = await analyzeProducts(query);
            processAnalyzeResult(data);
        } catch (err) {
            console.error('Quick query failed:', err);
            setProducts([]);
        } finally {
            setLoading(false);
            setTimeout(() => { searchDebounceRef.current = false; }, 300);
        }
    };

    // ---- Watch Ad handler (Phase 4) — guarded ----
    const handleWatchAd = async () => {
        // Guard: prevent double-click, empty query, already watching
        if (watchingAd) return;
        const query = searchQuery.trim();
        if (!query) return;

        setWatchingAd(true);
        try {
            // Simulate 2-second ad viewing delay (real AdSense later)
            await new Promise(resolve => setTimeout(resolve, 2000));
            await completeAd();

            // Reset quota state and re-trigger search
            setQuotaBlocked(false);
            setQuotaInfo(null);

            const data = await analyzeProducts(query);
            processAnalyzeResult(data);
        } catch (err) {
            console.error('Ad flow failed:', err);
        } finally {
            setWatchingAd(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearched(false);
        setQuotaBlocked(false);
        setQuotaInfo(null);
        setFilters({ ...DEFAULT_FILTERS });
        // Reload trending
        const loadTrending = async () => {
            setLoading(true);
            try {
                const data = await fetchTrendingProducts();
                setProducts(data);
            } catch (err) {
                console.error('Failed to load trending:', err);
            } finally {
                setLoading(false);
            }
        };
        loadTrending();
    };

    // Client-side post-filters on API results
    const filteredProducts = products.filter(p => {
        const demand = getDemandLevel(p);
        const competition = getCompetitionLevel(p);
        if (filters.demand !== 'All' && demand !== filters.demand) return false;
        if (filters.competition !== 'All' && competition !== filters.competition) return false;
        if (filters.profit === '30+' && p.profitMargin < 30) return false;
        if (filters.profit === '50+' && p.profitMargin < 50) return false;
        if (filters.profit === '70+' && p.profitMargin < 70) return false;
        if (filters.trend !== 'All' && p.trend !== filters.trend.toLowerCase()) return false;
        if (filters.price === 'Under $30' && p.sellPrice >= 30) return false;
        if (filters.price === '$30-$100' && (p.sellPrice < 30 || p.sellPrice > 100)) return false;
        if (filters.price === '$100+' && p.sellPrice < 100) return false;
        if (filters.grade !== 'All' && p.grade !== filters.grade) return false;
        return true;
    });

    // Compare logic — persists to sessionStorage
    const toggleCompare = (product, e) => {
        e.stopPropagation();
        setCompareList(prev => {
            const exists = prev.find(p => p.id === product.id);
            let next;
            if (exists) next = prev.filter(p => p.id !== product.id);
            else if (prev.length >= 3) next = prev;
            else next = [...prev, product];
            sessionStorage.setItem('compareList', JSON.stringify(next));
            return next;
        });
    };

    const isInCompare = (id) => compareList.some(p => p.id === id);

    const clearCompare = () => {
        setCompareList([]);
        sessionStorage.removeItem('compareList');
    };

    const goToCompare = () => {
        if (compareList.length >= 2) {
            sessionStorage.setItem('compareProducts', JSON.stringify(compareList));
            navigate('/compare', { state: { products: compareList } });
        }
    };

    // ---- Usage indicator text (Phase 4) ----
    const renderUsageIndicator = () => {
        if (!isAuthenticated) return null;

        if (isPro) {
            return (
                <div className="search-usage-indicator search-usage-pro">
                    <Zap size={13} />
                    <span>Pro Plan — Unlimited Searches</span>
                </div>
            );
        }

        if (quotaUsage && quotaUsage.plan !== 'pro') {
            const base = quotaUsage.dailySearchCount ?? 0;
            const limit = quotaUsage.baseLimit ?? 3;
            const bonus = quotaUsage.bonusSearchCredits ?? 0;
            return (
                <div className="search-usage-indicator">
                    <Search size={13} />
                    <span>
                        Searches Today: {base} / {limit}
                        {bonus > 0 && <span className="usage-bonus"> (+{bonus} bonus)</span>}
                    </span>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="finder-page">
            {/* Search Header */}
            <div className="finder-header animate-fade-in-up">
                <h1 className="finder-title">Product Finder</h1>
                <p className="finder-subtitle">
                    {searched
                        ? `Showing results for "${searchQuery}"`
                        : 'Search any keyword to discover winning products'
                    }
                </p>
            </div>

            {/* Search Tabs */}
            <div className="finder-search-section animate-fade-in-up delay-1">
                <div className="tabs">
                    {searchTabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                            {['shopify', 'tiktok', 'aliexpress', 'csv'].includes(tab.id) && (
                                <span className="tab-coming-soon">Soon</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="finder-search-box">
                    {activeTab === 'csv' ? (
                        <div className="csv-upload-area">
                            <Upload size={24} />
                            <p>Drop your CSV file here or click to browse</p>
                            <span>Supports: .csv, .xlsx (max 500 products)</span>
                        </div>
                    ) : (
                        <div className={`search-container ${searchShake ? 'shake' : ''}`}>
                            {activeTab === 'keyword' ? <Search size={18} className="hero-search-icon" /> : <Link size={18} className="hero-search-icon" />}
                            <input
                                type="text"
                                placeholder={
                                    activeTab === 'keyword' ? 'Search any product keyword (e.g., slippers, LED lamp, phone case)...' :
                                        activeTab === 'shopify' ? 'Paste Shopify store URL...' :
                                            activeTab === 'tiktok' ? 'Paste TikTok product URL...' :
                                                'Paste AliExpress product URL...'
                                }
                                className="hero-search-input"
                                value={searchQuery}
                                maxLength={200}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button className="hero-search-btn" onClick={handleSearch} disabled={loading}>
                                {loading ? <Loader2 size={16} className="spin-icon" /> : <Search size={16} />}
                                {loading ? 'Analyzing...' : 'Analyze'}
                            </button>
                            {searchTooltip && <span className="search-tooltip animate-fade-in">{searchTooltip}</span>}
                        </div>
                    )}
                </div>

                {/* Usage Indicator (Phase 4) */}
                {renderUsageIndicator()}

                {/* Quick Queries */}
                <div className="advanced-queries">
                    <span className="aq-label">Try:</span>
                    {advancedQueries.map((aq, i) => (
                        <button key={i} className="aq-btn" onClick={() => handleQuickQuery(aq.query)}>
                            {aq.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="finder-content animate-fade-in-up delay-2">
                {/* Filter Toggle & View Mode */}
                <div className="finder-toolbar">
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowFilters(!showFilters)}>
                        <SlidersHorizontal size={14} />
                        Filters
                        {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <div className="finder-results-info">
                        <span>
                            {loading ? 'Analyzing products...' : `${filteredProducts.length} products found`}
                        </span>
                    </div>
                    <div className="view-toggle">
                        <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><Grid size={16} /></button>
                        <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={16} /></button>
                    </div>
                </div>

                <div className="finder-body">
                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="filters-panel glass-card animate-fade-in">
                            <h3 className="filters-title"><Filter size={14} /> Filters</h3>

                            <div className="filter-group">
                                <label className="filter-label">Demand</label>
                                <div className="filter-pills">
                                    {['All', 'High', 'Medium', 'Low'].map(v => (
                                        <button key={v} className={`filter-pill ${filters.demand === v ? 'active' : ''}`}
                                            onClick={() => setFilters({ ...filters, demand: v })}>{v}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Competition</label>
                                <div className="filter-pills">
                                    {['All', 'Low', 'Moderate', 'High'].map(v => (
                                        <button key={v} className={`filter-pill ${filters.competition === v ? 'active' : ''}`}
                                            onClick={() => setFilters({ ...filters, competition: v })}>{v}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Profit Margin</label>
                                <div className="filter-pills">
                                    {['All', '30+', '50+', '70+'].map(v => (
                                        <button key={v} className={`filter-pill ${filters.profit === v ? 'active' : ''}`}
                                            onClick={() => setFilters({ ...filters, profit: v })}>{v === 'All' ? v : `${v}%`}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Trend</label>
                                <div className="filter-pills">
                                    {['All', 'Rising', 'Stable', 'Declining'].map(v => (
                                        <button key={v} className={`filter-pill ${filters.trend === v ? 'active' : ''}`}
                                            onClick={() => setFilters({ ...filters, trend: v })}>{v}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Price Range</label>
                                <div className="filter-pills">
                                    {['All', 'Under $30', '$30-$100', '$100+'].map(v => (
                                        <button key={v} className={`filter-pill ${filters.price === v ? 'active' : ''}`}
                                            onClick={() => setFilters({ ...filters, price: v })}>{v}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Grade</label>
                                <div className="filter-pills">
                                    {['All', 'A', 'B', 'C', 'D'].map(v => (
                                        <button key={v} className={`filter-pill ${filters.grade === v ? 'active' : ''}`}
                                            onClick={() => setFilters({ ...filters, grade: v })}>{v}</button>
                                    ))}
                                </div>
                            </div>

                            <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}
                                onClick={() => setFilters({ ...DEFAULT_FILTERS })}>
                                <X size={14} /> Clear All
                            </button>
                        </div>
                    )}

                    {/* Quota Blocked Card (Phase 4) */}
                    {quotaBlocked && !isPro ? (
                        <div className="quota-blocked-card glass-card animate-fade-in">
                            <div className="quota-blocked-icon">
                                <Ban size={48} />
                            </div>
                            <h3>Daily Limit Reached</h3>
                            <p className="quota-blocked-detail">
                                Base remaining: <strong>{quotaInfo?.remainingBase ?? 0}</strong> &nbsp;·&nbsp;
                                Bonus remaining: <strong>{quotaInfo?.bonusCredits ?? 0}</strong>
                            </p>

                            {/* Primary: Upgrade CTA */}
                            <button
                                className="quota-upgrade-btn"
                                onClick={async () => {
                                    setUpgrading(true);
                                    try {
                                        const data = await createCheckoutSession();
                                        if (data.url) window.location.href = data.url;
                                    } catch (err) {
                                        console.error('Upgrade failed:', err);
                                    } finally {
                                        setUpgrading(false);
                                    }
                                }}
                                disabled={upgrading}
                            >
                                {upgrading ? <Loader2 size={16} className="spin-icon" /> : <Zap size={16} />}
                                Want Unlimited Searches? Upgrade to Pro
                            </button>
                            <p className="quota-upgrade-sub">No ads, no limits, advanced insights</p>

                            <div className="quota-divider">
                                <span>or</span>
                            </div>

                            {/* Secondary: Watch Ad */}
                            {quotaInfo?.adAvailable ? (
                                <button
                                    className={`quota-ad-btn ${watchingAd ? 'loading' : ''}`}
                                    onClick={handleWatchAd}
                                    disabled={watchingAd}
                                >
                                    {watchingAd ? (
                                        <>
                                            <Loader2 size={16} className="spin-icon" />
                                            Watching Ad...
                                        </>
                                    ) : (
                                        <>
                                            <Tv size={16} />
                                            Watch Ad to Unlock 2 More Searches
                                        </>
                                    )}
                                </button>
                            ) : (
                                <p className="quota-exhausted">
                                    You've used your 2 daily ad unlocks. Come back tomorrow.
                                </p>
                            )}
                        </div>
                    ) : loading ? (
                        <div className="finder-empty-state">
                            <Loader2 size={48} className="finder-empty-icon spin-icon" />
                            <h3>Analyzing products...</h3>
                            <p>Our AI engine is generating product insights</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="finder-empty-state">
                            <SearchX size={48} className="finder-empty-icon" />
                            <h3>No products match your search</h3>
                            <p>Try broader keywords or adjust your filters</p>
                            <button className="btn btn-primary btn-sm" onClick={clearSearch}>
                                <X size={14} /> Clear All Filters
                            </button>
                        </div>
                    ) : (
                        <div className={`finder-results ${viewMode}`}>
                            {filteredProducts.map((product) => (
                                <div key={product.id}
                                    className={`finder-product-card glass-card ${viewMode === 'list' ? 'list-card' : ''} ${isInCompare(product.id) ? 'compare-selected' : ''}`}
                                    onClick={() => navigate('/dashboard', { state: { product } })}
                                >
                                    {/* Compare checkbox */}
                                    <button
                                        className={`compare-btn ${isInCompare(product.id) ? 'active' : ''}`}
                                        onClick={(e) => toggleCompare(product, e)}
                                        title={isInCompare(product.id) ? 'Remove from compare' : 'Add to compare'}
                                    >
                                        <GitCompareArrows size={14} />
                                    </button>
                                    <div className="fpc-header">
                                        <span className="fpc-emoji">
                                            {product.image?.startsWith('http') ? (
                                                <img src={product.image} alt={product.name} className="fpc-img" />
                                            ) : (
                                                product.image
                                            )}
                                        </span>
                                        <div className="fpc-opportunity" style={{
                                            borderColor: `${getGradeColor(product.grade)}66`,
                                            background: `${getGradeColor(product.grade)}12`,
                                        }}>
                                            <span className="fpc-opp-label">Opportunity</span>
                                            <span className="fpc-opp-grade" style={{ color: getGradeColor(product.grade) }}>
                                                {product.grade}
                                            </span>
                                            <span className="fpc-opp-score">{product.score}</span>
                                            <span className="fpc-opp-perf" style={{ color: getGradeColor(product.grade) }}>
                                                {getPerformanceLabel(product.score)}
                                            </span>
                                        </div>
                                    </div>
                                    <h4 className="fpc-name">{product.name}</h4>
                                    <div className="fpc-signals">
                                        <div className="signal-row">
                                            <span className="signal-label">Demand</span>
                                            <span className="signal-pill" style={{ color: getDemandColor(getDemandLevel(product)), background: `${getDemandColor(getDemandLevel(product))}18` }}>
                                                {getDemandLevel(product)}
                                                <span className="signal-score">{getDemandScore(product)}</span>
                                            </span>
                                        </div>
                                        <div className="signal-row">
                                            <span className="signal-label">Competition</span>
                                            <span className="signal-pill" style={{ color: getCompetitionColor(getCompetitionLevel(product)), background: `${getCompetitionColor(getCompetitionLevel(product))}18` }}>
                                                {getCompetitionLevel(product)}
                                            </span>
                                        </div>
                                        <div className="signal-row">
                                            <span className="signal-label">Profit</span>
                                            <span className="signal-pill" style={{ color: '#10b981', background: '#10b98118' }}>
                                                {product.profitMargin}%
                                            </span>
                                        </div>
                                        <div className="signal-row">
                                            <span className="signal-label">Trend</span>
                                            <span className={`signal-pill trend-${product.trend}`}>
                                                {product.trend === 'rising' ? '↑' : product.trend === 'declining' ? '↓' : '→'} {product.trend}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="fpc-prices">
                                        <span className="fpc-cost">${Number(product.price).toFixed(2)}</span>
                                        <ArrowRight size={10} />
                                        <span className="fpc-sell">${Number(product.sellPrice).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Compare Floating Bar */}
            {compareList.length >= 2 && (
                <div className="compare-floating-bar animate-fade-in-up">
                    <div className="compare-bar-info">
                        <GitCompareArrows size={18} />
                        <span>{compareList.length} products selected</span>
                    </div>
                    <div className="compare-bar-actions">
                        <button className="btn btn-secondary btn-sm" onClick={clearCompare}>
                            Clear
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={goToCompare}>
                            Compare Now →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
