/**
 * This is a placeholder for your API base URL.
 * In a real application, this would come from an environment variable.
 * Example: 'https://api.sssubzzzero.com'
 */
const API_BASE_URL = '/api';

/**
 * A generic function to handle API requests.
 * @param endpoint The API endpoint to call (e.g., 'subscriptions')
 * @param options The options for the fetch call (method, body, etc.)
 */
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

// --- Functions for specific API calls ---

export async function getSubscriptions() {
  // To use a real API, you would uncomment this line:
  // return apiFetch('subscriptions');

  // For now, we return mock data to simulate the API call.
  console.log('API: Fetching subscriptions (mock data)');
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
  return [
    { id: 'sub_1', name: 'Netflix', amount: 15.99, nextBillDate: '2025-08-01' },
    { id: 'sub_2', name: 'Spotify', amount: 9.99, nextBillDate: '2025-08-15' },
    { id: 'sub_3', name: 'Cloud Server', amount: 5.0, nextBillDate: '2025-08-20' },
  ];
}

export async function getUserSettings() {
  // To use a real API, you would uncomment this line:
  // return apiFetch('settings');

  // For now, return mock data.
  console.log('API: Fetching settings (mock data)');
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    theme: 'dark',
    emailNotifications: {
      newBills: true,
      upcomingPayments: true,
    },
  };
}

// You can add more functions here for POST, PUT, DELETE requests.
// export async function cancelSubscription(subscriptionId: string) {
//   return apiFetch(`subscriptions/${subscriptionId}`, { method: 'DELETE' });
// }
