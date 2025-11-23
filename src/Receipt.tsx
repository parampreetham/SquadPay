import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";
import type { Participant } from "./types";
import html2canvas from "html2canvas";

export function Receipt() {
  const { tournamentId, id } = useParams();
  const navigate = useNavigate();

  const [p, setP] = useState<Participant | null>(null);
  const [tournamentName, setTournamentName] = useState<string>("Tournament");
  const [loading, setLoading] = useState(true);

  // Listen to participant changes (live)
  useEffect(() => {
    if (!db || !tournamentId || !id) return;

    const ref = doc(db, "tournaments", tournamentId, "participants", id);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setP({
            id: snap.id,
            name: data.name ?? "",
            teamName: data.teamName ?? "",
            contact: data.contact ?? "",
            amountDue: data.amountDue ?? 0,
            amountPaid: data.amountPaid ?? 0,
            status: data.status ?? "pending",
            createdAt: data.createdAt ?? null,
            paymentRef: data.paymentRef ?? null,      // 👈 important
            photoUrl: data.photoUrl ?? null,          // (optional)
            receiptUrl: data.receiptUrl ?? null,      // (optional)
          });

        } else {
          setP(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [tournamentId, id]);

  // Get tournament name
  useEffect(() => {
    if (!db || !tournamentId) return;

    const tRef = doc(db, "tournaments", tournamentId);
    const unsub = onSnapshot(tRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setTournamentName(data.name ?? "Tournament");
      }
    });

    return () => unsub();
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading receipt…</div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
        <div className="text-sm text-red-300 mb-4">Receipt not found.</div>
        <button
          onClick={() => navigate("/")}
          className="rounded-full border border-slate-700 px-4 py-1.5 text-xs text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300 transition"
        >
          ← Back to dashboard
        </button>
      </div>
    );
  }

  const remaining = p.amountDue - p.amountPaid;

  // Derive date + simple receipt id
  const issuedAtRaw =
    p.createdAt && (p.createdAt as any).toDate
      ? (p.createdAt as any).toDate()
      : new Date();

  const issuedAt = new Date(issuedAtRaw);
  const formattedDate = issuedAt.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const receiptId = `RCT-${p.id.slice(-6).toUpperCase()}`;

  const statusColor =
    p.status === "paid"
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : p.status === "partial"
        ? "bg-amber-100 text-amber-700 border-amber-300"
        : "bg-rose-100 text-rose-700 border-rose-300";

  const statusLabel =
    p.status === "paid"
      ? "PAID"
      : p.status === "partial"
        ? "PARTIAL"
        : "PENDING";

  const handleShareImage = async () => {
    const el = document.getElementById("receipt-print");
    if (!el) return;

    try {
      // Take screenshot of the receipt card
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2, // better quality
      });

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png", 0.95)
      );
      if (!blob) {
        alert("Could not create image.");
        return;
      }

      const file = new File([blob], "squadpay-receipt.png", {
        type: "image/png",
      });

      const text = `SquadPay receipt for ${p?.name}${p?.teamName ? ` (${p.teamName})` : ""
        } – ${tournamentName}`;

      // If browser supports sharing files (Android Chrome, etc.)
      if (
        (navigator as any).canShare &&
        (navigator as any).canShare({ files: [file] })
      ) {
        await (navigator as any).share({
          files: [file],
          title: "SquadPay Receipt",
          text,
        });
      } else {
        // Fallback: download the image, user shares manually in WhatsApp
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "squadpay-receipt.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("Receipt image downloaded. Share it via WhatsApp from your gallery/files.");
      }
    } catch (err) {
      console.error("Share image failed:", err);
      alert("Could not share the receipt image.");
    }
  };


  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center py-8">
      <div className="w-full max-w-3xl mx-4">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="no-print mb-4 inline-flex items-center gap-1 text-xs rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300 transition"
        >
          ← Back to dashboard
        </button>

        {/* Receipt card */}
        <div
          id="receipt-print"
          className="bg-white text-slate-900 rounded-2xl shadow-2xl p-8 md:p-10"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-1">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-lime-300 flex items-center justify-center text-slate-950 text-sm font-bold">
                  SP
                </div>
                <div>
                  <div className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    SquadPay
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Cricket Tournament Collections
                  </div>
                </div>
              </div>

              <h1 className="text-xl font-semibold tracking-tight mt-2">
                Payment Receipt
              </h1>
              <p className="text-sm text-slate-600">
                {tournamentName}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              <div
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusColor}`}
              >
                {statusLabel}
              </div>
              <div className="text-xs text-slate-600">
                <div>
                  <span className="font-semibold">Receipt #:</span>{" "}
                  <span className="font-mono">{receiptId}</span>
                </div>
                {p.paymentRef && (
                  <div className="mt-2 text-xs text-slate-600">
                    Payment Ref:&nbsp;
                    <span className="font-mono text-slate-900">{p.paymentRef}</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold">Date:</span>{" "}
                  {formattedDate}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 mb-6" />

          {/* Player / team info */}
          <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-[0.16em]">
                Participant
              </div>
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-xs text-slate-600">
                Team: <span className="font-medium">{p.teamName || "-"}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-[0.16em]">
                Contact
              </div>
              <div className="text-sm">
                {p.contact || <span className="text-slate-500">Not provided</span>}
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-[0.16em] mb-2">
              Payment Summary
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-600">Fee</td>
                    <td className="py-2.5 px-4 text-right font-medium">
                      ₹{p.amountDue}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-slate-600">Paid</td>
                    <td className="py-2.5 px-4 text-right font-medium text-emerald-600">
                      ₹{p.amountPaid}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-600">
                      Remaining
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-amber-600">
                      ₹{remaining}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer note + actions */}
          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-[11px] text-slate-500">
              This is a system-generated receipt for tournament fee tracking
              using SquadPay. For any corrections, please contact the
              tournament organizer.
            </div>

            <div className="no-print flex gap-2 self-start md:self-auto">
              <button
                onClick={handleShareImage}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-500 hover:text-slate-900 transition"
              >
                Share as Image
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-500 hover:text-slate-900 transition"
              >
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
