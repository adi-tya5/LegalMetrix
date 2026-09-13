import React from 'react';

export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '6px', style = {} }) => (
  <div
    className="skeleton-pulse"
    style={{
      width,
      height,
      borderRadius,
      backgroundColor: '#E2E8F0',
      ...style,
    }}
  />
);

export const SkeletonCard = ({ rows = 3 }) => (
  <div className="card" style={{ padding: '1.25rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <SkeletonBox width="40%" height="24px" />
      <SkeletonBox width="20%" height="24px" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonBox
        key={i}
        width={i % 2 === 0 ? '90%' : '75%'}
        height="16px"
        style={{ marginBottom: '0.75rem' }}
      />
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 4, cols = 5 }) => (
  <div className="card" style={{ padding: '1.25rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
      <SkeletonBox width="30%" height="22px" />
      <SkeletonBox width="15%" height="22px" />
    </div>
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonBox key={i} width={`${100 / cols}%`} height="16px" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} style={{ display: 'flex', gap: '1rem', marginBottom: '0.85rem' }}>
        {Array.from({ length: cols }).map((_, c) => (
          <SkeletonBox key={c} width={`${100 / cols}%`} height="20px" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonStats = () => (
  <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="stat-card">
        <SkeletonBox width="44px" height="44px" borderRadius="10px" />
        <div style={{ flex: 1 }}>
          <SkeletonBox width="40%" height="28px" style={{ marginBottom: '0.35rem' }} />
          <SkeletonBox width="70%" height="14px" />
        </div>
      </div>
    ))}
  </div>
);
