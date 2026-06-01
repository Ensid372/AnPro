import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'anpro-pharmacy-secret-2026')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'anpro-jwt-secret-2026')
    JWT_ACCESS_TOKEN_EXPIRES = 28800  # 8 hours

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f'sqlite:///{os.path.join(BASE_DIR, "anpro.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
