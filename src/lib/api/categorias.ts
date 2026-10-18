import { apiRequest } from "@/lib/api/client";

export type Categoria = {
  id: string;
  profile_id: string;
  nombre: string;
  color: string | null;
  icono: string;
  cuenta_id: string | null;
  cuenta?: {
    id: string;
    nombre: string;
    saldo?: string | null;
    color?: string | null;
  } | null;
};

export type CategoriaInput = {
  nombre: string;
  color?: string | null;
  icono: string;
  cuenta_id?: string | null;
};

export function listCategorias(token: string, profileId: string) {
  return apiRequest<{ categorias: Categoria[] }>("/api/v1/categorias", {
    token,
    profileId,
  });
}

export function createCategoria(
  token: string,
  profileId: string,
  body: CategoriaInput,
) {
  return apiRequest<{ categoria: Categoria }>("/api/v1/categorias", {
    method: "POST",
    body,
    token,
    profileId,
  });
}

export function updateCategoria(
  token: string,
  profileId: string,
  id: string,
  body: CategoriaInput,
) {
  return apiRequest<{ categoria: Categoria }>(`/api/v1/categorias/${id}`, {
    method: "PATCH",
    body,
    token,
    profileId,
  });
}

export function deleteCategoria(token: string, profileId: string, id: string) {
  return apiRequest<{ deleted: boolean }>(`/api/v1/categorias/${id}`, {
    method: "DELETE",
    token,
    profileId,
  });
}
