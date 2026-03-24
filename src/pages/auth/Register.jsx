import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, HardHat } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import s from "../../components/auth/form.module.css";

export default function Register() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  return (
    <AuthLayout>
      <div className={s.container}>
        <div className={s.header}>
          <span className={s.eyebrow}>Get started — it's free</span>
          <h1 className={s.title}>
            Join
            <br />
            SkilledProz
          </h1>
          <p className={s.subtitle}>How will you use the platform?</p>
        </div>

        <div className={s.roleGrid}>
          <button
            type="button"
            className={`${s.roleCard} ${selected === "HIRER" ? s.roleCardActive : ""}`}
            onClick={() => setSelected("HIRER")}
          >
            <div className={s.roleIcon}>
              <Briefcase size={20} />
            </div>
            <div className={s.roleTitle}>I'm a Hirer</div>
            <div className={s.roleDesc}>
              Find and book skilled professionals for any job.
            </div>
          </button>
          <button
            type="button"
            className={`${s.roleCard} ${selected === "WORKER" ? s.roleCardActive : ""}`}
            onClick={() => setSelected("WORKER")}
          >
            <div className={s.roleIcon}>
              <HardHat size={20} />
            </div>
            <div className={s.roleTitle}>I'm a Worker</div>
            <div className={s.roleDesc}>
              Offer your skills and get booked by clients.
            </div>
          </button>
        </div>

        <button
          className={`${s.btn} ${s.btnPrimary}`}
          disabled={!selected}
          onClick={() =>
            navigate(
              selected === "HIRER" ? "/register/hirer" : "/register/worker",
            )
          }
        >
          Continue as{" "}
          {selected === "HIRER"
            ? "Hirer"
            : selected === "WORKER"
              ? "Worker"
              : "…"}
        </button>

        <p className={s.footer}>
          Already have an account?{" "}
          <Link to="/login" className={s.link}>
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
