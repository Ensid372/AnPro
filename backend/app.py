from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config
from models import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = Config.JWT_ACCESS_TOKEN_EXPIRES

    db.init_app(app)
    JWTManager(app)
    CORS(app, resources={r'/api/*': {'origins': '*'}})

    from routes.auth import auth_bp
    from routes.users import users_bp
    from routes.warehouse import warehouse_bp
    from routes.tech_cards import tech_cards_bp
    from routes.orders import orders_bp
    from routes.inventory import inventory_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(warehouse_bp, url_prefix='/api/warehouse')
    app.register_blueprint(tech_cards_bp, url_prefix='/api/tech-cards')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)
