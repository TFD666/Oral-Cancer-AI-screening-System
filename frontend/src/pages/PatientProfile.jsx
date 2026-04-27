import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function PatientProfile() {
  const { id } = useParams();
  const [state, setState] = useState({
    loading: true,
    error: "",
    patient: null,
    history: [],
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await apiFetch(`/patients/${id}`);

        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: "",
          patient: payload.patient,
          history: payload.history ?? [],
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: error.message,
        }));
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="workspace">
      <div className="workspace-inner">
        {state.error ? <div className="message error">{state.error}</div> : null}
        {state.loading ? <div className="empty-panel">Loading patient profile...</div> : null}

        {state.patient ? (
          <>
            <div className="workspace-hero">
              <div>
                <h1>{state.patient.name}</h1>
                <p>
                  {state.patient.age} years old • {state.patient.gender}
                </p>
                <p>
                  {state.patient.medical_history?.trim()
                    ? state.patient.medical_history
                    : "No medical history recorded yet."}
                </p>
              </div>
              <Link className="button" to="/scan">
                New scan for this patient
              </Link>
            </div>

            <div className="list-panel">
              <h3>Scan history</h3>
              {state.history.length === 0 ? (
                <div className="empty-panel">No scans recorded for this patient yet.</div>
              ) : null}
              {state.history.map((item) => (
                <div className="placeholder-row" key={item.id}>
                  <div>
                    <strong>{item.prediction}</strong>
                    <div>{new Date(item.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="row-actions">
                    <span>{Math.round(item.confidence * 100)}% model confidence</span>
                    <span>{item.risk_level}</span>
                    <Link className="text-link" to={`/report/${item.id}`}>
                      View report
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
