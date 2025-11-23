import type { Timestamp } from "firebase/firestore";

export type PaymentStatus = "pending" | "partial" | "paid";

export interface Tournament {
  id: string; // Firestore document id
  name: string;
  createdAt?: Timestamp | null;
}

export interface Participant {
  id: string; // Firestore document id
  name: string;
  teamName?: string;
  contact?: string;
  amountDue: number; //fee
  amountPaid: number;
  status: PaymentStatus;
  createdAt?: Timestamp | null;
}
