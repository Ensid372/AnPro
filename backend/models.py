from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='provizor')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'full_name': self.full_name,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

class Component(db.Model):
    __tablename__ = 'components'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    unit = db.Column(db.String(50), default='г')  # г, мл, шт, мг
    quantity = db.Column(db.Float, default=0.0)
    critical_norm = db.Column(db.Float, default=0.0)
    expiry_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'unit': self.unit,
            'quantity': self.quantity,
            'critical_norm': self.critical_norm,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'below_critical': self.quantity < self.critical_norm,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class TechCard(db.Model):
    __tablename__ = 'tech_cards'
    id = db.Column(db.Integer, primary_key=True)
    tech_id = db.Column(db.String(50), unique=True, nullable=False)  # TC-0001
    medicine_name = db.Column(db.String(200), nullable=False)
    medicine_type = db.Column(db.String(50), nullable=False)
    usage_method = db.Column(db.String(50), nullable=False)
    preparation_method = db.Column(db.Text, nullable=False)
    preparation_time_min = db.Column(db.Integer, default=60)  # минуты
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    components = db.relationship('TechCardComponent', back_populates='tech_card', cascade='all, delete-orphan')

    def to_dict(self, with_components=False):
        data = {
            'id': self.id,
            'tech_id': self.tech_id,
            'medicine_name': self.medicine_name,
            'medicine_type': self.medicine_type,
            'usage_method': self.usage_method,
            'preparation_method': self.preparation_method,
            'preparation_time_min': self.preparation_time_min,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if with_components:
            data['components'] = [c.to_dict() for c in self.components]
        return data

class TechCardComponent(db.Model):
    __tablename__ = 'tech_card_components'
    id = db.Column(db.Integer, primary_key=True)
    tech_card_id = db.Column(db.Integer, db.ForeignKey('tech_cards.id'), nullable=False)
    component_id = db.Column(db.Integer, db.ForeignKey('components.id'), nullable=False)
    required_quantity = db.Column(db.Float, nullable=False)

    tech_card = db.relationship('TechCard', back_populates='components')
    component = db.relationship('Component')

    def to_dict(self):
        return {
            'id': self.id,
            'component_id': self.component_id,
            'component_name': self.component.name if self.component else '',
            'unit': self.component.unit if self.component else '',
            'required_quantity': self.required_quantity,
            'available_quantity': self.component.quantity if self.component else 0
        }

class ReadyMedicine(db.Model):
    __tablename__ = 'ready_medicines'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    medicine_type = db.Column(db.String(50), nullable=False)
    quantity = db.Column(db.Float, default=0.0)
    unit = db.Column(db.String(50), default='уп')
    critical_norm = db.Column(db.Float, default=0.0)
    expiry_date = db.Column(db.Date, nullable=True)
    manufacturer = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'medicine_type': self.medicine_type,
            'quantity': self.quantity,
            'unit': self.unit,
            'critical_norm': self.critical_norm,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'below_critical': self.quantity < self.critical_norm,
            'manufacturer': self.manufacturer,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False)

    customer_name = db.Column(db.String(200), nullable=False)
    customer_phone = db.Column(db.String(50), nullable=False)
    customer_address = db.Column(db.String(300), nullable=False)

    doctor_name = db.Column(db.String(200))
    medicine_name = db.Column(db.String(200), nullable=False)

    order_type = db.Column(db.String(20), default='manufactured')

    status = db.Column(db.String(50), default='in_production')

    tech_card_id = db.Column(db.Integer, db.ForeignKey('tech_cards.id'), nullable=True)
    ready_medicine_id = db.Column(db.Integer, db.ForeignKey('ready_medicines.id'), nullable=True)

    estimated_ready_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    tech_card = db.relationship('TechCard')
    ready_medicine = db.relationship('ReadyMedicine')
    creator = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'order_number': self.order_number,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'customer_address': self.customer_address,
            'doctor_name': self.doctor_name,
            'medicine_name': self.medicine_name,
            'order_type': self.order_type,
            'status': self.status,
            'tech_card_id': self.tech_card_id,
            'ready_medicine_id': self.ready_medicine_id,
            'estimated_ready_at': self.estimated_ready_at.isoformat() if self.estimated_ready_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'tech_card': self.tech_card.to_dict() if self.tech_card else None
        }

class UnservedCustomer(db.Model):
    __tablename__ = 'unserved_customers'
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(200), nullable=False)
    customer_phone = db.Column(db.String(50), nullable=False)
    customer_address = db.Column(db.String(300), nullable=False)
    medicine_name = db.Column(db.String(200), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    notified = db.Column(db.Boolean, default=False)
    notified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship('Order')

    def to_dict(self):
        return {
            'id': self.id,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'customer_address': self.customer_address,
            'medicine_name': self.medicine_name,
            'order_id': self.order_id,
            'notified': self.notified,
            'notified_at': self.notified_at.isoformat() if self.notified_at else None,
            'created_at': self.created_at.isoformat()
        }

class WholesaleRequest(db.Model):
    __tablename__ = 'wholesale_requests'
    id = db.Column(db.Integer, primary_key=True)
    component_id = db.Column(db.Integer, db.ForeignKey('components.id'), nullable=True)
    component_name = db.Column(db.String(200), nullable=False)
    quantity_needed = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(50), default='г')
    reason = db.Column(db.String(300))  # 'critical_norm' | 'order_requirement'
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    status = db.Column(db.String(50), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    component = db.relationship('Component')
    order = db.relationship('Order')

    def to_dict(self):
        return {
            'id': self.id,
            'component_id': self.component_id,
            'component_name': self.component_name,
            'quantity_needed': self.quantity_needed,
            'unit': self.unit,
            'reason': self.reason,
            'order_id': self.order_id,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

class InventoryRecord(db.Model):
    __tablename__ = 'inventory_records'
    id = db.Column(db.Integer, primary_key=True)
    conducted_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    status = db.Column(db.String(50), default='draft')
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    conductor = db.relationship('User')
    items = db.relationship('InventoryItem', back_populates='record', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'conductor': self.conductor.full_name if self.conductor else None
        }

class InventoryItem(db.Model):
    __tablename__ = 'inventory_items'
    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(db.Integer, db.ForeignKey('inventory_records.id'), nullable=False)
    item_type = db.Column(db.String(20), default='component')
    item_id = db.Column(db.Integer, nullable=False)
    item_name = db.Column(db.String(200), nullable=False)
    expected_quantity = db.Column(db.Float)
    actual_quantity = db.Column(db.Float)
    critical_norm = db.Column(db.Float)
    expiry_date = db.Column(db.Date, nullable=True)
    is_expired = db.Column(db.Boolean, default=False)
    is_below_critical = db.Column(db.Boolean, default=False)
    discrepancy = db.Column(db.Float, default=0.0)

    record = db.relationship('InventoryRecord', back_populates='items')

    def to_dict(self):
        return {
            'id': self.id,
            'item_type': self.item_type,
            'item_id': self.item_id,
            'item_name': self.item_name,
            'expected_quantity': self.expected_quantity,
            'actual_quantity': self.actual_quantity,
            'critical_norm': self.critical_norm,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'is_expired': self.is_expired,
            'is_below_critical': self.is_below_critical,
            'discrepancy': self.discrepancy
        }
