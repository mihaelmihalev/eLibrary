import { Link } from "react-router-dom";
import "../styles/home.css";
import { useAuth } from "../auth/useAuth";

export default function Home() {
  const { isAdmin, isAuthenticated } = useAuth();

  return (
    <div className="home">
      <section className="home-hero">
        <h1>eLibrary – уеб базирана библиотечна система</h1>
        <p>
          Платформа за публичен достъп до библиотечен каталог, заемане на книги чрез
          абонамент и административно управление.
        </p>
      </section>

      <section className="home-features container">
        <FeatureCard
          icon="📊"
          title="Статистика"
          text="Обобщение и топ класации: най-заемани, най-високо оценени, с най-много мнения и др.."
          to="/stats"
        />

        <FeatureCard
          icon="📚"
          title="Публичен каталог"
          text="Разглеждане на наличните книги и заемане директно от каталога."
          to="/catalog"
        />

        {!isAdmin && (
          <FeatureCard
            icon="💳"
            title="Абонаментни планове"
            text="Гъвкави абонаментни планове, необходими за заемане на книги."
            to="/subscriptions"
          />
        )}

        {isAdmin ? (
          <FeatureCard
            icon="🛡️"
            title="Административен контрол"
            text="Управление на книги, потребители и плащания от администратор."
            to="/admin/"
          />
        ) : isAuthenticated ? (
          <FeatureCard
            icon="👤"
            title="Профил"
            text="Преглед на профил, активен абонамент и лични действия."
            to="/profile"
          />
        ) : (
          <LoginRegisterCard />
        )}
      </section>
    </div>
  );
}

type FeatureProps = {
  icon: string;
  title: string;
  text: string;
  to: string;
};

function FeatureCard({ icon, title, text, to }: FeatureProps) {
  return (
    <Link to={to} className="feature-card feature-card-link">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </Link>
  );
}

function LoginRegisterCard() {
  return (
    <Link to="/login" className="feature-card feature-card-link">
      <div className="feature-icon">🔐</div>
      <h3>Вход / Регистрация</h3>
      <p>Влез в системата, за да заявиш абонамент и да управляваш профила си.</p>
    </Link>
  );
}
