import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function Report() {
  const { id } = useParams();
  const [state, setState] = useState({
    loading: true,
    error: "",
    report: null,
    patientName: "",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const report = await apiFetch(`/report/${id}`);
        let patientName = "";

        try {
          const patientPayload = await apiFetch(`/patients/${report.patient_id}`);
          patientName = patientPayload.patient?.name ?? "";
        } catch (_error) {
          patientName = "";
        }

        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: "",
          report,
          patientName,
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

  const report = state.report;

  return (
    <div className="workspace">
      <div className="workspace-inner">
        {state.error ? <div className="message error">{state.error}</div> : null}
        {state.loading ? <div className="empty-panel">Loading report...</div> : null}

        {report ? (
          <>
            <div className="workspace-hero">
              <div>
                <h1>Prediction report</h1>
                <p>
                  {state.patientName ? (
                    <>
                      Patient:{" "}
                      <Link className="text-link" to={`/patients/${report.patient_id}`}>
                        {state.patientName}
                      </Link>
                    </>
                  ) : (
                    <>Patient ID: {report.patient_id}</>
                  )}
                </p>
              </div>
            </div>

            <div className="panel-grid">
              <div className="panel">
                <h3>Prediction</h3>
                <strong>{report.prediction}</strong>
                <span>{Math.round(report.confidence * 100)}% model confidence</span>
              </div>
              <div className="panel">
                <h3>Risk level</h3>
                <strong>{report.risk_level}</strong>
                <span>{report.recommendation}</span>
              </div>
              <div className="panel">
                <h3>Timestamp</h3>
                <strong>{new Date(report.timestamp).toLocaleDateString()}</strong>
                <span>{new Date(report.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="image-grid">
              <div className="list-panel">
                <h3>Original image</h3>
                <img className="report-image" src={report.image_url} alt="Original oral scan" />
              </div>
              <div className="list-panel">
                <h3>Grad-CAM heatmap</h3>
                <img className="report-image" src={report.heatmap_url} alt="Grad-CAM heatmap" />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
