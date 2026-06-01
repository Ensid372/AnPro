from app import create_app
from models import db, User, Component, ReadyMedicine, TechCard, TechCardComponent
from datetime import date, timedelta

def seed():
    app = create_app()
    with app.app_context():
        db.create_all()

        if User.query.count() > 0:
            print('БД уже инициализирована.')
            return

        users_data = [
            ('admin', 'admin123', 'Администратор Системы', 'admin'),
            ('provizor1', 'pass123', 'Иванова Мария Петровна', 'provizor'),
            ('provizor2', 'pass123', 'Сидоров Алексей Иванович', 'provizor'),
            ('technolog', 'pass123', 'Козлова Анна Сергеевна', 'provizor_technolog'),
            ('manager', 'pass123', 'Петров Дмитрий Александрович', 'rukovoditel'),
        ]
        for uname, pwd, fname, role in users_data:
            u = User(username=uname, full_name=fname, role=role)
            u.set_password(pwd)
            db.session.add(u)

        today = date.today()
        components_data = [
            ('Спирт этиловый 96%', 'мл', 500.0, 100.0, today + timedelta(days=365)),
            ('Вода очищенная', 'мл', 2000.0, 500.0, today + timedelta(days=30)),
            ('Глицерин', 'мл', 300.0, 50.0, today + timedelta(days=180)),
            ('Ментол', 'г', 50.0, 10.0, today + timedelta(days=730)),
            ('Анестезин', 'г', 20.0, 5.0, today + timedelta(days=365)),
            ('Стрептоцид', 'г', 30.0, 10.0, today + timedelta(days=400)),
            ('Окись цинка', 'г', 15.0, 20.0, today + timedelta(days=1000)),  
            ('Вазелин', 'г', 200.0, 50.0, today + timedelta(days=500)),
            ('Натрия хлорид', 'г', 100.0, 30.0, today + timedelta(days=365)),
            ('Кислота борная', 'г', 25.0, 10.0, today - timedelta(days=5)),  
            ('Парафин жидкий', 'мл', 150.0, 30.0, today + timedelta(days=600)),
            ('Крахмал картофельный', 'г', 80.0, 20.0, today + timedelta(days=300)),
        ]
        comps = []
        for name, unit, qty, norm, exp in components_data:
            c = Component(name=name, unit=unit, quantity=qty, critical_norm=norm, expiry_date=exp)
            db.session.add(c)
            comps.append(c)

        ready_data = [
            ('Аспирин 500мг №10', 'tablet', 25.0, 'уп', 5.0, today + timedelta(days=730), 'Байер'),
            ('Парацетамол 500мг №20', 'tablet', 3.0, 'уп', 5.0, today + timedelta(days=500), 'Фармстандарт'),
            ('Ибупрофен 400мг №10', 'tablet', 8.0, 'уп', 3.0, today + timedelta(days=600), 'Биосинтез'),
            ('Цинковая мазь 25г', 'ointment', 12.0, 'туб', 5.0, today + timedelta(days=365), 'Авексима'),
            ('Настойка календулы 25мл', 'tincture', 6.0, 'фл', 3.0, today + timedelta(days=400), 'Красногорсклексредства'),
        ]
        for name, mtype, qty, unit, norm, exp, manuf in ready_data:
            m = ReadyMedicine(name=name, medicine_type=mtype, quantity=qty, unit=unit,
                              critical_norm=norm, expiry_date=exp, manufacturer=manuf)
            db.session.add(m)

        db.session.flush()

        card1 = TechCard(
            tech_id='TC-0001',
            medicine_name='Микстура от кашля',
            medicine_type='mixture',
            usage_method='internal',
            preparation_method=(
                '1. Отмерить 150 мл воды очищенной.\n'
                '2. Растворить 2 г натрия хлорида при перемешивании.\n'
                '3. Добавить 10 мл глицерина, перемешать.\n'
                '4. Профильтровать через фильтровальную бумагу.\n'
                '5. Перелить во флакон тёмного стекла.\n'
                '6. Оформить этикетку: «Внутреннее. Хранить в прохладном месте».'
            ),
            preparation_time_min=45
        )
        db.session.add(card1)
        db.session.flush()

        card2 = TechCard(
            tech_id='TC-0002',
            medicine_name='Мазь цинковая 10%',
            medicine_type='ointment',
            usage_method='external',
            preparation_method=(
                '1. Взвесить 10 г окиси цинка, измельчить до однородного порошка.\n'
                '2. Взвесить 90 г вазелина, расплавить на водяной бане при 50°C.\n'
                '3. Добавить окись цинка небольшими порциями, растирая.\n'
                '4. Перемешивать до полного охлаждения и получения однородной массы.\n'
                '5. Расфасовать в банки тёмного стекла по 25 г.\n'
                '6. Оформить этикетку: «Наружное».'
            ),
            preparation_time_min=60
        )
        db.session.add(card2)
        db.session.flush()

        card3 = TechCard(
            tech_id='TC-0003',
            medicine_name='Раствор борной кислоты 2%',
            medicine_type='solution',
            usage_method='external',
            preparation_method=(
                '1. Отмерить 200 мл воды очищенной, нагреть до 60°C.\n'
                '2. Растворить 4 г борной кислоты при нагревании и перемешивании.\n'
                '3. Охладить до комнатной температуры.\n'
                '4. Профильтровать через ватно-марлевый фильтр.\n'
                '5. Расфасовать во флаконы по 100 мл.\n'
                '6. Оформить этикетку: «Наружное».'
            ),
            preparation_time_min=30
        )
        db.session.add(card3)
        db.session.flush()

        # Компоненты для карты 1: микстура от кашля
        db.session.add(TechCardComponent(tech_card_id=card1.id, component_id=comps[1].id, required_quantity=150.0))  # Вода
        db.session.add(TechCardComponent(tech_card_id=card1.id, component_id=comps[8].id, required_quantity=2.0))   # Натрия хлорид
        db.session.add(TechCardComponent(tech_card_id=card1.id, component_id=comps[2].id, required_quantity=10.0))  # Глицерин

        # Компоненты для карты 2: мазь цинковая
        db.session.add(TechCardComponent(tech_card_id=card2.id, component_id=comps[6].id, required_quantity=10.0))  # Окись цинка
        db.session.add(TechCardComponent(tech_card_id=card2.id, component_id=comps[7].id, required_quantity=90.0))  # Вазелин

        # Компоненты для карты 3: раствор борной кислоты
        db.session.add(TechCardComponent(tech_card_id=card3.id, component_id=comps[9].id, required_quantity=4.0))   # Борная кислота
        db.session.add(TechCardComponent(tech_card_id=card3.id, component_id=comps[1].id, required_quantity=200.0)) # Вода

        db.session.commit()
        print('БД инициализирована успешно.')
        print()
        print('Тестовые учётные записи:')
        print('  admin / admin123 — Администратор')
        print('  provizor1 / pass123 — Провизор')
        print('  technolog / pass123 — Провизор-технолог')
        print('  manager / pass123 — Руководитель')

if __name__ == '__main__':
    seed()
