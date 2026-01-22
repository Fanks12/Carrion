import { ApplicationStatus } from "@/enum/application-status.enum";

export interface JobApply {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: number;
  status: ApplicationStatus;
  contractType: string;
  interviewDate?: string;
  isSelected?: boolean;
  imageUrl?: string;
  createdAt: string;
}
