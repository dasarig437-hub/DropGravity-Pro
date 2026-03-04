import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search, SlidersHorizontal, Upload, Link, Filter,
    ChevronDown, ChevronUp, ArrowRight, TrendingUp, Star,
    X, Grid, List, SearchX, Loader2, GitCompareArrows, AlertTriangle,
    Tv, Zap, Ban
} from 'lucide-react';
import { niches, regions } from '../data/mockData';
import { getGradeColor } from '../engine/gradingEngine';
import { analyzeProducts, fetchTrendingProducts, completeAd, createCheckoutSession } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Finder.css';

const GRADE_RANK = { A: 1, B: 2, C: 3, D: 4, F: 5 };

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
    const [filters, setFilters] = useState({
        niche: 'All Niches',
        region: 'All Regions',
        minMargin: 0,
        minGrade: 'F',
        maxSaturation: 100,
    });
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
        setFilters({ niche: 'All Niches', region: 'All Regions', minMargin: 0, minGrade: 'F', maxSaturation: 100 });
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
        if (filters.niche !== 'All Niches' && p.category !== filters.niche) return false;
        if (p.profitMargin < filters.minMargin) return false;
        if (p.marketSaturation > filters.maxSaturation) return false;
        if (filters.minGrade !== 'F' && (GRADE_RANK[p.grade] || 5) > (GRADE_RANK[filters.minGrade] || 5)) return false;
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
                                <label className="filter-label">Niche</label>
                                <select className="select-field" value={filters.niche} onChange={e => setFilters({ ...filters, niche: e.target.value })}>
                                    {niches.map(n => <option key={n}>{n}</option>)}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Region</label>
                                <select className="select-field" value={filters.region} onChange={e => setFilters({ ...filters, region: e.target.value })}>
                                    {regions.map(r => <option key={r}>{r}</option>)}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Min Profit Margin: {filters.minMargin}%</label>
                                <input type="range" className="range-slider" min="0" max="100" value={filters.minMargin}
                                    onChange={e => setFilters({ ...filters, minMargin: Number(e.target.value) })} />
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Max Saturation: {filters.maxSaturation}%</label>
                                <input type="range" className="range-slider" min="0" max="100" value={filters.maxSaturation}
                                    onChange={e => setFilters({ ...filters, maxSaturation: Number(e.target.value) })} />
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Min Grade</label>
                                <select className="select-field" value={filters.minGrade} onChange={e => setFilters({ ...filters, minGrade: e.target.value })}>
                                    {['A', 'B', 'C', 'D', 'F'].map(g => <option key={g}>{g}</option>)}
                                </select>
                            </div>

                            <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}
                                onClick={() => setFilters({ niche: 'All Niches', region: 'All Regions', minMargin: 0, minGrade: 'F', maxSaturation: 100 })}>
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
                                        <div className="fpc-grade" style={{
                                            background: `${getGradeColor(product.grade)}22`,
                                            color: getGradeColor(product.grade),
                                            border: `1px solid ${getGradeColor(product.grade)}44`
                                        }}>
                                            {product.grade}
                                        </div>
                                    </div>
                                    <h4 className="fpc-name">{product.name}</h4>
                                    <div className="fpc-category">{product.category}</div>
                                    <div className="fpc-stats">
                                        <div className="fpc-stat">
                                            <span className="fpc-stat-label">Margin</span>
                                            <span className="fpc-stat-value" style={{ color: '#10b981' }}>{product.profitMargin}%</span>
                                        </div>
                                        <div className="fpc-stat">
                                            <span className="fpc-stat-label">Trend</span>
                                            <span className="fpc-stat-value" style={{ color: '#8b5cf6' }}>{product.trendVelocity}</span>
                                        </div>
                                        <div className="fpc-stat">
                                            <span className="fpc-stat-label">Sat.</span>
                                            <span className="fpc-stat-value" style={{ color: product.marketSaturation > 60 ? '#ef4444' : '#06b6d4' }}>{product.marketSaturation}%</span>
                                        </div>
                                    </div>
                                    <div className="fpc-prices">
                                        <span className="fpc-cost">${Number(product.price).toFixed(2)}</span>
                                        <ArrowRight size={10} />
                                        <span className="fpc-sell">${Number(product.sellPrice).toFixed(2)}</span>
                                    </div>
                                    <div className="fpc-footer">
                                        <span className={`fpc-trend ${product.trend}`}>
                                            {product.trend === 'rising' ? '↑' : product.trend === 'declining' ? '↓' : '→'} {product.trend}
                                        </span>
                                        <span className="fpc-orders">{product.orders.toLocaleString()} orders</span>
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
