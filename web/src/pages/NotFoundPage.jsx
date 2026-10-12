import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="page page--center">
      <h1 className="page__title">404</h1>
      <p className="page__lead">This page got lost somewhere in the toy box.</p>
      <Link to="/" className="button button--primary">Back to the feed</Link>
    </section>
  );
}

export default NotFoundPage;
