import { useParams } from "wouter";

export default function JobDetail() {
  const params = useParams() as { id?: string };
  const jobId = params?.id;

  if (!jobId) {
    return (
      <div style={{ padding: "40px", backgroundColor: "#fff", minHeight: "100vh" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "20px" }}>
          Error: No Job ID
        </h1>
        <p style={{ fontSize: "16px", color: "#666" }}>
          Could not find job ID in URL.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", backgroundColor: "#fff", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "20px" }}>
        Job Card #{jobId}
      </h1>
      <p style={{ fontSize: "16px", color: "#666", marginBottom: "10px" }}>
        If you can see this text, the component is rendering correctly.
      </p>
      <p style={{ fontSize: "14px", color: "#999" }}>
        This is a minimal test component to verify rendering works.
      </p>
    </div>
  );
}
