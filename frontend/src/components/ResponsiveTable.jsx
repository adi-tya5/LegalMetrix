import React from 'react';

/**
 * ResponsiveTable renders a clean table on desktop and converts each row into
 * an easy-to-read mobile card on mobile screens (< 768px).
 * Ensures ZERO horizontal overflow on mobile devices.
 */
export const ResponsiveTable = ({
  columns = [],
  data = [],
  keyExtractor = (item, idx) => item.id || idx,
  renderMobileCard = null,
  emptyMessage = 'No records found.',
  className = ''
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="responsive-table-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`responsive-table-wrapper ${className}`}>
      {/* 1. Desktop Table (Hidden on mobile via CSS) */}
      <div className="desktop-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.thStyle || {}}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rIdx) => (
              <tr key={keyExtractor(row, rIdx)}>
                {columns.map((col) => (
                  <td key={col.key} style={col.tdStyle || {}}>
                    {col.render ? col.render(row, rIdx) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2. Mobile Cards (Hidden on desktop via CSS) */}
      <div className="mobile-cards-container">
        {data.map((row, rIdx) => {
          const key = keyExtractor(row, rIdx);

          if (renderMobileCard) {
            return (
              <div key={key} className="mobile-row-card">
                {renderMobileCard(row, rIdx)}
              </div>
            );
          }

          // Default automatic mobile card renderer
          return (
            <div key={key} className="mobile-row-card">
              {columns.map((col, cIdx) => {
                const isFirst = cIdx === 0;
                const isLast = cIdx === columns.length - 1;
                const content = col.render ? col.render(row, rIdx) : (row[col.key] ?? '—');

                if (isLast && col.isAction) {
                  return (
                    <div key={col.key} className="mobile-card-actions">
                      {content}
                    </div>
                  );
                }

                if (isFirst) {
                  return (
                    <div key={col.key} className="mobile-card-header">
                      <span className="mobile-card-title-label">{col.label}</span>
                      <div className="mobile-card-title-val">{content}</div>
                    </div>
                  );
                }

                return (
                  <div key={col.key} className="mobile-card-row">
                    <span className="mobile-card-label">{col.label}</span>
                    <span className="mobile-card-val">{content}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
