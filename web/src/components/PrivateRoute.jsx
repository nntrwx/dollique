import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { selectAuthReady, selectCurrentUser } from '../store/authSlice';

// Pages for signed-in users only (new post, edit post). A guest is sent to sign in
// and comes back here afterwards.
function PrivateRoute() {
  const user = useSelector(selectCurrentUser);
  const ready = useSelector(selectAuthReady);
  const location = useLocation();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

export default PrivateRoute;
