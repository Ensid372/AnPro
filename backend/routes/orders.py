from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Order, TechCard, TechCardComponent, Component, ReadyMedicine
from models import UnservedCustomer, WholesaleRequest
from datetime import datetime, timedelta

orders_bp = Blueprint('orders', __name__)

def _next_order_number():
    today = datetime.utcnow().strftime('%Y%m%d')
    count = Order.query.filter(
        Order.order_number.like(f'ORD-{today}-%')
    ).count()
    return f'ORD-{today}-{count + 1:03d}'

def _check_components(tech_card_id):
    card = TechCard.query.get(tech_card_id)
    if not card:
        return False, []
    missing = []
    for tcc in card.components:
        comp = tcc.component
        if not comp or comp.quantity < tcc.required_quantity:
            missing.append({
                'component_id': tcc.component_id,
                'component_name': comp.name if comp else 'Неизвестно',
                'required': tcc.required_quantity,
                'available': comp.quantity if comp else 0,
                'unit': comp.unit if comp else ''
            })
    return len(missing) == 0, missing

def _reserve_components(tech_card_id):
    card = TechCard.query.get(tech_card_id)
    for tcc in card.components:
        comp = Component.query.get(tcc.component_id)
        if comp:
            comp.quantity -= tcc.required_quantity

@orders_bp.route('/', methods=['GET'])
@jwt_required()
def list_orders():
    status = request.args.get('status')
    query = Order.query
    if status:
        if status == 'active':
            query = query.filter(Order.status.in_(['in_production', 'waiting_components']))
        else:
            query = query.filter(Order.status == status)
    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])

@orders_bp.route('/check-components', methods=['POST'])
@jwt_required()
def check_order_components():
    data = request.get_json()

    if data.get('order_type') == 'ready':
        med_id = data.get('ready_medicine_id')
        if med_id:
            med = ReadyMedicine.query.get(med_id)
            if med and med.quantity > 0:
                return jsonify({'available': True, 'missing': []})
            return jsonify({'available': False, 'missing': [{'component_name': data.get('medicine_name', ''), 'available': 0}]})
        return jsonify({'available': False, 'missing': []})

    tech_card_id = data.get('tech_card_id')
    if not tech_card_id:
        return jsonify({'available': False, 'missing': [], 'error': 'Технологическая карта не указана'})

    ok, missing = _check_components(tech_card_id)
    return jsonify({'available': ok, 'missing': missing})

@orders_bp.route('/', methods=['POST'])
@jwt_required()
def create_order():
    data = request.get_json()
    user_id = get_jwt_identity()

    order_type = data.get('order_type', 'manufactured')

    estimated_ready_at = None
    if order_type == 'manufactured' and data.get('tech_card_id'):
        card = TechCard.query.get(data['tech_card_id'])
        if card:
            estimated_ready_at = datetime.utcnow() + timedelta(minutes=card.preparation_time_min)

    order = Order(
        order_number=_next_order_number(),
        customer_name=data['customer_name'],
        customer_phone=data['customer_phone'],
        customer_address=data['customer_address'],
        doctor_name=data.get('doctor_name', ''),
        medicine_name=data['medicine_name'],
        order_type=order_type,
        tech_card_id=data.get('tech_card_id'),
        ready_medicine_id=data.get('ready_medicine_id'),
        estimated_ready_at=estimated_ready_at,
        created_by=int(user_id)
    )

    if order_type == 'ready':
        med = ReadyMedicine.query.get(data.get('ready_medicine_id'))
        if med and med.quantity > 0:
            med.quantity -= 1
            order.status = 'completed'
            order.completed_at = datetime.utcnow()
        else:
            order.status = 'unserved'
    else:
        ok, missing = _check_components(data.get('tech_card_id'))
        if ok:
            _reserve_components(data['tech_card_id'])
            order.status = 'in_production'
        else:
            order.status = 'waiting_components'
            for item in missing:
                req = WholesaleRequest(
                    component_id=item['component_id'],
                    component_name=item['component_name'],
                    quantity_needed=item['required'] - item['available'],
                    unit=item['unit'],
                    reason='order_requirement'
                )
                db.session.add(req)

    db.session.add(order)
    db.session.flush()

    if order.status == 'waiting_components':
        uc = UnservedCustomer(
            customer_name=order.customer_name,
            customer_phone=order.customer_phone,
            customer_address=order.customer_address,
            medicine_name=order.medicine_name,
            order_id=order.id
        )
        db.session.add(uc)

    db.session.commit()
    return jsonify(order.to_dict()), 201

@orders_bp.route('/<int:oid>/complete', methods=['POST'])
@jwt_required()
def complete_order(oid):
    order = Order.query.get_or_404(oid)
    if order.status not in ('in_production', 'waiting_components'):
        return jsonify({'error': 'Заказ не в производстве'}), 400
    order.status = 'completed'
    order.completed_at = datetime.utcnow()
    db.session.commit()
    return jsonify(order.to_dict())

@orders_bp.route('/<int:oid>/mark-components-ready', methods=['POST'])
@jwt_required()
def mark_components_ready(oid):
    order = Order.query.get_or_404(oid)
    if order.status != 'waiting_components':
        return jsonify({'error': 'Неверный статус заказа'}), 400

    ok, missing = _check_components(order.tech_card_id)
    if not ok:
        return jsonify({'error': 'Компоненты ещё не поступили', 'missing': missing}), 400

    _reserve_components(order.tech_card_id)
    order.status = 'in_production'

    card = TechCard.query.get(order.tech_card_id)
    if card:
        order.estimated_ready_at = datetime.utcnow() + timedelta(minutes=card.preparation_time_min)

    db.session.commit()
    return jsonify(order.to_dict())

@orders_bp.route('/<int:oid>', methods=['GET'])
@jwt_required()
def get_order(oid):
    order = Order.query.get_or_404(oid)
    return jsonify(order.to_dict())

@orders_bp.route('/unserved', methods=['GET'])
@jwt_required()
def list_unserved():
    items = UnservedCustomer.query.order_by(UnservedCustomer.created_at.desc()).all()
    return jsonify([u.to_dict() for u in items])

@orders_bp.route('/unserved/<int:uid>/notify', methods=['POST'])
@jwt_required()
def notify_unserved(uid):
    customer = UnservedCustomer.query.get_or_404(uid)
    from datetime import datetime
    customer.notified = True
    customer.notified_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': f'Уведомление отправлено для {customer.customer_name}', 'customer': customer.to_dict()})
