// frontend/src/components/CustomCalendar.js
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';

const CustomCalendar = ({ calendlyLink }) => {
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  
  // Generate consistent availability data based on date
  const getAvailabilityForDate = (date) => {
    // Use the date as a seed for "random" but consistent availability
    const dateNum = new Date(date).getDate();
    const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
    
    // Make weekends less likely to be available, but keep it consistent
    return isWeekend ? (dateNum % 3 === 0) : (dateNum % 5 !== 0);
  };
  
  const fetchCalendarData = async (date = currentMonth) => {
    try {
      setLoading(true);
      
      const year = date.getFullYear();
      const month = date.getMonth();
      const today = new Date();
      
      // Get number of days in month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const dates = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Skip past dates
        if (currentDate < today && currentDate.getDate() !== today.getDate()) {
          dates.push({
            date: dateStr,
            available: false,
            timeSlots: []
          });
          continue;
        }
        
        // Get consistent availability
        const isAvailable = getAvailabilityForDate(currentDate);
        
        if (isAvailable) {
          dates.push({
            date: dateStr,
            available: true,
            timeSlots: generateTimeSlots(30) // 30-minute increments
          });
        } else {
          dates.push({
            date: dateStr,
            available: false,
            timeSlots: []
          });
        }
      }
      
      const mockData = {
        eventName: "30 Minute Meeting",
        duration: 30,
        month: date.toISOString().slice(0, 7),
        dates: dates
      };
      
      setCalendarData(mockData);
      setError('');
    } catch (error) {
      console.error('Error generating calendar data:', error);
      setError('Could not load availability information');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate time slots in 30-minute increments
  const generateTimeSlots = (duration = 30) => {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 23; // 11 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += duration) {
        if (hour === endHour - 1 && minute + duration > 60) continue;
        
        // Format time in 24h format
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    
    return slots;
  };
  
  useEffect(() => {
    if (calendlyLink) {
      fetchCalendarData(currentMonth);
    }
  }, [calendlyLink, currentMonth]);
  
  const handlePrevMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };
  
  const handleNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };
  
  const handleDateClick = (date, available) => {
    if (!available) return;
    
    const dateObj = calendarData.dates.find(d => d.date === date);
    if (dateObj && dateObj.timeSlots.length > 0) {
      setSelectedDate(date);
      setTimeSlots(dateObj.timeSlots);
      setShowTimeSlots(true);
    }
  };
  
  const formatTime12h = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')}`;
  };
  
  // Calendar header with month navigation
  const renderCalendarHeader = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const month = monthNames[currentMonth.getMonth()];
    const year = currentMonth.getFullYear();
    
    return (
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button 
          variant="outline-primary" 
          onClick={handlePrevMonth}
          className="d-flex align-items-center"
          aria-label="Previous month"
        >
          <span>&laquo;</span>
        </Button>
        <h4 className="mb-0">{month} {year}</h4>
        <Button 
          variant="outline-primary" 
          onClick={handleNextMonth}
          className="d-flex align-items-center"
          aria-label="Next month"
        >
          <span>&raquo;</span>
        </Button>
      </div>
    );
  };
  
  // Calendar grid with dates
  const renderCalendarGrid = () => {
    if (!calendarData || !calendarData.dates) {
      return <Alert variant="warning">Calendar data is not available</Alert>;
    }
    
    const today = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    // Get last day of month (28-31)
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    
    // Day names header
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Create calendar grid
    const calendarDays = [];
    
    // Add day headers
    const headerRow = (
      <Row key="header" className="text-center">
        {dayNames.map(day => (
          <Col key={day} className="border p-2 bg-light">
            <strong>{day}</strong>
          </Col>
        ))}
      </Row>
    );
    calendarDays.push(headerRow);
    
    // Prepare date cells
    let cells = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(
        <Col key={`empty-${i}`} className="border p-2 text-muted">
          {new Date(year, month, 0 - (firstDayOfMonth - i - 1)).getDate()}
        </Col>
      );
    }
    
    // Check date availability
    const isDateAvailable = (dateStr) => {
      const foundDate = calendarData.dates.find(d => d.date === dateStr);
      return foundDate && foundDate.available;
    };
    
    // Get time slots count for a date
    const getTimeSlotsCount = (dateStr) => {
      const foundDate = calendarData.dates.find(d => d.date === dateStr);
      return foundDate && foundDate.available ? foundDate.timeSlots.length : 0;
    };
    
    // Add days of the current month
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = date.toDateString() === today.toDateString();
      const isAvailable = isDateAvailable(dateStr);
      const isPast = date < today && date.toDateString() !== today.toDateString();
      const timeSlotsCount = getTimeSlotsCount(dateStr);
      
      cells.push(
        <Col 
          key={dateStr} 
          className={`border p-2 text-center ${isToday ? 'bg-info bg-opacity-25' : ''} 
                     ${isAvailable && !isPast ? 'bg-success bg-opacity-25' : ''}`}
          style={{ 
            cursor: isAvailable && !isPast ? 'pointer' : 'default',
            height: '60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onClick={() => handleDateClick(dateStr, isAvailable && !isPast)}
        >
          <div className="fw-bold">{day}</div>
          {isAvailable && !isPast && (
            <div className="mt-1">
              <small className="badge bg-success">Available</small>
            </div>
          )}
        </Col>
      );
      
      // Start new row every 7 cells
      if ((firstDayOfMonth + day) % 7 === 0 || day === lastDayOfMonth) {
        // If it's the last day and we need to fill remaining cells
        if (day === lastDayOfMonth) {
          const remainingCells = 7 - cells.length % 7;
          if (remainingCells < 7) {
            for (let i = 1; i <= remainingCells; i++) {
              cells.push(
                <Col key={`next-${i}`} className="border p-2 text-muted">
                  {i}
                </Col>
              );
            }
          }
        }
        
        calendarDays.push(
          <Row key={`row-${day}`}>
            {cells}
          </Row>
        );
        cells = [];
      }
    }
    
    return calendarDays;
  };
  
  // Time slots display similar to Calendly's layout
  const renderTimeSlots = () => {
    if (!showTimeSlots || !selectedDate) return null;
    
    const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    
    return (
      <div className="time-slots-container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Button 
            variant="link" 
            onClick={() => setShowTimeSlots(false)}
            className="d-flex align-items-center text-decoration-none"
            aria-label="Go back to calendar view"
          >
            <span className="me-2">&laquo;</span> Back
          </Button>
          <h1 className="mb-0 fs-4">{formattedDate}</h1>
          <div style={{ width: '80px' }}></div> {/* Spacer for alignment */}
        </div>
        
        <div className="time-slots-list">
          <h2 className="fs-5 mb-3">Select a Time</h2>
          <div className="mb-3">Duration: {calendarData.duration} min</div>
          
          <div className="time-slots-grid" 
               style={{ 
                 display: 'flex', 
                 flexWrap: 'wrap', 
                 gap: '10px',
                 justifyContent: 'center'
               }}>
            {timeSlots.map((slot, index) => (
              <div key={index} role="listitem" style={{ margin: '5px' }}>
                <Button
                  variant="outline-primary"
                  className="px-4 py-2 text-center"
                  style={{ 
                    borderRadius: '4px',
                    pointerEvents: 'none', // Make non-clickable
                    opacity: 1, // But keep normal appearance
                    width: '100px'
                  }}
                >
                  {formatTime12h(slot)}
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-4">
            <Alert variant="info">
              <p className="mb-0">
                This is a view-only display. To book an appointment, please complete the booking process first.
              </p>
            </Alert>
          </div>
        </div>
      </div>
    );
  };
  
  // Fix for loading state to avoid blank screen
  if (loading && !calendarData) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading availability information...</p>
      </div>
    );
  }
  
  // Show error only if we have no data
  if (error && !calendarData) {
    return (
      <Alert variant="warning">{error}</Alert>
    );
  }
  
  return (
    <div className="custom-calendar">
      {!showTimeSlots ? (
        <Card>
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">
              {calendarData?.eventName || "30 Minute Meeting"}
            </h5>
          </Card.Header>
          <Card.Body>
            <div className="mb-3">Duration: {calendarData?.duration || 30} min</div>
            
            {renderCalendarHeader()}
            
            <div className="calendar-grid mb-3">
              {loading ? (
                <div className="text-center my-4">
                  <Spinner animation="border" variant="primary" size="sm" />
                  <p>Loading calendar...</p>
                </div>
              ) : (
                renderCalendarGrid()
              )}
            </div>
            
            <Alert variant="info" className="mb-0">
              <p className="mb-0">
                <strong>Note:</strong> Green dates indicate availability. 
                Click on an available date to see time slots.
              </p>
            </Alert>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body>
            {renderTimeSlots()}
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default CustomCalendar;