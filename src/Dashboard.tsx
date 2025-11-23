import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { db } from "./firebase";
import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    getDocs,
    writeBatch,
    deleteDoc,
} from "firebase/firestore";
import type { Participant, PaymentStatus, Tournament } from "./types";
import ConfirmModal from "./components/ConfirmModal";

function computeStatus(amountFee: number, amountPaid: number): PaymentStatus {
    if (amountPaid <= 0) return "pending";
    if (amountPaid >= amountFee) return "paid";
    return "partial";
}

export function Dashboard() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loadingTournaments, setLoadingTournaments] = useState(true);
    const [loadingParticipants, setLoadingParticipants] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [deleteParticipant, setDeleteParticipant] = useState<Participant | null>(null);
    const [deleteTournament, setDeleteTournament] = useState<Tournament | null>(null);


    // Tournament form
    const [newTournamentName, setNewTournamentName] = useState("");

    // Participant form
    const [name, setName] = useState("");
    const [teamName, setTeamName] = useState("");
    const [contact, setContact] = useState("");
    const [fee, setFee] = useState("");

    // Edit Paid modal
    const [editingParticipantPaid, setEditingParticipantPaid] = useState<Participant | null>(null);
    const [editPaidValue, setEditPaidValue] = useState<string>("");

    // Edit Participant modal
    const [editingParticipantDetails, setEditingParticipantDetails] = useState<Participant | null>(null);
    const [editName, setEditName] = useState("");
    const [editTeamName, setEditTeamName] = useState("");
    const [editContact, setEditContact] = useState("");
    const [editFee, setEditFee] = useState("");

    // Edit Tournament modal
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
    const [editTournamentName, setEditTournamentName] = useState("");

    // 🔹 Load tournaments
    useEffect(() => {
        if (!db) {
            setError("Firestore is not initialized. Check Firebase config.");
            setLoadingTournaments(false);
            return;
        }

        const tournamentsRef = collection(db, "tournaments");
        const q = query(tournamentsRef, orderBy("createdAt", "asc"));

        const unsub = onSnapshot(
            q,
            (snapshot) => {
                const list: Tournament[] = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data() as any;
                    return {
                        id: docSnap.id,
                        name: data.name ?? "(Unnamed tournament)",
                        createdAt: data.createdAt ?? null,
                    };
                });
                setTournaments(list);
                setLoadingTournaments(false);

                // Auto-select first tournament if nothing selected
                if (!selectedTournamentId && list.length > 0) {
                    setSelectedTournamentId(list[0].id);
                }
                // If the selected one was deleted, clear it
                if (selectedTournamentId && !list.find((t) => t.id === selectedTournamentId)) {
                    setSelectedTournamentId(list[0]?.id ?? null);
                }
            },
            (err) => {
                console.error("Error loading tournaments:", err);
                setError("Failed to load tournaments.");
                setLoadingTournaments(false);
            }
        );

        return () => unsub();
    }, [selectedTournamentId]);

    // 🔹 Load participants for selected tournament
    useEffect(() => {
        if (!db || !selectedTournamentId) {
            setParticipants([]);
            setLoadingParticipants(false);
            return;
        }

        setLoadingParticipants(true);

        const participantsRef = collection(
            db,
            "tournaments",
            selectedTournamentId,
            "participants"
        );
        const q = query(participantsRef, orderBy("createdAt", "asc"));

        const unsub = onSnapshot(
            q,
            (snapshot) => {
                const list: Participant[] = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data() as any;
                    return {
                        id: docSnap.id,
                        name: data.name ?? "",
                        teamName: data.teamName ?? "",
                        contact: data.contact ?? "",
                        amountDue: data.amountDue ?? 0,
                        amountPaid: data.amountPaid ?? 0,
                        status: data.status ?? "pending",
                        createdAt: data.createdAt ?? null,
                    };
                });
                setParticipants(list);
                setLoadingParticipants(false);
            },
            (err) => {
                console.error("Error loading participants:", err);
                setError("Failed to load participants.");
                setLoadingParticipants(false);
            }
        );

        return () => unsub();
    }, [selectedTournamentId]);

    const totals = useMemo(() => {
        let totalFee = 0;
        let totalPaid = 0;
        participants.forEach((p) => {
            totalFee += p.amountDue;
            totalPaid += p.amountPaid;
        });
        const totalRemaining = totalFee - totalPaid;
        return { totalFee, totalPaid, totalRemaining };
    }, [participants]);

    // 🔹 Create tournament
    const handleCreateTournament = async (e: FormEvent) => {
        e.preventDefault();
        if (!db) return;

        const name = newTournamentName.trim();
        if (!name) {
            alert("Tournament name is required");
            return;
        }

        try {
            const ref = await addDoc(collection(db, "tournaments"), {
                name,
                createdAt: serverTimestamp(),
            });
            setNewTournamentName("");
            setSelectedTournamentId(ref.id);
        } catch (err) {
            console.error("Error creating tournament:", err);
            alert("Failed to create tournament.");
        }
    };

    // 🔹 Rename tournament
    const openRenameTournament = (t: Tournament) => {
        setEditingTournament(t);
        setEditTournamentName(t.name);
    };

    const handleSaveTournamentName = async () => {
        if (!db || !editingTournament) return;

        const newName = editTournamentName.trim();
        if (!newName) {
            alert("Tournament name cannot be empty");
            return;
        }

        try {
            const ref = doc(db, "tournaments", editingTournament.id);
            await updateDoc(ref, { name: newName });
            setEditingTournament(null);
        } catch (err) {
            console.error("Error renaming tournament:", err);
            alert("Failed to rename tournament.");
        }
    };

    // 🔹 Delete tournament (+ participants)
    const handleDeleteTournament = async (t: Tournament) => {
        if (!db) return;

        try {
            const tRef = doc(db, "tournaments", t.id);
            const participantsRef = collection(tRef, "participants");
            const snap = await getDocs(participantsRef);
            const batch = writeBatch(db);

            snap.forEach((pDoc) => batch.delete(pDoc.ref));
            batch.delete(tRef);

            await batch.commit();

            if (selectedTournamentId === t.id) {
                setSelectedTournamentId(null);
            }
        } catch (err) {
            console.error("Error deleting tournament:", err);
            alert("Failed to delete tournament.");
        }
    };


    // 🔹 Add participant
    const handleAddParticipant = async (e: FormEvent) => {
        e.preventDefault();
        if (!db) return;
        if (!selectedTournamentId) {
            alert("Please create or select a tournament first.");
            return;
        }

        const feeValue = Number(fee);
        if (!name.trim()) {
            alert("Name is required");
            return;
        }
        if (Number.isNaN(feeValue) || feeValue <= 0) {
            alert("Fee must be a positive number");
            return;
        }

        const status = computeStatus(feeValue, 0);

        try {
            const participantsRef = collection(
                db,
                "tournaments",
                selectedTournamentId,
                "participants"
            );

            await addDoc(participantsRef, {
                name: name.trim(),
                teamName: teamName.trim() || null,
                contact: contact.trim() || null,
                amountDue: feeValue,
                amountPaid: 0,
                status,
                createdAt: serverTimestamp(),
            });

            setName("");
            setTeamName("");
            setContact("");
            setFee("");
        } catch (err) {
            console.error("Error adding participant:", err);
            alert("Failed to add participant.");
        }
    };

    // 🔹 Update Paid
    const handleUpdatePaid = async (p: Participant, newPaid: number) => {
        if (!db || !selectedTournamentId) return;
        if (Number.isNaN(newPaid) || newPaid < 0) {
            alert("Paid amount must be 0 or a positive number");
            return;
        }

        const status = computeStatus(p.amountDue, newPaid);

        try {
            const ref = doc(
                db,
                "tournaments",
                selectedTournamentId,
                "participants",
                p.id
            );
            await updateDoc(ref, {
                amountPaid: newPaid,
                status,
            });
        } catch (err) {
            console.error("Error updating paid amount:", err);
            alert("Failed to update paid amount.");
        }
    };

    // 🔹 Edit Paid modal open/close
    const handleEditPaidClick = (p: Participant) => {
        setEditingParticipantPaid(p);
        setEditPaidValue(p.amountPaid.toString());
    };

    const handleConfirmEditPaid = async () => {
        if (!editingParticipantPaid) return;
        const value = Number(editPaidValue);
        if (Number.isNaN(value) || value < 0) {
            alert("Paid amount must be 0 or a positive number");
            return;
        }
        await handleUpdatePaid(editingParticipantPaid, value);
        setEditingParticipantPaid(null);
    };

    const handleCancelEditPaid = () => {
        setEditingParticipantPaid(null);
    };

    // 🔹 Edit Participant details
    const openEditParticipantDetails = (p: Participant) => {
        setEditingParticipantDetails(p);
        setEditName(p.name);
        setEditTeamName(p.teamName ?? "");
        setEditContact(p.contact ?? "");
        setEditFee(p.amountDue.toString());
    };

    const handleSaveParticipantDetails = async () => {
        if (!db || !selectedTournamentId || !editingParticipantDetails) return;

        const newFee = Number(editFee);
        if (!editName.trim()) {
            alert("Name is required");
            return;
        }
        if (Number.isNaN(newFee) || newFee <= 0) {
            alert("Fee must be a positive number");
            return;
        }

        const status = computeStatus(newFee, editingParticipantDetails.amountPaid);

        try {
            const ref = doc(
                db,
                "tournaments",
                selectedTournamentId,
                "participants",
                editingParticipantDetails.id
            );
            await updateDoc(ref, {
                name: editName.trim(),
                teamName: editTeamName.trim() || null,
                contact: editContact.trim() || null,
                amountDue: newFee,
                status,
            });
            setEditingParticipantDetails(null);
        } catch (err) {
            console.error("Error updating participant:", err);
            alert("Failed to update participant.");
        }
    };

    const handleCancelParticipantDetails = () => {
        setEditingParticipantDetails(null);
    };

    // 🔹 Delete participant
    const handleDeleteParticipant = async (p: Participant) => {
        if (!db || !selectedTournamentId) return;

        try {
            const ref = doc(
                db,
                "tournaments",
                selectedTournamentId,
                "participants",
                p.id
            );
            await deleteDoc(ref);
        } catch (err) {
            console.error("Error deleting participant:", err);
            alert("Failed to delete participant.");
        }
    };


    // 🔹 WhatsApp reminder
    const sendReminder = (p: Participant) => {
        const remaining = p.amountDue - p.amountPaid;
        const phone = p.contact?.replace(/\D/g, "");

        if (!phone || phone.length < 10) {
            alert("Invalid phone number");
            return;
        }

        const lineName = p.teamName
            ? `${p.name} (${p.teamName})`
            : p.name;

        const message = encodeURIComponent(
            `Hello ${lineName},\n\nYour cricket tournament fee is pending.\n` +
            `Fee: ₹${p.amountDue}\n` +
            `Paid: ₹${p.amountPaid}\n` +
            `Remaining: ₹${remaining}\n\n` +
            `Please clear the payment at the earliest.\n\n- SquadPay`
        );

        window.open(`https://wa.me/91${phone}?text=${message}`, "_blank");
    };

    const selectedTournament = tournaments.find(
        (t) => t.id === selectedTournamentId
    );

    if (loadingTournaments) {
        return (
            <div className="text-sm text-slate-400">Loading tournaments…</div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tournament selector + stats */}
            <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Tournaments
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {tournaments.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setSelectedTournamentId(t.id)}
                                className={
                                    "rounded-full border px-3 py-1 text-xs transition " +
                                    (t.id === selectedTournamentId
                                        ? "border-emerald-400/80 bg-emerald-500/10 text-emerald-200"
                                        : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-emerald-400/50 hover:text-emerald-200")
                                }
                            >
                                {t.name}
                            </button>
                        ))}

                        {tournaments.length === 0 && (
                            <span className="text-xs text-slate-500">
                                No tournaments yet. Create one below.
                            </span>
                        )}
                    </div>

                    <form
                        onSubmit={handleCreateTournament}
                        className="mt-1 flex flex-wrap items-center gap-2"
                    >
                        <input
                            className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/50"
                            value={newTournamentName}
                            onChange={(e) => setNewTournamentName(e.target.value)}
                            placeholder="New tournament name"
                        />
                        <button
                            type="submit"
                            className="rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-950 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/40"
                        >
                            Add Tournament
                        </button>
                    </form>

                    {selectedTournament && (
                        <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
                            <span className="text-slate-400">
                                Selected:{" "}
                                <span className="text-emerald-300">
                                    {selectedTournament.name}
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() => openRenameTournament(selectedTournament)}
                                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300 transition"
                            >
                                Rename
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteTournament(selectedTournament)}
                                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-rose-300 hover:border-rose-400/70 hover:text-rose-200 transition"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-3 min-w-[260px] text-xs sm:text-sm">
                    <StatCard
                        label="Total Fee"
                        value={`₹${totals.totalFee}`}
                        accent="border-slate-700 text-slate-200"
                    />
                    <StatCard
                        label="Collected"
                        value={`₹${totals.totalPaid}`}
                        accent="border-emerald-500/60 text-emerald-300"
                    />
                    <StatCard
                        label="Remaining"
                        value={`₹${totals.totalRemaining}`}
                        accent="border-amber-400/70 text-amber-300"
                    />
                </div>
            </section>

            {!selectedTournamentId && (
                <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-lg shadow-black/30">
                    <p className="text-sm text-slate-300">
                        Create your first tournament above, then you can add squads and
                        track payments.
                    </p>
                </section>
            )}

            {selectedTournamentId && (
                <>
                    {/* Add participant */}
                    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-lg shadow-black/30">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <h3 className="text-sm font-semibold text-slate-100">
                                Add Squad / Player
                            </h3>
                            <span className="text-[11px] text-slate-500">
                                Name = player/captain, Team Name optional.
                            </span>
                        </div>

                        <form
                            onSubmit={handleAddParticipant}
                            className="grid gap-3 lg:grid-cols-[2fr,2fr,2fr,1fr,auto]"
                        >
                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                    Name
                                </label>
                                <input
                                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/50"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Player / Captain name"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                    Team Name (optional)
                                </label>
                                <input
                                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/50"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder="Team Warriors / Blue XI"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                    Contact (WhatsApp)
                                </label>
                                <input
                                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/50"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                    placeholder="+91 9XXXXXXXXX"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                    Fee (₹)
                                </label>
                                <input
                                    type="number"
                                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/50"
                                    value={fee}
                                    onChange={(e) => setFee(e.target.value)}
                                    placeholder="1000"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="self-end h-[38px] rounded-xl bg-emerald-500 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/40"
                            >
                                Add
                            </button>
                        </form>
                    </section>

                    {/* Participants table */}
                    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-xl shadow-black/30">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <h3 className="text-sm font-semibold text-slate-100">
                                Participants
                            </h3>
                            <span className="text-[11px] text-slate-500">
                                Click the ✏️ icon to edit Paid.
                            </span>
                        </div>

                        {loadingParticipants ? (
                            <p className="text-xs text-slate-500">Loading squads…</p>
                        ) : participants.length === 0 ? (
                            <p className="text-xs text-slate-500">
                                No squads added yet for this tournament. Use the form above to
                                add your first team or player.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-900/90 text-xs uppercase tracking-[0.16em] text-slate-400">
                                            <th className="py-2 px-2 text-left">Name</th>
                                            <th className="py-2 px-2 text-left">Team</th>
                                            <th className="py-2 px-2 text-left">Contact</th>
                                            <th className="py-2 px-2 text-right">Fee (₹)</th>
                                            <th className="py-2 px-2 text-right">Paid (₹)</th>
                                            <th className="py-2 px-2 text-right">Remaining (₹)</th>
                                            <th className="py-2 px-2 text-center">Status</th>
                                            <th className="py-2 px-2 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {participants.map((p, idx) => {
                                            const remaining = p.amountDue - p.amountPaid;
                                            return (
                                                <tr
                                                    key={p.id}
                                                    className={
                                                        "border-b border-slate-800/60 " +
                                                        (idx % 2 === 0
                                                            ? "bg-slate-900/60"
                                                            : "bg-slate-950/40")
                                                    }
                                                >
                                                    <td className="py-2.5 px-2 text-slate-100">
                                                        {p.name}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-slate-300">
                                                        {p.teamName || "-"}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-slate-400">
                                                        {p.contact || "-"}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right text-slate-200">
                                                        {p.amountDue}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span className="text-slate-200">
                                                                ₹{p.amountPaid}
                                                            </span>
                                                            <button
                                                                className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300 transition"
                                                                type="button"
                                                                onClick={() => handleEditPaidClick(p)}
                                                                title="Edit paid amount"
                                                            >
                                                                ✏️
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right text-slate-200">
                                                        {remaining}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-center">
                                                        <StatusPill status={p.status} />
                                                    </td>
                                                    <td className="py-2.5 px-2 text-center">
                                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                                            <button
                                                                className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-200 hover:border-sky-400/70 hover:text-sky-300 transition"
                                                                onClick={() => openEditParticipantDetails(p)}
                                                            >
                                                                Edit
                                                            </button>
                                                            {p.contact && (
                                                                <button
                                                                    className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300 transition"
                                                                    onClick={() => sendReminder(p)}
                                                                >
                                                                    Reminder
                                                                </button>
                                                            )}
                                                            {p.amountPaid > 0 && selectedTournamentId && (
                                                                <button
                                                                    className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-200 hover:border-squadpay-green/70 hover:text-squadpay-green transition"
                                                                    onClick={() => {
                                                                        const base = import.meta.env.BASE_URL || "/";
                                                                        window.open(
                                                                            `${base}t/${selectedTournamentId}/receipt/${p.id}`,
                                                                            "_blank"
                                                                        );
                                                                    }}
                                                                >
                                                                    Receipt
                                                                </button>
                                                            )}
                                                            <button
                                                                className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-rose-300 hover:border-rose-400/70 hover:text-rose-200 transition"
                                                                onClick={() => setDeleteParticipant(p)}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* Edit Paid modal */}
            {editingParticipantPaid && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-sm mx-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                        <h2 className="text-sm font-semibold text-slate-50 mb-2">
                            Edit Paid Amount
                        </h2>
                        <p className="text-xs text-slate-400 mb-4">
                            {editingParticipantPaid.teamName
                                ? `${editingParticipantPaid.name} (${editingParticipantPaid.teamName})`
                                : editingParticipantPaid.name}
                        </p>

                        <div className="mb-4 space-y-1 text-xs text-slate-400">
                            <div>
                                <span className="font-semibold text-slate-200">Fee:</span>{" "}
                                ₹{editingParticipantPaid.amountDue}
                            </div>
                            <div>
                                <span className="font-semibold text-slate-200">Current Paid:</span>{" "}
                                ₹{editingParticipantPaid.amountPaid}
                            </div>
                        </div>

                        <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400 block mb-1">
                            New Paid Amount (₹)
                        </label>
                        <input
                            type="number"
                            value={editPaidValue}
                            onChange={(e) => setEditPaidValue(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/50 mb-5"
                        />

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleCancelEditPaid}
                                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500 hover:text-slate-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmEditPaid}
                                className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/40"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Participant details modal */}
            {editingParticipantDetails && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md mx-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                        <h2 className="text-sm font-semibold text-slate-50 mb-3">
                            Edit Participant
                        </h2>

                        <div className="grid gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                    Name
                                </label>
                                <input
                                    className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/50"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                    Team Name (optional)
                                </label>
                                <input
                                    className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/50"
                                    value={editTeamName}
                                    onChange={(e) => setEditTeamName(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                    Contact (WhatsApp)
                                </label>
                                <input
                                    className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/50"
                                    value={editContact}
                                    onChange={(e) => setEditContact(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                    Fee (₹)
                                </label>
                                <input
                                    type="number"
                                    className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/50"
                                    value={editFee}
                                    onChange={(e) => setEditFee(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                onClick={handleCancelParticipantDetails}
                                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500 hover:text-slate-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveParticipantDetails}
                                className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/40"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Tournament modal */}
            {editingTournament && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-sm mx-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                        <h2 className="text-sm font-semibold text-slate-50 mb-3">
                            Rename Tournament
                        </h2>
                        <input
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/50 mb-5"
                            value={editTournamentName}
                            onChange={(e) => setEditTournamentName(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setEditingTournament(null)}
                                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500 hover:text-slate-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTournamentName}
                                className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/40"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete participant modal */}
            {deleteParticipant && (
                <ConfirmModal
                    title="Delete Participant?"
                    message={`Are you sure you want to delete:\n${deleteParticipant.name}${deleteParticipant.teamName ? ` (${deleteParticipant.teamName})` : ""
                        }?\n\nThis action cannot be undone.`}
                    confirmText="Delete"
                    onCancel={() => setDeleteParticipant(null)}
                    onConfirm={async () => {
                        await handleDeleteParticipant(deleteParticipant);
                        setDeleteParticipant(null);
                    }}
                />
            )}

            {/* Delete tournament modal */}
            {deleteTournament && (
                <ConfirmModal
                    title="Delete Tournament?"
                    message={`Are you sure you want to delete "${deleteTournament.name}"?\n\nAll participants and payment data will be removed permanently.`}
                    confirmText="Delete"
                    onCancel={() => setDeleteTournament(null)}
                    onConfirm={async () => {
                        await handleDeleteTournament(deleteTournament);
                        setDeleteTournament(null);
                    }}
                />
            )}

        </div>
    );
}

function StatCard({
    label,
    value,
    accent,
}: {
    label: string;
    value: string;
    accent?: string;
}) {
    return (
        <div
            className={`rounded-xl border bg-slate-950/60 px-3 py-2.5 shadow-md shadow-black/30 ${accent}`}
        >
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                {label}
            </div>
            <div className="mt-1 text-sm font-semibold">{value}</div>
        </div>
    );
}

function StatusPill({ status }: { status: PaymentStatus }) {
    const base =
        "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-medium";
    if (status === "paid") {
        return (
            <span className={`${base} bg-emerald-500/15 text-emerald-300`}>
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Paid
            </span>
        );
    }
    if (status === "partial") {
        return (
            <span className={`${base} bg-amber-500/15 text-amber-300`}>
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                Partial
            </span>
        );
    }
    return (
        <span className={`${base} bg-rose-500/15 text-rose-300`}>
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-rose-400" />
            Pending
        </span>
    );
}
