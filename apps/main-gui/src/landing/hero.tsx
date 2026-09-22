import heroPlaceholder from "./hero-placeholder.png";
import "./hero.css";

export function Hero() {
  return (
    <section className="shell hero">
      <div className="hero__text">
        <h1 className="hero__title">Gamification Concept</h1>
        <p className="hero__copy">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="#more-details">
            More details
          </a>
          <a className="button button--ghost" href="#view-demo">
            View demo
          </a>
        </div>
      </div>

      <div className="hero__art">
        <img
          className="hero__image"
          src={heroPlaceholder}
          alt="Players climbing levels on a phone screen"
          width={393}
          height={397}
        />
      </div>
    </section>
  );
}
