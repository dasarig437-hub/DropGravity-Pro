import './SkeletonCard.css';

function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <div className="skeleton-pulse skeleton-image" />
            <div className="skeleton-body">
                <div className="skeleton-pulse skeleton-title" />
                <div className="skeleton-pulse skeleton-score" />
                <div className="skeleton-pills">
                    <div className="skeleton-pulse skeleton-pill" />
                    <div className="skeleton-pulse skeleton-pill" />
                    <div className="skeleton-pulse skeleton-pill" />
                    <div className="skeleton-pulse skeleton-pill" />
                </div>
                <div className="skeleton-pulse skeleton-price" />
            </div>
        </div>
    );
}

export default function SkeletonGrid({ count = 6 }) {
    return (
        <div className="skeleton-grid">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
