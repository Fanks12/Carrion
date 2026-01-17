export const passwordRegEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

export const emailRegEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const orgRolesWithRights = ["OWNER", "TEACHER"];

export interface HttpResponse {
  statusCode: number;
  message: string;
}
