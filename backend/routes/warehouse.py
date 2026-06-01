from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Component, ReadyMedicine, WholesaleRequest
from datetime import date

warehouse_bp = Blueprint('warehouse', __name__)

@warehouse_bp.route('/components', methods=['GET'])
@jwt_required()
def list_components():
    q = request.args.get('q', '').strip()
    query = Component.query
    if q:
        query = query.filter(Component.name.ilike(f'%{q}%'))
    items = query.order_by(Component.name).all()
    return jsonify([c.to_dict() for c in items])

@warehouse_bp.route('/components', methods=['POST'])
@jwt_required()
def create_component():
    data = request.get_json()
    comp = Component(
        name=data['name'],
        unit=data.get('unit', 'г'),
        quantity=float(data.get('quantity', 0)),
        critical_norm=float(data.get('critical_norm', 0)),
        expiry_date=date.fromisoformat(data['expiry_date']) if data.get('expiry_date') else None
    )
    db.session.add(comp)
    db.session.commit()
    _check_critical_norm(comp)
    return jsonify(comp.to_dict()), 201

@warehouse_bp.route('/components/<int:cid>', methods=['PUT'])
@jwt_required()
def update_component(cid):
    comp = Component.query.get_or_404(cid)
    data = request.get_json()
    for field in ('name', 'unit', 'quantity', 'critical_norm'):
        if field in data:
            setattr(comp, field, data[field])
    if 'expiry_date' in data:
        comp.expiry_date = date.fromisoformat(data['expiry_date']) if data['expiry_date'] else None
    db.session.commit()
    _check_critical_norm(comp)
    return jsonify(comp.to_dict())

@warehouse_bp.route('/components/<int:cid>', methods=['DELETE'])
@jwt_required()
def delete_component(cid):
    comp = Component.query.get_or_404(cid)
    db.session.delete(comp)
    db.session.commit()
    return jsonify({'message': 'Удалено'})

def _check_critical_norm(comp):
    if comp.critical_norm > 0 and comp.quantity < comp.critical_norm:
        # Проверить, нет ли уже активной заявки
        existing = WholesaleRequest.query.filter_by(
            component_id=comp.id, status='pending'
        ).first()
        if not existing:
            req = WholesaleRequest(
                component_id=comp.id,
                component_name=comp.name,
                quantity_needed=comp.critical_norm - comp.quantity,
                unit=comp.unit,
                reason='critical_norm'
            )
            db.session.add(req)
            db.session.commit()

@warehouse_bp.route('/ready-medicines', methods=['GET'])
@jwt_required()
def list_ready_medicines():
    q = request.args.get('q', '').strip()
    query = ReadyMedicine.query
    if q:
        query = query.filter(ReadyMedicine.name.ilike(f'%{q}%'))
    items = query.order_by(ReadyMedicine.name).all()
    return jsonify([m.to_dict() for m in items])

@warehouse_bp.route('/ready-medicines', methods=['POST'])
@jwt_required()
def create_ready_medicine():
    data = request.get_json()
    med = ReadyMedicine(
        name=data['name'],
        medicine_type=data.get('medicine_type', 'tablet'),
        quantity=float(data.get('quantity', 0)),
        unit=data.get('unit', 'уп'),
        critical_norm=float(data.get('critical_norm', 0)),
        expiry_date=date.fromisoformat(data['expiry_date']) if data.get('expiry_date') else None,
        manufacturer=data.get('manufacturer', '')
    )
    db.session.add(med)
    db.session.commit()
    return jsonify(med.to_dict()), 201

@warehouse_bp.route('/ready-medicines/<int:mid>', methods=['PUT'])
@jwt_required()
def update_ready_medicine(mid):
    med = ReadyMedicine.query.get_or_404(mid)
    data = request.get_json()
    for field in ('name', 'medicine_type', 'quantity', 'unit', 'critical_norm', 'manufacturer'):
        if field in data:
            setattr(med, field, data[field])
    if 'expiry_date' in data:
        med.expiry_date = date.fromisoformat(data['expiry_date']) if data['expiry_date'] else None
    db.session.commit()
    return jsonify(med.to_dict())

@warehouse_bp.route('/ready-medicines/<int:mid>', methods=['DELETE'])
@jwt_required()
def delete_ready_medicine(mid):
    med = ReadyMedicine.query.get_or_404(mid)
    db.session.delete(med)
    db.session.commit()
    return jsonify({'message': 'Удалено'})

@warehouse_bp.route('/wholesale-requests', methods=['GET'])
@jwt_required()
def list_wholesale_requests():
    reqs = WholesaleRequest.query.order_by(WholesaleRequest.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reqs])

@warehouse_bp.route('/wholesale-requests/<int:rid>/status', methods=['PUT'])
@jwt_required()
def update_wholesale_request_status(rid):
    req = WholesaleRequest.query.get_or_404(rid)
    data = request.get_json()
    req.status = data['status']
    db.session.commit()
    return jsonify(req.to_dict())

@warehouse_bp.route('/critical-check', methods=['POST'])
@jwt_required()
def check_all_critical():
    components = Component.query.all()
    created = 0
    for comp in components:
        existing = WholesaleRequest.query.filter_by(
            component_id=comp.id, status='pending'
        ).first()
        if comp.critical_norm > 0 and comp.quantity < comp.critical_norm and not existing:
            req = WholesaleRequest(
                component_id=comp.id,
                component_name=comp.name,
                quantity_needed=comp.critical_norm - comp.quantity,
                unit=comp.unit,
                reason='critical_norm'
            )
            db.session.add(req)
            created += 1
    db.session.commit()
    return jsonify({'created_requests': created})
