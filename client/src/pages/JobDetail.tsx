export default function JobDetail({ id }: { id: string }) {
  return (
    <div style={{ padding: "40px", backgroundColor: "#fff", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "20px" }}>
        Job Card #{id}
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
