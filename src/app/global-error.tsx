"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Root Layout GlobalError]:", error);
  }, [error]);

  const handleHardReset = () => {
    try {
      if (typeof window !== "undefined" && window.indexedDB) {
        indexedDB.deleteDatabase("RuralTelemedDB");
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error("Failed to clear storage:", e);
    }
    window.location.href = "/";
  };

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", backgroundColor: "#f8fafc", padding: "20px" }}>
        <div
          style={{
            maxWidth: "600px",
            margin: "40px auto",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            border: "1px solid #fecaca",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              !
            </div>
            <div>
              <h2 style={{ margin: 0, color: "#111827", fontSize: "18px" }}>
                गंभीर त्रुटि आई (Application Error)
              </h2>
              <p style={{ margin: "2px 0 0 0", color: "#6b7280", fontSize: "12px" }}>
                Root layout failed to render
              </p>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fee2e2",
              borderRadius: "8px",
              padding: "12px",
              fontFamily: "monospace",
              fontSize: "13px",
              color: "#991b1b",
              wordBreak: "break-all",
              marginBottom: "16px",
            }}
          >
            {error.message || "An unknown root error occurred."}
          </div>

          {error.digest && (
            <p style={{ fontSize: "11px", color: "#6b7280", fontFamily: "monospace", margin: "0 0 16px 0" }}>
              Digest ID: {error.digest}
            </p>
          )}

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                backgroundColor: "#059669",
                color: "#ffffff",
                border: "none",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              पुनः प्रयास करें (Try Again)
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                backgroundColor: "#1f2937",
                color: "#ffffff",
                border: "none",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              होम पेज (Go Home)
            </button>
            <button
              type="button"
              onClick={handleHardReset}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                border: "1px solid #fca5a5",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              कैश रीसेट (Reset Storage)
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
