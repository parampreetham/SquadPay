import type { Timestamp } from "firebase/firestore";

export type PaymentStatus = "pending" | "partial" | "paid";

export interface Tournament {
  id: string; // Firestore document id
  name: string;
  createdAt?: Timestamp | null;
}

export interface Participant {
  id: string;
  name: string;
  teamName?: string | null;
  contact?: string | null;
  amountDue: number;
  amountPaid: number;
  status: PaymentStatus;
  createdAt: any;
  photoUrl?: string | null;
  receiptUrl?: string | null;
  paymentRef?: string | null; // 👈 add this
}
