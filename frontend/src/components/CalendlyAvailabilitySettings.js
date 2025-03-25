// frontend/src/components/CalendlyAvailabilitySettings.js
import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Spinner, ListGroup, Badge, Table, Row, Col } from 'react-bootstrap';
import { FaCalendarAlt, FaSync, FaExternalLinkAlt, FaCheck, FaInfoCircle } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const CalendlyAvailabilitySettings = () => {
    const [loading, setLoading] = useState(true);
    const [weeklyAvailability, setWeeklyAvailability] = useState(null);
    const [scheduleName, setScheduleName] = useState('');
    const [jobseekerName, setJobseekerName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const { API } = useAuth();

    useEffect(() => {
        fetchCalendlyAvailability();
    }, []);

    const fetchCalendlyAvailability = async () => {
        try {
            setLoading(true);
            const response = await API.get('/calendly/weekly-availability');
            setWeeklyAvailability(response.data.availability);
            setScheduleName(response.data.scheduleName || 'Availability Schedule');
            setJobseekerName(response.data.jobseekerName || '');
            setError('');
        } catch (error) {
            console.error('Error fetching Calendly availability:', error);
            setError(
                error.response && error.response.data.message
                    ? error.response.data.message
                    : 'Failed to load Calendly availability data'
            );
        } finally {
            setLoading(false);
        }
    };

    const refreshCalendlyToken = async () => {
        try {
            setRefreshing(true);
            await API.post('/calendly/auth/refresh');
            await fetchCalendlyAvailability();
            setSuccess('Calendly connection refreshed successfully');
        } catch (error) {
            console.error('Error refreshing Calendly token:', error);
            setError(
                error.response && error.response.data.message
                    ? error.response.data.message
                    : 'Failed to refresh Calendly connection'
            );
        } finally {
            setRefreshing(false);
        }
    };

    // Format time slots for display
    const renderTimeRanges = (timeSlots) => {
        if (!timeSlots || timeSlots.length === 0) {
            return <Badge bg="secondary">Not Available</Badge>;
        }

        return (
            <div className="time-ranges">
                {timeSlots.map((slot, index) => (
                    <Badge key={index} bg="primary" className="me-2 mb-2">
                        {slot.startTime} - {slot.endTime}
                    </Badge>
                ))}
            </div>
        );
    };

    // Capitalize first letter of each word
    const capitalizeDay = (day) => {
        return day.charAt(0).toUpperCase() + day.slice(1);
    };

    return (
        <Card className="mb-4">
            <Card.Header className="bg-primary text-white">
                <div className="d-flex align-items-center">
                    <FaCalendarAlt className="me-2" />
                    <h4 className="mb-0">
                        {jobseekerName ? `${jobseekerName}'s Availability` : 'Calendly Availability'}
                    </h4>
                </div>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <div className="mb-4">
                    <p>
                        Your availability is managed through your Calendly account.
                        Any changes made in Calendly will automatically sync to your profile here.
                    </p>

                    <Button
                        variant="primary"
                        onClick={() => window.open('https://calendly.com/event_types', '_blank')}
                        className="me-2"
                    >
                        <FaExternalLinkAlt className="me-2" />
                        Edit Availability in Calendly
                    </Button>

                    <Button
                        variant="outline-primary"
                        onClick={refreshCalendlyToken}
                        disabled={refreshing}
                    >
                        <FaSync className={`me-2 ${refreshing ? 'fa-spin' : ''}`} />
                        Refresh Connection
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center my-4">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2">Loading your Calendly availability...</p>
                    </div>
                ) : weeklyAvailability ? (
                    <div className="weekly-availability">
                        <h5>{scheduleName}</h5>
                        <Table bordered responsive>
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    <th>Available Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(weeklyAvailability).map(([day, timeSlots]) => (
                                    <tr key={day}>
                                        <td className="fw-bold">{capitalizeDay(day)}</td>
                                        <td>{renderTimeRanges(timeSlots)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                ) : (
                    <Alert variant="info">
                        <Alert.Heading>
                            <FaInfoCircle className="me-2" />
                            No Calendly Data Available
                        </Alert.Heading>
                        <p>
                            Either your Calendly account is not connected, or we couldn't fetch your availability data.
                            Please try refreshing the connection or reconnect your Calendly account.
                        </p>
                    </Alert>
                )}
            </Card.Body>
        </Card>
    );
};

export default CalendlyAvailabilitySettings;