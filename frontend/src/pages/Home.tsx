import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  BookOpen,
  Users,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="container stack" style={{ marginTop: "2rem" }}>
      <section
        className="card card-pad"
        style={{
          display: "grid",
          gap: "1.5rem",
          maxWidth: 1000,
        }}
      >
        <div className="stack" style={{ gap: ".75rem" }}>
          <h1 style={{ fontSize: "2.2rem" }}>
            eLibrary – уеб базирана библиотечна система
          </h1>

          <p style={{ fontSize: "1.05rem" }}>
            Система за публичен достъп до библиотечен каталог,
            заемане на книги чрез абонамент и административно управление.
          </p>
        </div>

        <div className="row row-wrap">
          <Link to="/catalog" className="btn btn-primary">
            Разгледай каталога
          </Link>

          {!user && (
            <>
              <Link to="/login" className="btn">
                Вход
              </Link>
              <Link to="/register" className="btn">
                Регистрация
              </Link>
            </>
          )}

          {user && (
            <Link to="/profile" className="btn">
              Моят профил
            </Link>
          )}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          maxWidth: 1000,
        }}
      >
        <Feature
          icon={<BookOpen size={32} />}
          title="Публичен каталог"
          text="Всеки потребител може свободно да разглежда наличните книги."
        />

        <Feature
          icon={<Users size={32} />}
          title="Заемане на книги"
          text="Регистрираните потребители могат да заемат книги чрез активен абонамент."
        />

        <Feature
          icon={<CreditCard size={32} />}
          title="Абонаментни планове"
          text="Гъвкави абонаментни планове с одобрение от администратор."
        />

        <Feature
          icon={<ShieldCheck size={32} />}
          title="Административен контрол"
          text="Управление на книги, потребители и абонаменти от администратор."
        />
      </section>
    </main>
  );
}


function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="card card-pad stack">
      <div style={{ color: "var(--primary)" }}>{icon}</div>
      <div style={{ fontWeight: 800 }}>{title}</div>
      <div className="small">{text}</div>
    </div>
  );
}
