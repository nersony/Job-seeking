// CalendlyEmbed.js
import React, { useEffect } from 'react';
import { InlineWidget, useCalendlyEventListener } from 'react-calendly';

const CalendlyEmbed = ({ calendlyUrl, bookingData, onEventScheduled }) => {
  // Listen for Calendly events
  useCalendlyEventListener({
    onEventScheduled: (e) => {
      console.log("Calendly event scheduled:", e.data);
      if (onEventScheduled) {
        onEventScheduled(e);
      }
    }
  });

  return (
    <div className="calendly-container" style={{ height: '650px' }}>
      <InlineWidget 
        url={calendlyUrl}
        prefill={{
          name: bookingData?.endUser?.name,
          email: bookingData?.endUser?.email,
          customAnswers: {
            a1: `Booking Reference: ${bookingData?._id}`
          }
        }}
        styles={{
          height: '100%'
        }}
      />
    </div>
  );
};

export default CalendlyEmbed;