import React, { useState, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';

// Lazy-load Stripe only when needed (avoids blocking initial page render)
let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);
  }
  return stripePromise;
}

export const StripePreloadContext = React.createContext<{ preload: () => void }>({
  preload: () => {},
});

const StripeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stripe, setStripe] = useState<ReturnType<typeof loadStripe> | null>(null);

  const preload = useCallback(() => {
    if (!stripe) setStripe(getStripe());
  }, [stripe]);

  const value = useMemo(() => ({ preload }), [preload]);

  return (
    <StripePreloadContext.Provider value={value}>
      <Elements stripe={stripe}>
        {children}
      </Elements>
    </StripePreloadContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <StripeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/:taskSlug" element={<TaskDetail />} />
        </Routes>
      </BrowserRouter>
    </StripeProvider>
  );
};

export default App;
