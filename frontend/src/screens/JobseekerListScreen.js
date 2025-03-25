import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Tag, 
  Star, 
  DollarSign
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const JobseekerListScreen = () => {
  const [jobseekers, setJobseekers] = useState([]);
  const [filteredJobseekers, setFilteredJobseekers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    serviceCategory: '',
    startDateTime: '',
    endDateTime: '',
    minRating: '',
    maxRate: ''
  });

  const { API } = useAuth();

  // Initial fetch of jobseekers
  useEffect(() => {
    const fetchJobseekers = async () => {
      try {
        setLoading(true);
        const res = await API.get('/jobseekers');
        setJobseekers(res.data.jobseekers);
        setFilteredJobseekers(res.data.jobseekers);
        setError('');
      } catch (error) {
        console.error('Error fetching jobseekers:', error);
        setError(
          error.response && error.response.data.message
            ? error.response.data.message
            : 'Failed to load service providers'
        );
        setJobseekers([]);
        setFilteredJobseekers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobseekers();
  }, [API]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      
      // Prepare query parameters
      const queryParams = new URLSearchParams();
      
      // Add service category filter
      if (filters.serviceCategory) {
        queryParams.append('serviceCategory', filters.serviceCategory);
      }
      
      // Add minimum rating filter
      if (filters.minRating) {
        queryParams.append('minRating', filters.minRating);
      }
      
      // Add max rate filter
      if (filters.maxRate) {
        queryParams.append('maxRate', filters.maxRate);
      }
      
      // Add time availability filters if both start and end times are provided
      if (filters.startDateTime && filters.endDateTime) {
        queryParams.append('startTime', filters.startDateTime);
        queryParams.append('endTime', filters.endDateTime);
      }
      
      // Fetch filtered jobseekers
      const res = await API.get(`/calendly/available-jobseekers?${queryParams.toString()}`);
      
      setFilteredJobseekers(res.data.jobseekers || []);
      setError('');
    } catch (error) {
      console.error('Error applying filters:', error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : 'Failed to apply filters'
      );
      setFilteredJobseekers([]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = async () => {
    // Reset filters
    setFilters({
      serviceCategory: '',
      startDateTime: '',
      endDateTime: '',
      minRating: '',
      maxRate: ''
    });

    // Refetch all jobseekers
    try {
      setLoading(true);
      const res = await API.get('/jobseekers');
      setJobseekers(res.data.jobseekers);
      setFilteredJobseekers(res.data.jobseekers);
      setError('');
    } catch (error) {
      console.error('Error clearing filters:', error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : 'Failed to load service providers'
      );
      setJobseekers([]);
      setFilteredJobseekers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <div className="mb-3">
                <label className="form-label">
                  <Tag className="me-2" /> Service Type
                </label>
                <select 
                  className="form-select"
                  name="serviceCategory"
                  value={filters.serviceCategory}
                  onChange={handleFilterChange}
                >
                  <option value="">All Services</option>
                  <option value="caregiving">Caregiving</option>
                  <option value="counselling">Counselling</option>
                  <option value="infant_care">Infant Care</option>
                </select>
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label className="form-label">
                  <Calendar className="me-2" /> Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  name="startDateTime"
                  value={filters.startDateTime || ''}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label className="form-label">
                  <Calendar className="me-2" /> End Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  name="endDateTime"
                  value={filters.endDateTime || ''}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-4">
              <div className="mb-3">
                <label className="form-label">
                  <Star className="me-2" /> Minimum Rating
                </label>
                <select 
                  className="form-select"
                  name="minRating"
                  value={filters.minRating}
                  onChange={handleFilterChange}
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                </select>
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label className="form-label">
                  <DollarSign className="me-2" /> Maximum Hourly Rate
                </label>
                <input
                  type="number"
                  className="form-control"
                  name="maxRate"
                  value={filters.maxRate}
                  onChange={handleFilterChange}
                  placeholder="Max hourly rate"
                  min="0"
                />
              </div>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <div className="d-flex gap-2 w-100">
                <button 
                  className="btn btn-primary flex-grow-1" 
                  onClick={applyFilters}
                  disabled={loading}
                >
                  <Search className="me-2" /> {loading ? 'Searching...' : 'Apply Filters'}
                </button>
                <button 
                  className="btn btn-outline-secondary" 
                  onClick={clearFilters}
                  disabled={loading}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>
          {filters.serviceCategory
            ? `${filters.serviceCategory.replace('_', ' ').charAt(0).toUpperCase() + filters.serviceCategory.replace('_', ' ').slice(1)} Services`
            : 'All Services'}
        </h2>
        <p className="text-muted">{filteredJobseekers.length} providers found</p>
      </div>

      {loading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : filteredJobseekers.length === 0 ? (
        <div className="alert alert-info">
          No service providers found matching your criteria
        </div>
      ) : (
        <div className="row">
          {filteredJobseekers.map((jobseeker) => (
            <div key={jobseeker._id} className="col-md-6 col-lg-4 mb-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{jobseeker.user.name}</h5>
                  <p className="card-text">
                    <span className="badge bg-primary me-2">
                      {jobseeker.serviceCategory.replace('_', ' ')}
                    </span>
                    <span className="text-muted">
                      ${jobseeker.hourlyRate}/hr | {jobseeker.rating} ★
                    </span>
                  </p>
                  <button className="btn btn-outline-primary w-100">
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobseekerListScreen;