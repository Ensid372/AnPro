from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User
from functools import wraps

users_bp = Blueprint('users', __name__)

def require_role(*roles):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or user.role not in roles:
                return jsonify({'error': 'Недостаточно прав'}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator

@users_bp.route('/', methods=['GET'])
@require_role('admin')
def list_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])

@users_bp.route('/', methods=['POST'])
@require_role('admin')
def create_user():
    data = request.get_json()
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Логин уже занят'}), 400

    user = User(
        username=data['username'],
        full_name=data['full_name'],
        role=data.get('role', 'provizor')
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@users_bp.route('/<int:uid>', methods=['PUT'])
@require_role('admin')
def update_user(uid):
    user = User.query.get_or_404(uid)
    data = request.get_json()
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'role' in data:
        user.role = data['role']
    if 'is_active' in data:
        user.is_active = data['is_active']
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    db.session.commit()
    return jsonify(user.to_dict())

@users_bp.route('/<int:uid>', methods=['DELETE'])
@require_role('admin')
def deactivate_user(uid):
    user = User.query.get_or_404(uid)
    user.is_active = False
    db.session.commit()
    return jsonify({'message': 'Пользователь деактивирован'})
