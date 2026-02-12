'use client';

import { useState } from 'react';

const PLANS = [
  { 
    id: 'starter', 
    name: 'Starter', 
    price: 49, 
    features: [
      '100 posts/month',
      'Basic analytics',
      'Email support',
      'Standard response time'
    ] 
  },
  { 
    id: 'pro', 
    name: 'Pro', 
    price: 99, 
    popular: true,
    features: [
      '500 posts/month',
      'Advanced analytics',
      'Priority support',
      'Content adaptation engine',
      'Team collaboration (up to 3)'
    ] 
  },
  { 
    id: 'business', 
    name: 'Business', 
    price: 179, 
    features: [
      'Unlimited posts',
      'Custom integrations',
      'Dedicated success manager',
      'SLA guarantees',
      'Unlimited team members'
    ] 
  },
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed');
      }
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      console.error(e);
      alert('Checkout failed: ' + e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
            Choose the plan that fits your needs.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-x-8">
          {PLANS.map((plan) => (
            <div 
              key={plan.id} 
              className={`relative p-8 bg-white dark:bg-gray-800 border rounded-2xl shadow-sm flex flex-col ${
                plan.popular 
                  ? 'border-indigo-600 ring-2 ring-indigo-600 z-10' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                  <span className="inline-flex rounded-full bg-indigo-600 px-4 py-1 text-sm font-semibold text-white shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="mt-4 flex items-baseline text-gray-900 dark:text-white">
                  <span className="text-5xl font-extrabold tracking-tight">${plan.price}</span>
                  <span className="ml-1 text-xl font-semibold text-gray-500 dark:text-gray-400">/month</span>
                </p>
                <ul role="list" className="mt-6 space-y-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex">
                      <svg 
                        className="flex-shrink-0 w-6 h-6 text-indigo-500" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-gray-500 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={!!loading}
                className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-md text-center font-medium ${
                  plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-800'
                } transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? 'Processing...' : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
