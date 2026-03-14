"""
CTAS Database Layer – Supabase (PostgreSQL via psycopg2)
"""

import os
import psycopg2
import psycopg2.extras
from contextlib import contextmanager

SUPABASE_DB_URL = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL", "")


@contextmanager
def get_db():
    """Yield a DB connection with auto-commit/rollback."""
    conn = psycopg2.connect(SUPABASE_DB_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_cursor(conn):
    """Return a RealDictCursor for dict-style row access."""
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


def init_db():
    """Verify connection to Supabase PostgreSQL."""
    if not SUPABASE_DB_URL:
        print("⚠  SUPABASE_DB_URL not set – database features will not work.")
        return
    try:
        with get_db() as conn:
            cur = get_cursor(conn)
            cur.execute("SELECT COUNT(*) AS c FROM users")
            count = cur.fetchone()["c"]
            print(f"Supabase connected. Users table has {count} row(s).")
    except Exception as e:
        print(f"⚠  Supabase connection error: {e}")
