"""
BRANDCORE repository base.

D1 binding interface (Cloudflare Python Workers):
    await db.prepare(sql).bind(*params).run()      # write
    await db.prepare(sql).bind(*params).first()    # single row (dict | None)
    await db.prepare(sql).bind(*params).all()      # D1Result envelope (.results = list[dict])

All repository methods are async and receive a `db` connection exposing this
interface. For tests, SqliteD1Wrapper adapts sqlite3.Connection to the same
async interface so repository logic is exercised against real SQLite.
"""
import sqlite3
from typing import Any


class _D1Statement:
    def __init__(self, conn: sqlite3.Connection, sql: str):
        self._conn = conn
        self._sql = sql
        self._params: tuple = ()

    def bind(self, *params: Any) -> "_D1Statement":
        self._params = params
        return self

    async def run(self) -> None:
        self._conn.execute(self._sql, self._params)

    async def first(self) -> dict | None:
        cur = self._conn.execute(self._sql, self._params)
        row = cur.fetchone()
        return dict(row) if row is not None else None

    async def all(self) -> list[dict]:
        cur = self._conn.execute(self._sql, self._params)
        return [dict(r) for r in cur.fetchall()]


class SqliteD1Wrapper:
    """Adapts sqlite3.Connection to the D1 async binding interface for tests."""

    def __init__(self, conn: sqlite3.Connection):
        conn.row_factory = sqlite3.Row
        self._conn = conn

    def prepare(self, sql: str) -> _D1Statement:
        return _D1Statement(self._conn, sql)

    async def batch(self, statements: list[_D1Statement]) -> list[Any]:
        """Execute multiple statements in one transaction (D1 db.batch equivalent)."""
        results = []
        try:
            self._conn.execute("BEGIN")
            for stmt in statements:
                self._conn.execute(stmt._sql, stmt._params)
                results.append(None)
            self._conn.execute("COMMIT")
        except Exception:
            self._conn.execute("ROLLBACK")
            raise
        return results


class BaseRepository:
    def __init__(self, db: Any):
        self.db = db

    async def _run(self, sql: str, params: tuple = ()) -> None:
        await self.db.prepare(sql).bind(*params).run()

    async def _first(self, sql: str, params: tuple = ()) -> dict | None:
        return await self.db.prepare(sql).bind(*params).first()

    async def _all(self, sql: str, params: tuple = ()) -> list[dict]:
        result = await self.db.prepare(sql).bind(*params).all()
        # Cloudflare D1 Python Workers returns a D1Result envelope object
        # with a .results attribute holding the list[dict] of rows.
        # The SQLite test adapter (SqliteD1Wrapper) returns list[dict]
        # directly, so fall back to the raw result when .results is absent.
        if hasattr(result, "results"):
            return result.results
        return result
