import { getUserData, saveUserData, type UserData } from "./moneyData";

export async function fetchFromMongo(userName: string, userId: string): Promise<UserData | null> {
  try {
    const res = await fetch(`/api/finance/${userId}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    saveUserData(userName, { ...data, pin: undefined });
    return data as UserData;
  } catch {
    return null;
  }
}

export async function pushToMongo(userName: string, userId: string, data: UserData): Promise<void> {
  try {
    await fetch(`/api/finance/${userId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...data, userName }),
    });
  } catch {}
}

export function saveAndSync(userName: string, data: UserData): void {
  saveUserData(userName, data);
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";
  if (userId) pushToMongo(userName, userId, data).catch(() => {});
}
