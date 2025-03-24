const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/bookingModel');

exports.createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate('jobseeker', 'serviceCategory')
      .populate('endUser', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: booking.endUser.email,
      client_reference_id: booking._id.toString(),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${booking.jobseeker.serviceCategory.charAt(0).toUpperCase() + booking.jobseeker.serviceCategory.slice(1).replace('_', ' ')} Service`,
              description: `Booking on ${new Date(booking.startTime).toLocaleDateString()} from ${new Date(booking.startTime).toLocaleTimeString()} to ${new Date(booking.endTime).toLocaleTimeString()}`
            },
            unit_amount: Math.round(booking.totalAmount * 100), // Stripe expects amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/bookings/${booking._id}?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/bookings/${booking._id}?canceled=true`,
    });

    res.json({
      success: true,
      id: session.id
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session'
    });
  }
};

exports.webhookHandler = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Update booking status to paid
      if (session.client_reference_id) {
        await Booking.findByIdAndUpdate(session.client_reference_id, {
          paymentStatus: 'paid',
          status: 'confirmed'
        });
        console.log(`Payment for booking ${session.client_reference_id} completed!`);
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
};