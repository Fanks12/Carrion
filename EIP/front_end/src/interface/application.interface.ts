export interface Application {
  id: string;
  title: string;
  company: string;
  status:
    | "PENDING"
    | "REJECTED_BY_COMPANY"
    | "INTERVIEW_SCHEDULED"
    | "OFFER_RECEIVED"
    | "OFFER_ACCEPTED";
  location?: string;
  salary?: number;
  contractType?: string;
  interviewDate?: string;
  imageUrl?: string;
  isSelected: boolean;
  createdAt: string;
  userId?: string;
}
