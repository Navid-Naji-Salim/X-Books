import brandLogo from "../assets/x-books-logo.png";

export const AppLoadingScreen = () => (
  <div
    aria-busy="true"
    aria-label="Preparing your books workspace"
    className="app-loading-screen"
    role="status"
  >
    <div className="app-loading-content">
      <img
        alt=""
        aria-hidden="true"
        className="app-loading-logo"
        draggable={false}
        src={brandLogo}
      />
      <p>Preparing your books workspace...</p>
    </div>
  </div>
);
