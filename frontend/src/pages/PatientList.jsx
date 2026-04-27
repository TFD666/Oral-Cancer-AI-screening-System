import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function PatientList() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    patients: [],
    history: [],
    query: "",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [patients, history] = await Promise.all([
          apiFetch("/patients"),
          apiFetch("/history"),
        ]);

        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: "",
          patients,
          history,
        }));
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
  }, []);

  const historyByPatient = useMemo(() => {
    const map = new Map();

    for (const record of state.history) {
      const bucket = map.get(record.patient_id) ?? [];
      bucket.push(record);
      map.set(record.patient_id, bucket);
    }

    return map;
  }, [state.history]);

  const filteredPatients = state.patients.filter((patient) =>
    patient.name.toLowerCase().includes(state.query.trim().toLowerCase())
  );

  return (
    <div className="workspace">
      <div className="workspace-inner">
        <div className="workspace-hero">
          <div>
            <h1>Patients</h1>
            <p>
              The patient list is now backed by live doctor-scoped records and
              joined locally with prediction history for quick scan context.
            </p>
          </div>
        </div>

        {state.error ? <div className="message error">{state.error}</div> : null}

        <div className="list-panel">
          <div className="toolbar-row">
            <h3>Patient records</h3>
            <input
              className="search-input"
              value={state.query}
              onChange={(event) =>
                setState((current) => ({ ...current, query: event.target.value }))
              }
              placeholder="Search by patient name"
            />
          </div>

          {state.loading ? <div className="empty-panel">Loading patients...</div> : null}
          {!state.loading && filteredPatients.length === 0 ? (
            <div className="empty-panel">No patients match the current filter.</div>
          ) : null}

          {filteredPatients.map((patient) => {
            const history = historyByPatient.get(patient.id) ?? [];
            const lastScan = history[0];

            return (
              <div className="placeholder-row" key={patient.id}>
                <div>
                  <strong>{patient.name}</strong>
                  <div>
                    {patient.age} years • {patient.gender}
                  </div>
                </div>
                <div className="row-actions">
                  <span>{history.length} scans</span>
                  <span>
                    {lastScan
                      ? new Date(lastScan.timestamp).toLocaleDateString()
                      : "No scans yet"}
                  </span>
                  <Link className="text-link" to={`/patients/${patient.id}`}>
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
