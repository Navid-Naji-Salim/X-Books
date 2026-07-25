import brandLogo from "../assets/x-books-logo.png";

export const AppLoadingScreen = () => (
  <div
    aria-busy="true"
    aria-label="Preparing your books workspace"
    className="app-loading-screen"
    role="status"
  >
    <div className="app-loading-content">
      <span aria-hidden="true" className="app-loading-logo">
        <img className="app-loading-logo-mark" draggable={false} src={brandLogo} />
        <img className="app-loading-logo-bookmark" draggable={false} src={brandLogo} />
      </span>
      <p>Preparing your books workspace...</p>
    </div>
  </div>
);
