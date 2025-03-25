// frontend/src/components/AvailabilitySettings.js
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Minus, 
  Save 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AvailabilitySettings = () => {
  const [workingHours, setWorkingHours] = useState({
    monday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
    tuesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
    wednesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
    thursday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
    friday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
    saturday: { isWorking: false, startTime: '00:00', endTime: '00:00' },
    sunday: { isWorking: false, startTime: '00:00', endTime: '00:00' }
  });

  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockedDate, setNewBlockedDate] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { API } = useAuth();

  // Fetch current availability settings
  useEffect(() => {
    const fetchAvailabilitySettings = async () => {
      try {
        // Fetch jobseeker profile to get current working hours
        const profileRes = await API.get('/users/profile');
        const jobseekerProfile = profileRes.data.user.jobseekerProfile;

        if (jobseekerProfile) {
          // Update working hours if available
          if (jobseekerProfile.workingHours) {
            setWorkingHours(jobseekerProfile.workingHours);
          }

          // Update blocked dates if available
          if (jobseekerProfile.blockedDates) {
            setBlockedDates(jobseekerProfile.blockedDates);
          }
        }
      } catch (error) {
        console.error('Error fetching availability settings:', error);
        setError('Failed to load availability settings');
      }
    };

    fetchAvailabilitySettings();
  }, [API]);

  const handleWorkingHoursChange = (day, field, value) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const updateWorkingHours = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await API.put('/availability/working-hours', { workingHours });
      
      setSuccess('Working hours updated successfully');
      // Optionally update local state with server response
      if (res.data.workingHours) {
        setWorkingHours(res.data.workingHours);
      }
    } catch (error) {
      console.error('Error updating working hours:', error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : 'Failed to update working hours'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBlockDateChange = (e) => {
    const { name, value } = e.target;
    setNewBlockedDate(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const blockDates = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await API.post('/availability/block-dates', newBlockedDate);
      
      setBlockedDates(res.data.blockedDates);
      setSuccess('Dates blocked successfully');
      
      // Reset form
      setNewBlockedDate({
        startDate: '',
        endDate: '',
        reason: ''
      });
    } catch (error) {
      console.error('Error blocking dates:', error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : 'Failed to block dates'
      );
    } finally {
      setLoading(false);
    }
  };

  const unblockDate = async (dateId) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await API.delete(`/availability/block-dates/${dateId}`);
      
      setBlockedDates(res.data.blockedDates);
      setSuccess('Blocked dates removed successfully');
    } catch (error) {
      console.error('Error unblocking dates:', error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : 'Failed to remove blocked dates'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Availability Management</h4>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger">
                  {error}
                </div>
              )}
              {success && (
                <div className="alert alert-success">
                  {success}
                </div>
              )}

              <h5 className="mb-3">Working Hours</h5>
              {Object.entries(workingHours).map(([day, settings]) => (
                <div key={day} className="row mb-3 align-items-center">
                  <div className="col-md-3">
                    <div className="form-check form-switch">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id={`${day}-working`}
                        checked={settings.isWorking}
                        onChange={(e) => handleWorkingHoursChange(day, 'isWorking', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor={`${day}-working`}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </label>
                    </div>
                  </div>
                  {settings.isWorking && (
                    <>
                      <div className="col-md-4">
                        <input 
                          type="time" 
                          className="form-control"
                          value={settings.startTime}
                          onChange={(e) => handleWorkingHoursChange(day, 'startTime', e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <input 
                          type="time" 
                          className="form-control"
                          value={settings.endTime}
                          onChange={(e) => handleWorkingHoursChange(day, 'endTime', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              <button 
                className="btn btn-primary mb-4"
                onClick={updateWorkingHours}
                disabled={loading}
              >
                Save Working Hours
              </button>

              <h5 className="mb-3">Block Specific Dates</h5>
              <form onSubmit={blockDates}>
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Start Date</label>
                    <input 
                      type="date" 
                      className="form-control"
                      name="startDate"
                      value={newBlockedDate.startDate}
                      onChange={handleBlockDateChange}
                      required
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">End Date</label>
                    <input 
                      type="date" 
                      className="form-control"
                      name="endDate"
                      value={newBlockedDate.endDate}
                      onChange={handleBlockDateChange}
                      required
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Reason (Optional)</label>
                    <input 
                      type="text" 
                      className="form-control"
                      name="reason"
                      value={newBlockedDate.reason}
                      onChange={handleBlockDateChange}
                      placeholder="Reason for unavailability"
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="btn btn-outline-primary"
                  disabled={loading}
                >
                  Block Dates
                </button>
              </form>

              {blockedDates.length > 0 && (
                <div className="mt-4">
                  <h5>Current Blocked Dates</h5>
                  <div className="list-group">
                    {blockedDates.map((blockedDate) => (
                      <div 
                        key={blockedDate._id} 
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <strong>
                            {new Date(blockedDate.startDate).toLocaleDateString()} 
                            {' - '}
                            {new Date(blockedDate.endDate).toLocaleDateString()}
                          </strong>
                          {blockedDate.reason && (
                            <p className="text-muted mb-0">{blockedDate.reason}</p>
                          )}
                        </div>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => unblockDate(blockedDate._id)}
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilitySettings;