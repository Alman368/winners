from fastapi import FastAPI

from app.georeferencing.router import router as georeferencing_router

app = FastAPI()
app.include_router(georeferencing_router)
