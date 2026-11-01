import os
from typing import Optional

import psycopg
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from supabase import Client, create_client

for env_path in (".env", ".env.env"):
    load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:5500")

app = FastAPI(title="Ademicon ERP API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# --- Configuração e utilitários ---
def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(500, "Configure SUPABASE_URL e SUPABASE_ANON_KEY no .env")
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def get_admin_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(500, "Configure SUPABASE_SERVICE_ROLE_KEY no .env do backend")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def db_connect():
    if not DATABASE_URL:
        raise HTTPException(500, "Configure DATABASE_URL no .env")
    return psycopg.connect(DATABASE_URL, row_factory=psycopg.rows.dict_row)


def get_bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Token de autenticação ausente")
    return authorization.split(" ", 1)[1]


# --- Autenticação e autorização ---
def current_employee(authorization: Optional[str] = Header(default=None)):
    token = get_bearer_token(authorization)

    try:
        user_response = get_supabase().auth.get_user(token)
        user = user_response.user
    except Exception as exc:
        raise HTTPException(401, "Sessão inválida ou expirada") from exc

    if not user:
        raise HTTPException(401, "Usuário não autenticado")

    try:
        with db_connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, auth_user_id, full_name, email, role, active
                    FROM public.employees
                    WHERE auth_user_id = %s
                    """,
                    (str(user.id),),
                )
                employee = cur.fetchone()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, "Não foi possível consultar o cadastro do funcionário") from exc

    if not employee or not employee["active"]:
        raise HTTPException(403, "Acesso não liberado. Contate o administrador.")

    return employee


def require_admin(employee=Depends(current_employee)):
    if employee["role"] != "admin":
        raise HTTPException(403, "Apenas administradores podem realizar esta operação")
    return employee


# --- Modelos ---
class ClientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    document: Optional[str] = Field(default=None, max_length=30)
    phone: Optional[str] = Field(default=None, max_length=30)
    email: Optional[EmailStr] = None


class EmployeeCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    role: str = Field(pattern="^(manager|sales|finance)$")


class RegisterEmployee(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr


# --- Health e perfil ---
@app.get("/health")
def health():
    return {"status": "ok", "service": "ademicon-erp-api"}


@app.get("/api/me")
def me(employee=Depends(current_employee)):
    return {
        "id": str(employee["id"]),
        "full_name": employee["full_name"],
        "email": employee["email"],
        "role": employee["role"],
        "active": employee["active"],
    }


# --- Dashboard ---
@app.get("/api/dashboard")
def dashboard(employee=Depends(current_employee)):
    try:
        with db_connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) AS total FROM public.clients")
                clients_total = cur.fetchone()["total"]

                cur.execute("SELECT COUNT(*) AS total FROM public.proposals")
                proposals_total = cur.fetchone()["total"]

                cur.execute(
                    """
                    SELECT COALESCE(SUM(sale_amount), 0) AS total
                    FROM public.sales
                    WHERE status = 'confirmed'
                      AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
                    """
                )
                sales_month = cur.fetchone()["total"]

                cur.execute(
                    """
                    SELECT COALESCE(SUM(target_amount), 0) AS target
                    FROM public.sales_goals
                    WHERE month = date_trunc('month', CURRENT_DATE)::date
                    """
                )
                goal = cur.fetchone()["target"]

                cur.execute(
                    """
                    SELECT to_char(date_trunc('month', created_at), 'Mon') AS month,
                           COALESCE(SUM(sale_amount), 0) AS total
                    FROM public.sales
                    WHERE created_at >= date_trunc('month', CURRENT_DATE) - interval '5 months'
                      AND status = 'confirmed'
                    GROUP BY date_trunc('month', created_at)
                    ORDER BY date_trunc('month', created_at)
                    """
                )
                monthly = cur.fetchall()

                cur.execute(
                    """
                    SELECT status, COUNT(*) AS total
                    FROM public.proposals
                    GROUP BY status
                    ORDER BY status
                    """
                )
                proposal_status = cur.fetchall()

        return {
            "clients_total": clients_total,
            "proposals_total": proposals_total,
            "sales_month": float(sales_month or 0),
            "goal_month": float(goal or 0),
            "goal_percent": round(float(sales_month or 0) / float(goal) * 100, 1) if goal else 0,
            "monthly_sales": [{"month": r["month"], "total": float(r["total"] or 0)} for r in monthly],
            "proposal_status": [{"status": r["status"], "total": r["total"]} for r in proposal_status],
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, "Erro ao carregar indicadores do dashboard") from exc


# --- Clientes ---
@app.get("/api/clients")
def list_clients(q: str = "", employee=Depends(current_employee)):
    try:
        with db_connect() as conn:
            with conn.cursor() as cur:
                if q.strip():
                    cur.execute(
                        """
                        SELECT id, full_name, document, phone, email, created_at
                        FROM public.clients
                        WHERE full_name ILIKE %s OR email ILIKE %s
                        ORDER BY created_at DESC LIMIT 200
                        """,
                        (f"%{q.strip()}%", f"%{q.strip()}%"),
                    )
                else:
                    cur.execute(
                        """
                        SELECT id, full_name, document, phone, email, created_at
                        FROM public.clients
                        ORDER BY created_at DESC LIMIT 200
                        """
                    )
                rows = cur.fetchall()

        return [
            {
                **r,
                "id": str(r["id"]),
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in rows
        ]
    except Exception as exc:
        raise HTTPException(500, "Erro ao consultar clientes") from exc


@app.post("/api/clients", status_code=201)
def create_client(payload: ClientCreate, employee=Depends(current_employee)):
    try:
        with db_connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO public.clients (full_name, document, phone, email, created_by)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, full_name, document, phone, email, created_at
                    """,
                    (
                        payload.full_name.strip(),
                        payload.document,
                        payload.phone,
                        str(payload.email) if payload.email else None,
                        employee["id"],
                    ),
                )
                row = cur.fetchone()

        return {**row, "id": str(row["id"]), "created_at": row["created_at"].isoformat()}
    except Exception as exc:
        raise HTTPException(500, "Não foi possível cadastrar o cliente") from exc


# --- Funcionários e administração ---
@app.post("/api/admin/employees", status_code=201)
def invite_employee(payload: EmployeeCreate, admin=Depends(require_admin)):
    """Somente o admin autenticado pode convidar funcionários."""
    try:
        response = get_admin_supabase().auth.admin.invite_user_by_email(str(payload.email))
        invited_user = response.user

        if not invited_user:
            raise HTTPException(502, "O Supabase não retornou o usuário convidado")

        with db_connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO public.employees (auth_user_id, full_name, email, role, active)
                    VALUES (%s, %s, %s, %s, FALSE)
                    ON CONFLICT (auth_user_id) DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        email = EXCLUDED.email,
                        role = EXCLUDED.role,
                        active = FALSE
                    RETURNING id, full_name, email, role, active
                    """,
                    (str(invited_user.id), payload.full_name.strip(), str(payload.email), payload.role),
                )
                row = cur.fetchone()

        return {
            "message": "Convite enviado. O administrador deve liberar o acesso após validar o cadastro.",
            "employee": {**row, "id": str(row["id"])},
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, "Não foi possível convidar o funcionário") from exc


@app.get("/api/admin/employees")
def list_employees(admin=Depends(require_admin)):
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, full_name, email, role, active, created_at FROM public.employees ORDER BY created_at DESC"
            )
            rows = cur.fetchall()

    return [
        {**r, "id": str(r["id"]), "created_at": r["created_at"].isoformat() if r["created_at"] else None}
        for r in rows
    ]


@app.patch("/api/admin/employees/{employee_id}/access")
def set_employee_access(employee_id: str, active: bool, admin=Depends(require_admin)):
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE public.employees SET active = %s WHERE id = %s RETURNING id, full_name, email, role, active",
                (active, employee_id),
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(404, "Funcionário não encontrado")

    return {**row, "id": str(row["id"])}


# --- Cadastro inicial do usuário ---
@app.post("/api/register", status_code=201)
def register_employee(
    payload: RegisterEmployee,
    authorization: Optional[str] = Header(default=None),
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Faça login para concluir o cadastro.")

    token = get_bearer_token(authorization)

    try:
        response = get_supabase().auth.get_user(token)
        user = response.user
    except Exception as exc:
        raise HTTPException(401, "Sessão inválida ou expirada.") from exc

    if not user or not user.email:
        raise HTTPException(401, "Usuário não autenticado.")

    if user.email.lower() != str(payload.email).lower():
        raise HTTPException(400, "O e-mail não corresponde à conta autenticada.")

    try:
        with db_connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO public.employees (
                        auth_user_id,
                        full_name,
                        email,
                        role,
                        active
                    )
                    VALUES (%s, %s, %s, 'sales', FALSE)
                    ON CONFLICT (auth_user_id) DO NOTHING
                    RETURNING id
                    """,
                    (str(user.id), payload.full_name.strip(), user.email),
                )

                employee = cur.fetchone()

                if not employee:
                    cur.execute(
                        """
                        SELECT id
                        FROM public.employees
                        WHERE auth_user_id = %s
                        """,
                        (str(user.id),),
                    )
                    employee = cur.fetchone()

        return {
            "message": "Cadastro recebido. Aguarde a liberação do administrador.",
            "employee_id": str(employee["id"]),
            "active": False,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, "Não foi possível concluir o cadastro.") from exc