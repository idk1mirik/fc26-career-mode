const API = "http://127.0.0.1:8000/api";

export async function getLeagues() {

  const res = await fetch(
    `${API}/leagues/`
  );

  return res.json();
}

export async function getClub(id: number) {

  const res = await fetch(
    `${API}/clubs/${id}/`
  );

  return res.json();
}