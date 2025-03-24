import React, { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../contexts/AuthContext';

// Make sure to replace with your publishable key
const stripePromise = loadStripe('pk_test_51R4nPcLwnl1mBFE3WEZfPZUJwb1e9KBhiexi4KXA9gCRpCTxEvv5tg4xuHYRlVAUDyYxWU5sINC7WTgOLOIVX5uM00cei0MIl1');

const StripeCheckout = ({ bookingId, buttonText = 'Proceed to Payment' }) => {
  const [loading, setLoading] = useState(false);
  const { API } = useAuth();

  const handleCheckout = async () => {
    try {
      setLoading(true);
      
      const response = await API.post('/stripe/create-checkout-session', {
        bookingId
      });
      
      const stripe = await stripePromise;
      
      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: response.data.id,
      });
      
      if (result.error) {
        console.error(result.error.message);
        // Handle error here
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      // Handle error here
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="primary" 
      onClick={handleCheckout}
      disabled={loading}
      className="w-100"
    >
      {loading ? (
        <>
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
            className="me-2"
          />
          Processing...
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
};

export default StripeCheckout;