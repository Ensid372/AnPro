from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Укажите логин и пароль'}), 400

    user = User.query.filter_by(username=data['username'], is_active=True).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Неверный логин или пароль'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'access_token': token,
        'user': user.to_dict()
    })

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    return jsonify(user.to_dict())

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    if not user.check_password(data.get('old_password', '')):
        return jsonify({'error': 'Неверный текущий пароль'}), 400

    user.set_password(data['new_password'])
    db.session.commit()
    return jsonify({'message': 'Пароль изменён'})
