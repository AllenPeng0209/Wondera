export function Topbar() {
  return (
    <header className="topbar">
      <div className="search-wrap">
        <span role="img" aria-label="search">
          🔍
        </span>
        <input className="search-input" placeholder="搜尋角色、場景或心情" />
      </div>
      <div className="topbar-actions">
        <div className="pill">感應上升中</div>
        <div className="pill pill-accent">新劇本</div>
        <button className="primary-button">解鎖 Premium</button>
      </div>
    </header>
  );
}
