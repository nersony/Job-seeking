const Jobseeker = require('../models/jobseekerModel');
const User = require('../models/userModel');

// @desc    Get all jobseekers
// @route   GET /api/jobseekers
// @access  Public
exports.getJobseekers = async (req, res) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Filter by service category if provided
    if (req.query.serviceCategory) {
      queryObj.serviceCategory = req.query.serviceCategory;
    }

    let query = Jobseeker.find(queryObj).populate({
      path: 'user',
      select: 'name email phone'
    });

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-rating');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Execute query
    const jobseekers = await query;

    res.json({
      success: true,
      count: jobseekers.length,
      jobseekers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single jobseeker
// @route   GET /api/jobseekers/:id
// @access  Public
exports.getJobseekerById = async (req, res) => {
  try {
    const jobseeker = await Jobseeker.findById(req.params.id).populate({
      path: 'user',
      select: 'name email phone'
    });

    if (jobseeker) {
      res.json({
        success: true,
        jobseeker
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Jobseeker not found'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update jobseeker certification
// @route   PUT /api/jobseekers/certifications
// @access  Private/Jobseeker
exports.updateCertification = async (req, res) => {
  try {
    const jobseeker = await Jobseeker.findOne({ user: req.user._id });

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }

    const { name, issuer, dateObtained, expiryDate, documentUrl } = req.body;

    if (!name || !issuer || !dateObtained || !documentUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required certification details'
      });
    }

    const certification = {
      name,
      issuer,
      dateObtained,
      expiryDate,
      documentUrl,
      isVerified: false // Admin will verify later
    };

    jobseeker.certifications.push(certification);
    await jobseeker.save();

    res.json({
      success: true,
      certification,
      message: 'Certification added successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Admin verifies jobseeker certification
// @route   PUT /api/jobseekers/:id/certifications/:certId/verify
// @access  Private/Admin
exports.verifyCertification = async (req, res) => {
  try {
    const jobseeker = await Jobseeker.findById(req.params.id);

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }

    const certification = jobseeker.certifications.id(req.params.certId);

    if (!certification) {
      return res.status(404).json({
        success: false,
        message: 'Certification not found'
      });
    }

    certification.isVerified = true;
    await jobseeker.save();

    res.json({
      success: true,
      message: 'Certification verified successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update Calendly link
// @route   PUT /api/jobseekers/calendly
// @access  Private/Jobseeker
exports.updateCalendlyLink = async (req, res) => {
  try {
    const { calendlyLink } = req.body;

    if (!calendlyLink) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a Calendly link'
      });
    }

    const jobseeker = await Jobseeker.findOne({ user: req.user._id });

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }

    jobseeker.calendlyLink = calendlyLink;
    await jobseeker.save();

    res.json({
      success: true,
      message: 'Calendly link updated successfully',
      calendlyLink
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};