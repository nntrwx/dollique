import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { selectAuthReady, selectCurrentUser } from '../store/authSlice';

// Pages for guests only (sign in, sign up). A signed-in user is sent back to the page
// that asked them to sign in, or to the feed. This also does the redirect right after login.
function GuestRoute() {
  const user = useSelector(selectCurrentUser);
  const ready = useSelector(selectAuthReady);
  const location = useLocation();

  if (!ready) return null;
  if (user) return <Navigate to={location.state?.from || '/'} replace />;
  return <Outlet />;
}

export default GuestRoute;
