import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Auto-redirects to the admin dashboard (or any target) with ?preview=true
 * so no login is needed. Just visit /preview.
 */
export default function Preview() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const target = params.get('page') || '/admin';

  useEffect(() => {
    navigate(`${target}?preview=true`, { replace: true });
  }, [navigate, target]);

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Loading preview…
    </div>
  );
}
