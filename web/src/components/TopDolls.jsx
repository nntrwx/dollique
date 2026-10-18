import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/client';
import { getUserDoll } from '../api/dolls';
import { ShelfLine } from './Doodle';
import DollFigure from './DollFigure';
import Pixel from './Pixel';

const PLACES = ['i', 'ii', 'iii'];

// Three members with the best rating standing on a shelf (first place in the middle).
function TopDolls() {
  const [top, setTop] = useState([]);

  useEffect(() => {
    let ignore = false;
    api.get('/users')
      .then(async (users) => {
        const best = [...users].sort((a, b) => b.rating - a.rating).slice(0, 3);
        const withDolls = await Promise.all(best.map(async (user, index) => {
          const doll = await getUserDoll(user.id);
          return { ...user, place: PLACES[index], layers: doll?.layers || [] };
        }));
        if (!ignore) setTop(withDolls);
      })
      .catch(() => setTop([]));
    return () => {
      ignore = true;
    };
  }, []);

  if (top.length === 0) return null;
  // second, first, third
  const shelf = [top[1], top[0], top[2]].filter(Boolean);

  return (
    <div className="panel topdolls">
      <span className="panel__corner"><Pixel name="bunny" color="#ecc3cf" size={22} /></span>
      <div className="mono">by rating</div>
      <h3>Top dolls</h3>
      <div className="shelf">
        {shelf.map((user) => (
          <Link key={user.id} to={`/users/${user.id}`} className={`shelf__doll${user.place === 'i' ? ' shelf__doll--first' : ''}`} title={user.login}>
            {user.layers.length > 0 && <DollFigure layers={user.layers} label={`${user.login}'s doll`} />}
          </Link>
        ))}
      </div>
      <ShelfLine />
      <div className="podium">
        {shelf.map((user) => (
          <Link key={user.id} to={`/users/${user.id}`}>
            <em>{user.place}</em>
            {user.login}
            <small>{`✦ ${user.rating}`}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default TopDolls;
