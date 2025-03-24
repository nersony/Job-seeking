// frontend/src/components/SimplifiedCalendar.js
import React, { useState, useEffect } from "react";
import { Card, Row, Col, Button, Alert, Spinner } from "react-bootstrap";
import axios from "axios";

const SimplifiedCalendar = ({ calendlyLink }) => {
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [showTimeSlots, setShowTimeSlots] = useState(false);

  // Fetch calendar data from backend
  const fetchCalendarData = async (date = currentMonth) => {
    try {
      setLoading(true);

      // Use URL encoding for the Calendly link
      if (!calendlyLink) {
        throw new Error("No Calendly link provided");
      }

      // Ensure calendlyLink is a proper URL
      let formattedLink = calendlyLink;
      if (!formattedLink.startsWith("http")) {
        formattedLink = `https://${formattedLink}`;
      }

      const encodedLink = encodeURIComponent(formattedLink);
      const monthStr = date.toISOString().slice(0, 7); // Format: YYYY-MM

      // Get the local timezone for proper time conversion
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Call backend API to get Calendly data with the local timezone
      const response = await axios.get(`/api/calendly/scrape/${encodedLink}`, {
        params: {
          month: monthStr,
          timezone: encodeURIComponent(timezone),
        },
      });

      if (response.data && response.data.success) {
        // Process time slots to ensure they're in local time
        if (response.data.data && response.data.data.dates) {
          response.data.data.dates.forEach((dateObj) => {
            if (dateObj.timeSlots && dateObj.timeSlots.length > 0) {
              // Time slots are already in HH:MM format from the backend
              // They're already converted to the client's timezone
              dateObj.timeSlots.sort(); // Ensure they're sorted
            }
          });
        }

        setCalendarData(response.data.data);
      } else {
        throw new Error("Failed to fetch calendar data");
      }

      setError("");
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      setError(
        "Could not load availability information. Please check the Calendly URL and try again."
      );
    } finally {
      setLoading(false);
    }
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

  // Find matching date (handles different date formats)
  const findMatchingDate = (dateStr) => {
    if (!calendarData || !calendarData.dates) return null;

    // Try exact match first
    let found = calendarData.dates.find((d) => d.date === dateStr);

    if (!found) {
      // Try different format (API sometimes returns dates in different formats)
      // Create date at noon to avoid timezone issues
      const searchDate = new Date(dateStr);
      const searchYear = searchDate.getFullYear();
      const searchMonth = searchDate.getMonth();
      const searchDay = searchDate.getDate();

      found = calendarData.dates.find((d) => {
        const compareDate = new Date(d.date);
        const compareYear = compareDate.getFullYear();
        const compareMonth = compareDate.getMonth();
        const compareDay = compareDate.getDate();

        return (
          compareYear === searchYear &&
          compareMonth === searchMonth &&
          compareDay === searchDay
        );
      });
    }

    return found;
  };

  const handleDateClick = (dateStr, available) => {
    if (!available) return;
    console.log(dateStr);
    // Extract day from the date string (format: YYYY-MM-DD)
    const day = parseInt(dateStr.split("-")[2], 10);

    // Find date object by matching the day (simpler approach)
    const dateObj = calendarData.dates.find((d) => {
      const apiDay = parseInt(d.date.split("-")[2], 10);
      return apiDay === day;
    });

    if (dateObj && dateObj.timeSlots.length > 0) {
      setSelectedDate(dateStr);
      setTimeSlots(dateObj.timeSlots);
      setShowTimeSlots(true);
    }
  };

  // Format time from 24h to 12h
  const formatTime12h = (timeStr) => {
    if (!timeStr) return "";

    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Calendar header with month navigation
  const handleNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };

  const renderCalendarHeader = () => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
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
        <h4 className="mb-0">
          {month} {year}
        </h4>
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
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Create calendar grid
    const calendarDays = [];

    // Add day headers
    const headerRow = (
      <Row key="header" className="text-center">
        {dayNames.map((day) => (
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
      const foundDate = calendarData.dates.find((d) => d.date === dateStr);
      return foundDate && foundDate.available;
    };

    // Get time slots count for a date
    const getTimeSlotsCount = (dateStr) => {
      const foundDate = calendarData.dates.find((d) => d.date === dateStr);
      return foundDate && foundDate.available ? foundDate.timeSlots.length : 0;
    };

    // Create a standardized date string to avoid timezone issues
    const createDateString = (year, month, day) => {
      // Force UTC date creation with noon time to avoid timezone shifts
      const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
      return date.toISOString().split("T")[0];
    };

    // Standardize date strings for comparison
    const standardizeDate = (dateStr) => {
      if (!dateStr) return "";

      // Parse the date string
      const dateParts = dateStr.split("-").map(Number);
      if (dateParts.length !== 3) return dateStr;

      // Create new UTC-based date string
      return createDateString(dateParts[0], dateParts[1] - 1, dateParts[2]);
    };

    // Add days to the current month
    for (let day = 1; day <= lastDayOfMonth; ++day) {
      // Create date with the year and month from currentMonth, and the day counter
      const date = new Date(year, month, day);
      // Add 1 day to fix timezone issue
      const adjustedDate = new Date(date);
      adjustedDate.setDate(adjustedDate.getDate() + 1);

      // Format as YYYY-MM-DD
      const dateStr = adjustedDate.toISOString().split("T")[0];
      const standardDateStr = standardizeDate(dateStr);
      const isToday = date.toDateString() === today.toDateString();
      const isPast =
        date <= today && date.toDateString() !== today.toDateString();
      // Find matching date from the API data
      const dateObj = calendarData.dates.find((d) => {
        return standardizeDate(d.date) === standardDateStr;
      });

      const isAvailable = dateObj ? true : false;
      const timeSlotsCount = dateObj ? dateObj.timeSlots.length : 0;
      cells.push(
        <Col
          key={dateStr}
          className={`border p-2 text-center ${
            isToday ? "bg-success bg-opacity-25" : ""
          } 
                     ${
                       isAvailable && !isPast ? "bg-success bg-opacity-25" : ""
                     }`}
          style={{
            cursor: (isToday || isAvailable) && !isPast ? "pointer" : "default",
            height: "60px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
          onClick={() =>
            handleDateClick(dateStr, (isToday || isAvailable) && !isPast)
          }
        >
          <div className="fw-bold">{day}</div>
          {(isToday || isAvailable) && !isPast && (
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
          const remainingCells = 7 - (cells.length % 7);
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

        calendarDays.push(<Row key={`row-${day}`}>{cells}</Row>);
        cells = [];
      }
    }

    return calendarDays;
  };

  // Time slots display
  const renderTimeSlots = () => {
    if (!showTimeSlots || !selectedDate) return null;

    const formattedDate = new Date(selectedDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
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
          <div style={{ width: "80px" }}></div> {/* Spacer for alignment */}
        </div>

        <div className="time-slots-list">
          <h2 className="fs-5 mb-3">Select a Time</h2>
          <div className="mb-3">Duration: {calendarData.duration} min</div>

          <div
            className="time-slots-grid"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            {timeSlots.map((slot, index) => (
              <div key={index} role="listitem" style={{ margin: "5px" }}>
                <Button
                  variant="outline-primary"
                  className="px-4 py-2 text-center"
                  style={{
                    borderRadius: "4px",
                    pointerEvents: "none", // Make non-clickable
                    opacity: 1, // But keep normal appearance
                    width: "100px",
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
                This is a view-only display. To book an appointment, please use
                the booking button.
              </p>
            </Alert>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && !calendarData) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading availability information...</p>
      </div>
    );
  }

  // Error state
  if (error && !calendarData) {
    return <Alert variant="warning">{error}</Alert>;
  }

  return (
    <div className="simplified-calendar">
      {!showTimeSlots ? (
        <Card>
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">
              {calendarData?.eventName || "Calendly Schedule"}
              {calendarData?.description && (
                <small className="d-block mt-1 fs-6">
                  {calendarData.description}
                </small>
              )}
            </h5>
          </Card.Header>
          <Card.Body>
            <div className="mb-3">
              Duration: {calendarData?.duration || 30} min
            </div>

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
                <strong>Note:</strong> Green dates indicate availability. Click
                on an available date to see time slots.
              </p>
            </Alert>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body>{renderTimeSlots()}</Card.Body>
        </Card>
      )}
    </div>
  );
};

export default SimplifiedCalendar;
