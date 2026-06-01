from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, TechCard, TechCardComponent, Component

tech_cards_bp = Blueprint('tech_cards', __name__)

def _next_tech_id():
    last = TechCard.query.order_by(TechCard.id.desc()).first()
    n = (last.id + 1) if last else 1
    return f'TC-{n:04d}'

@tech_cards_bp.route('/', methods=['GET'])
@jwt_required()
def list_tech_cards():
    q = request.args.get('q', '').strip()
    query = TechCard.query
    if q:
        query = query.filter(TechCard.medicine_name.ilike(f'%{q}%'))
    cards = query.order_by(TechCard.medicine_name).all()
    return jsonify([c.to_dict(with_components=True) for c in cards])

@tech_cards_bp.route('/<int:cid>', methods=['GET'])
@jwt_required()
def get_tech_card(cid):
    card = TechCard.query.get_or_404(cid)
    return jsonify(card.to_dict(with_components=True))

@tech_cards_bp.route('/', methods=['POST'])
@jwt_required()
def create_tech_card():
    data = request.get_json()

    card = TechCard(
        tech_id=_next_tech_id(),
        medicine_name=data['medicine_name'],
        medicine_type=data.get('medicine_type', 'mixture'),
        usage_method=data.get('usage_method', 'internal'),
        preparation_method=data['preparation_method'],
        preparation_time_min=int(data.get('preparation_time_min', 60))
    )
    db.session.add(card)
    db.session.flush()

    for comp_data in data.get('components', []):
        tcc = TechCardComponent(
            tech_card_id=card.id,
            component_id=int(comp_data['component_id']),
            required_quantity=float(comp_data['required_quantity'])
        )
        db.session.add(tcc)

    db.session.commit()
    return jsonify(card.to_dict(with_components=True)), 201

@tech_cards_bp.route('/<int:cid>', methods=['PUT'])
@jwt_required()
def update_tech_card(cid):
    card = TechCard.query.get_or_404(cid)
    data = request.get_json()

    for field in ('medicine_name', 'medicine_type', 'usage_method', 'preparation_method', 'preparation_time_min'):
        if field in data:
            setattr(card, field, data[field])

    if 'components' in data:
        TechCardComponent.query.filter_by(tech_card_id=card.id).delete()
        for comp_data in data['components']:
            tcc = TechCardComponent(
                tech_card_id=card.id,
                component_id=int(comp_data['component_id']),
                required_quantity=float(comp_data['required_quantity'])
            )
            db.session.add(tcc)

    db.session.commit()
    return jsonify(card.to_dict(with_components=True))

@tech_cards_bp.route('/<int:cid>', methods=['DELETE'])
@jwt_required()
def delete_tech_card(cid):
    card = TechCard.query.get_or_404(cid)
    db.session.delete(card)
    db.session.commit()
    return jsonify({'message': 'Удалено'})
