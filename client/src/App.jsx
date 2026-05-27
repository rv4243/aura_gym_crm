import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  SignedIn, SignedOut, useAuth, UserButton,
} from '@clerk/clerk-react';
import { setTokenGetter } from './api/axios.js';
import Sidebar       from './components/Sidebar.jsx';
import LoginPage     from './pages/LoginPage.jsx';
import Dashboard     from './pages/Dashboard.jsx';
import Members       from './pages/Members.jsx';
import MemberProfile from './pages/MemberProfile.jsx';
import Plans         from './pages/Plans.jsx';
import Payments      from './pages/Payments.jsx';
import Attendance    from './pages/Attendance.jsx';
import Expenses      from './pages/Expenses.jsx';
import Trainers      from './pages/Trainers.jsx';
import TrainerProfile from './pages/TrainerProfile.jsx';

// Injects Clerk's getToken into the Axios interceptor once auth is ready
function TokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenGetter(getToken);
    return () => setTokenGetter(null);
  }, [getToken]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* If signed out → show login page */}
      <SignedOut>
        <LoginPage />
      </SignedOut>

      {/* If signed in → full CRM */}
      <SignedIn>
        <TokenBridge />
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            {/* User account button fixed top-right */}
            <div style={{
              position: 'fixed', top: 16, right: 24, zIndex: 200,
            }}>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: {
                      width: 36, height: 36,
                      border: '2px solid rgba(200,169,110,0.4)',
                      borderRadius: '50%',
                    },
                  },
                }}
              />
            </div>

            <Routes>
              <Route path="/"                element={<Dashboard />} />
              <Route path="/members"         element={<Members />} />
              <Route path="/members/:id"     element={<MemberProfile />} />
              <Route path="/plans"           element={<Plans />} />
              <Route path="/payments"        element={<Payments />} />
               <Route path="/attendance"      element={<Attendance />} />
              <Route path="/expenses"        element={<Expenses />} />
              <Route path="/trainers"        element={<Trainers />} />
              <Route path="/trainers/:id"    element={<TrainerProfile />} />
            </Routes>
          </main>
        </div>
      </SignedIn>
    </BrowserRouter>
  );
}
