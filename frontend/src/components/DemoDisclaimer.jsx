import React from 'react';

export const DemoDisclaimer = ({ customText }) => {
  return (
    <div className="disclaimer-banner">
      <div style={{ color: '#E67E22', fontWeight: 'bold', fontSize: '1rem', lineHeight: 1 }}>⚠</div>
      <div>
        <strong style={{ color: '#9A3412' }}>Demonstration Prototype Notice (SIH26036):</strong>{' '}
        {customText || 
          "Actual permissible limits and verification fees are indicative demonstration values and must be configured according to applicable instrument, accuracy class, test parameter, jurisdiction, and effective date. Does not claim official statutory government deployment."
        }
      </div>
    </div>
  );
};
