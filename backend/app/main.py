from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os

# Импорты из текущего пакета
from .routers.auth import router as auth_router
from .routers.users import router as users_router
from .routers.game import router as game_router
from .routers.leaderboard import router as leaderboard_router
from .config import settings
from .database import engine, Base

# Создаем таблицы
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url="/api/v1/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене укажите конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(game_router)
app.include_router(leaderboard_router)

# Определяем абсолютные пути
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
frontend_dir = os.path.join(project_root, "frontend")

# Создаем директорию для статических файлов, если её нет
static_dir = os.path.join(frontend_dir, "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)

# Создаем директорию для шаблонов, если её нет
templates_dir = os.path.join(frontend_dir, "templates")
if not os.path.exists(templates_dir):
    os.makedirs(templates_dir, exist_ok=True)

# Статические файлы и шаблоны
app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)


@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/register")
async def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})


@app.get("/lobby")
async def lobby(request: Request):
    return templates.TemplateResponse("lobby.html", {"request": request})


@app.get("/play")
async def play(request: Request):
    return templates.TemplateResponse("game.html", {"request": request})


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Pokemon Tower Defense"}

