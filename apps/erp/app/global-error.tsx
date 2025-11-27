"use client";

// Global error boundary - required to be a client component
// but must be kept extremely simple to avoid prerendering issues
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Something went wrong!
          </h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              cursor: "pointer",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
