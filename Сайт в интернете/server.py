#!/usr/bin/env python3
import json
import os
import sqlite3
import threading
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import posixpath
from urllib.parse import urlparse, unquote
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DB_PATH = os.path.join(BASE_DIR, "site.db")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "admin123")
MAX_BODY_MB = int(os.environ.get("MAX_BODY_MB", "25"))  # лимит тела запроса (для JSON)
MAX_BODY_BYTES = MAX_BODY_MB * 1024 * 1024


def init_db():
    con = sqlite3.connect(DB_PATH)
    try:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              text TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
            """
        )
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              username TEXT NOT NULL,
              fullname TEXT NOT NULL,
              repo_url TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
            """
        )
        con.commit()
    finally:
        con.close()
    # только база и public, без каталога загрузок


DB_LOCK = threading.Lock()


class AppHandler(SimpleHTTPRequestHandler):
    # Обслуживаем статику из public
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    # Упрощённые CORS для API (на будущее)
    def _set_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

    def _is_admin(self):
        if not ADMIN_TOKEN:
            return True
        header = self.headers.get("X-Admin-Token") or self.headers.get("Authorization", "")
        token = header.replace("Bearer", "").strip()
        return token == ADMIN_TOKEN

    def _require_admin(self):
        if not self._is_admin():
            self.send_response(HTTPStatus.UNAUTHORIZED)
            self._set_cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "admin token required"}).encode("utf-8"))
            return False
        return True

    def do_OPTIONS(self):
        if self.path.startswith("/api/") or "/upload" in self.path:
            self.send_response(HTTPStatus.NO_CONTENT)
            self._set_cors()
            self.end_headers()
        else:
            super().do_OPTIONS()

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.handle_api_get()
            return
        # Отдаём статику из public через базовый обработчик
        return super().do_GET()

    def do_HEAD(self):
        # HEAD-запросы к API: отвечаем как 200/404 без тела, чтобы проверки типа curl -I работали
        if self.path.startswith("/api/"):
            self.handle_api_head()
            return
        return super().do_HEAD()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self.handle_api_post()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def do_PUT(self):
        if self.path.startswith("/api/"):
            self.handle_api_put()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            self.handle_api_delete()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    # ---- API ----
    def handle_api_get(self):
        parsed = urlparse(self.path)
        if parsed.path.rstrip("/") == "/api/health":
            self.send_response(HTTPStatus.OK)
            self._set_cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
            return

        if parsed.path.rstrip("/") == "/api/messages":
            with DB_LOCK, sqlite3.connect(DB_PATH) as con:
                con.row_factory = sqlite3.Row
                cur = con.execute(
                    "SELECT id, name, text, created_at FROM messages ORDER BY id DESC LIMIT 200"
                )
                rows = [dict(r) for r in cur.fetchall()]
            self.send_response(HTTPStatus.OK)
            self._set_cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(rows).encode("utf-8"))
            return

        if parsed.path.rstrip("/").startswith("/api/projects"):
            with DB_LOCK, sqlite3.connect(DB_PATH) as con:
                con.row_factory = sqlite3.Row
                cur = con.execute(
                    "SELECT id, title, username, fullname, repo_url, created_at FROM projects ORDER BY id DESC"
                )
                rows = [dict(r) for r in cur.fetchall()]
            self.send_response(HTTPStatus.OK)
            self._set_cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(rows).encode("utf-8"))
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Unknown API endpoint")

    def handle_api_post(self):
        parsed = urlparse(self.path)
        normalized = parsed.path.rstrip("/")
        try:
            body = self._read_body()
        except ValueError as e:
            return self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(e)})
        ctype = self.headers.get("Content-Type", "")
        data = {}
        try:
            data = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            data = {}

        if normalized == "/api/messages":
            name = (data.get("name") or "Гость").strip()[:100]
            text = (data.get("text") or "").strip()[:2000]
            if not text:
                return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "text is required"})
            created_at = datetime.utcnow().isoformat() + "Z"
            with DB_LOCK, sqlite3.connect(DB_PATH) as con:
                con.execute(
                    "INSERT INTO messages(name, text, created_at) VALUES(?,?,?)",
                    (name, text, created_at),
                )
                con.commit()
            return self._send_json(HTTPStatus.CREATED, {"ok": True})

        if normalized.startswith("/api/projects"):
            title = (data.get("title") or "").strip()[:150]
            username = (data.get("username") or "").strip()[:100]
            fullname = (data.get("fullname") or "").strip()[:150]
            repo_url = (data.get("repo_url") or "").strip()
            if not title or not username or not fullname or not repo_url:
                return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Все поля обязательны"})
            if not re.fullmatch(r"[A-Za-z0-9-]{1,39}", username):
                return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Некорректный GitHub ник"})
            if not repo_url.startswith("https://github.com/"):
                return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Ссылка должна вести на GitHub"})
            tail = repo_url[len("https://github.com/"):]
            parts = tail.split("/")
            if len(parts) < 2 or not parts[0] or not parts[1]:
                return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Формат ссылки: https://github.com/owner/repo"})
            created_at = datetime.utcnow().isoformat() + "Z"
            with DB_LOCK, sqlite3.connect(DB_PATH) as con:
                cur = con.execute(
                    "INSERT INTO projects(title, username, fullname, repo_url, created_at) VALUES(?,?,?,?,?)",
                    (title, username, fullname, repo_url, created_at)
                )
                project_id = cur.lastrowid
                con.commit()
            return self._send_json(HTTPStatus.CREATED, {
                "ok": True,
                "project": {
                    "id": project_id,
                    "title": title,
                    "username": username,
                    "fullname": fullname,
                    "repo_url": repo_url,
                    "created_at": created_at
                }
            })

        self.send_error(HTTPStatus.NOT_FOUND, "Unknown API endpoint")

    def handle_api_head(self):
        parsed = urlparse(self.path)
        # Для HEAD возвращаем только статус и заголовки, без тела
        if parsed.path.rstrip("/") in ("/api/health", "/api/messages"):
            self.send_response(HTTPStatus.OK)
            self._set_cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if parsed.path.rstrip("/").startswith("/api/projects"):
            self.send_response(HTTPStatus.OK)
            self._set_cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Unknown API endpoint")

    def handle_api_put(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/messages/"):
            if not self._require_admin():
                return
            try:
                msg_id = int(parsed.path.rsplit("/", 1)[-1])
            except ValueError:
                return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid id"})
            length = int(self.headers.get("Content-Length", "0") or 0)
            body = self.rfile.read(length) if length > 0 else b"{}"
            try:
                data = json.loads(body.decode("utf-8"))
            except Exception:
                data = {}
            name = (data.get("name") or "Гость").strip()[:100]
            text = (data.get("text") or "").strip()[:2000]
            if not text:
                return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "text is required"})
            with DB_LOCK, sqlite3.connect(DB_PATH) as con:
                cur = con.execute("UPDATE messages SET name=?, text=? WHERE id=?", (name, text, msg_id))
                con.commit()
                if cur.rowcount == 0:
                    return self._send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return self._send_json(HTTPStatus.OK, {"ok": True})

        if parsed.path.startswith("/api/projects/"):
            if not self._require_admin():
                return
            try:
                project_id = int(parsed.path.rsplit("/", 1)[-1])
            except ValueError:
                return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid id"})
            length = int(self.headers.get("Content-Length", "0") or 0)
            body = self.rfile.read(length) if length > 0 else b"{}"
            try:
                data = json.loads(body.decode("utf-8"))
            except Exception:
                data = {}
            title = (data.get("title") or "").strip()[:150]
            fullname = (data.get("fullname") or "").strip()[:150]
            repo_url = (data.get("repo_url") or "").strip()
            if not title or not fullname or not repo_url:
                return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Все поля обязательны"})
            with DB_LOCK, sqlite3.connect(DB_PATH) as con:
                cur = con.execute(
                    "UPDATE projects SET title=?, fullname=?, repo_url=? WHERE id=?",
                    (title, fullname, repo_url, project_id)
                )
                con.commit()
                if cur.rowcount == 0:
                    return self._send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return self._send_json(HTTPStatus.OK, {"ok": True})

        self.send_error(HTTPStatus.NOT_FOUND, "Unknown API endpoint")

    def handle_api_delete(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/messages/"):
            if not self._require_admin():
                return
            try:
                msg_id = int(parsed.path.rsplit("/", 1)[-1])
            except ValueError:
                return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid id"})
            with DB_LOCK, sqlite3.connect(DB_PATH) as con:
                cur = con.execute("DELETE FROM messages WHERE id=?", (msg_id,))
                con.commit()
                if cur.rowcount == 0:
                    return self._send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return self._send_json(HTTPStatus.OK, {"ok": True})

        if parsed.path.startswith("/api/projects/"):
            if not self._require_admin():
                return
            try:
                project_id = int(parsed.path.rsplit("/", 1)[-1])
            except ValueError:
                return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid id"})
            with DB_LOCK, sqlite3.connect(DB_PATH) as con:
                cur = con.execute("DELETE FROM projects WHERE id=?", (project_id,))
                con.commit()
                if cur.rowcount == 0:
                    return self._send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return self._send_json(HTTPStatus.OK, {"ok": True})

        self.send_error(HTTPStatus.NOT_FOUND, "Unknown API endpoint")

    def _send_json(self, status, payload):
        self.send_response(status)
        self._set_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    # -------- Helpers: body reading ---------
    def _read_body(self) -> bytes:
        """Прочитать тело запроса. Поддерживает Content-Length и chunked.
        Бросает ValueError при превышении лимита или ошибке формата.
        """
        # Размер известен
        cl = self.headers.get("Content-Length")
        if cl:
            try:
                length = int(cl)
            except Exception:
                length = 0
            if length < 0:
                length = 0
            if length > MAX_BODY_BYTES:
                raise ValueError(f"Тело слишком большое (> {MAX_BODY_MB} MB)")
            return self.rfile.read(length) if length > 0 else b""

        # Chunked
        te = (self.headers.get("Transfer-Encoding", "").lower())
        if "chunked" in te:
            return self._read_chunked()

        # Ничего не указано — читаем пустое тело
        return b""

    def _read_chunked(self) -> bytes:
        total = 0
        out = bytearray()
        # Читаем размер чанка в hex до CRLF, затем сами данные и CRLF
        while True:
            line = self.rfile.readline()
            if not line:
                raise ValueError("Неверный формат chunked тела")
            # иногда размер приходит с доп. параметрами: '1A;ext=foo' — обрежем по ';'
            try:
                size_str = line.split(b";", 1)[0].strip()
                chunk_size = int(size_str, 16)
            except Exception:
                raise ValueError("Неверный размер chunk")
            if chunk_size == 0:
                # Прочитать завершающий CRLF и возможные трейлеры
                # Пропускаем все строки до пустой строки
                # (BaseHTTPRequestHandler уже парсит заголовки, трейлеры обычно отсутствуют)
                self.rfile.readline()  # CRLF после нулевого чанка
                break
            if total + chunk_size > MAX_BODY_BYTES:
                raise ValueError(f"Тело слишком большое (> {MAX_BODY_MB} MB)")
            chunk = self.rfile.read(chunk_size)
            if len(chunk) != chunk_size:
                raise ValueError("Оборванный chunk")
            out.extend(chunk)
            total += chunk_size
            # закрывающий CRLF для чанка
            crlf = self.rfile.read(2)
            if crlf != b"\r\n":
                raise ValueError("Неверный разделитель chunk")
        return bytes(out)

    # -------- Helpers: статика ---------
    def _serve_public(self) -> bool:
        path = urlparse(self.path).path
        if path == "/":
            super().do_GET()
            return True
        safe_path = self._safe_join(PUBLIC_DIR, path)
        if safe_path and os.path.exists(safe_path):
            super().do_GET()
            return True
        return False

    def _safe_join(self, root: str, url_path: str):
        # Decode percent-encodings, normalize, and prevent escaping root
        path = unquote(url_path)
        path = path.split("?", 1)[0].split("#", 1)[0]
        path = posixpath.normpath(path)
        parts = [p for p in path.strip("/").split("/") if p and p not in (".", "..")]
        fs_path = root
        for part in parts:
            # keep unicode names (Cyrillic allowed)
            fs_path = os.path.join(fs_path, part)
        try:
            real = os.path.realpath(fs_path)
            if os.path.commonpath([real, os.path.realpath(root)]) != os.path.realpath(root):
                return None
            return real
        except Exception:
            return None

    # Удалены функции распаковки архивов и обработка /upload

def run():
    init_db()
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer((host, port), AppHandler)
    print(f"Server running on http://{host}:{port}")
    print(f"Static: {PUBLIC_DIR}")
    print(f"DB: {DB_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        server.server_close()


if __name__ == "__main__":
    run()

