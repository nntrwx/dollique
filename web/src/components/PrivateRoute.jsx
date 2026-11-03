import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { selectAuthReady, selectCurrentUser } from '../store/authSlice';

function PrivateRoute() {
  const user = useSelector(selectCurrentUser);
  const ready = useSelector(selectAuthReady);
  const location = useLocation();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

export default PrivateRoute;
