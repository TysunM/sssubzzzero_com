import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';

const OrderPreview = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlanDetails = async () => {
      try {
        // In a real application, you would fetch the selected plan details
        // from your backend or from local storage if passed from pricing page.
        // For this example, we'll hardcode the Premium plan details.
        const premiumPlan = {
          id: 'premium_plan_id',
          name: 'Premium Plan',
          price: 4.99,
          features: [
            'Unlimited subscription tracking',
            'Payment due date alerts',
            'Automated cancellation assistance',
            'Advanced analytics and insights',
            'Priority support',
          ],
        };
        setPlan(premiumPlan);
      } catch (err) {
        setError('Failed to load plan details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanDetails();
  }, []);

  const handleCheckout = async () => {
    if (!plan) return;

    try {
      const response = await api.post('/billing/create-checkout-session', {
        plan_id: plan.id,
        price: plan.price, // Pass price to backend for verification
      });

      if (response.url) {
        window.location.href = response.url; // Redirect to Stripe Checkout
      } else {
        setError('Failed to get checkout URL from backend.');
      }
    } catch (err) {
      setError('Error initiating checkout.');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading order details...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Order Preview</h1>
        {plan && (
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">{plan.name}</h2>
            <p className="text-gray-600 text-xl mb-4">Price: ${plan.price.toFixed(2)}/month</p>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Features:</h3>
            <ul className="list-disc list-inside text-gray-600">
              {plan.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={handleCheckout}
            className="inline-block bg-green-600 text-white px-8 py-4 rounded-md text-lg font-semibold hover:bg-green-700 transition-colors duration-300"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderPreview;


