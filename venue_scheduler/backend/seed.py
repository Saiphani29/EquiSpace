from datetime import datetime, timedelta
from sqlmodel import Session, select, SQLModel
from database import engine, create_db_and_tables
from models import Venue, User, UserRole, Booking, BookingStatus, BookingType, Waitlist
from auth import get_password_hash

def seed_data():
    print("M.Tech Refinement: Expanding Eluru Venue Database...")
    # This forces the cloud DB to drop old tables and create new ones with the latest columns
    SQLModel.metadata.drop_all(engine)
    create_db_and_tables()
    
    with Session(engine) as session:
        # 1. Create Realistic Admins & Users with Andhra Names
        users = [
            {
                "name": "Rajesh Kumar (Municipal Admin)",
                "phone_number": "9999999999",
                "password_hash": get_password_hash("admin123"),
                "role": UserRole.GOVT_SUPER_ADMIN
            },
            {
                "name": "Venkatesh Rao",
                "phone_number": "9848012345",
                "password_hash": get_password_hash("user123"),
                "role": UserRole.CITIZEN
            },
            {
                "name": "Lakshmi Devi",
                "phone_number": "9848054321",
                "password_hash": get_password_hash("user123"),
                "role": UserRole.CITIZEN
            },
            {
                "name": "MLA Office (VIP)",
                "phone_number": "9000000001",
                "password_hash": get_password_hash("vip123"),
                "role": UserRole.VIP
            }
        ]

        for u_data in users:
            statement = select(User).where(User.phone_number == u_data["phone_number"])
            if not session.exec(statement).first():
                user = User(**u_data)
                session.add(user)
                print(f"User Initialized: {u_data['name']}")

        # 2. Expanded Eluru-Specific Venues with High-Quality Photos
        eluru_venues = [
            {
                "name": "Alluri Sitarama Raju (ASR) Stadium", 
                "location": "Powerpet, Eluru", 
                "latitude": 16.7126, 
                "longitude": 81.1014,
                "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200",
                "capacity": 5000,
                "requires_deposit": True,
                "deposit_amount": 500.0
            },
            {
                "name": "Helapuri Town Hall (Grand Pavilion)", 
                "location": "Pathebada, Eluru", 
                "latitude": 16.7150, 
                "longitude": 81.1050,
                "image_url": "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200",
                "capacity": 1200,
                "requires_deposit": True,
                "deposit_amount": 2000.0
            },
            {
                "name": "Municipal Community Center", 
                "location": "Sanivarapupeta, Eluru", 
                "latitude": 16.7200, 
                "longitude": 81.0900,
                "image_url": "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=1200",
                "capacity": 300
            },
            {
                "name": "Sri Krishna Devaraya Indoor Stadium", 
                "location": "RR Peta, Eluru", 
                "latitude": 16.7100, 
                "longitude": 81.1100,
                "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1200",
                "capacity": 400
            },
            {
                "name": "C.R. Reddy Exhibition Ground", 
                "location": "Vatluru, Eluru", 
                "latitude": 16.6900, 
                "longitude": 81.1500,
                "image_url": "https://images.unsplash.com/photo-1472653431158-6364773b2a56?auto=format&fit=crop&q=80&w=1200",
                "capacity": 4000
            },
            {
                "name": "Ammavari Grand Function Hall", 
                "location": "NR Peta, Eluru", 
                "latitude": 16.7140, 
                "longitude": 81.1020,
                "image_url": "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=1200",
                "capacity": 1000,
                "requires_deposit": True,
                "deposit_amount": 15000.0
            },
            {
                "name": "Gammadi Banquet Hall", 
                "location": "One-Town, Eluru", 
                "latitude": 16.7110, 
                "longitude": 81.1000,
                "image_url": "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=1200",
                "capacity": 500,
                "requires_deposit": True,
                "deposit_amount": 8000.0
            },
            {
                "name": "Railway Colony Sports Park", 
                "location": "Railway Station Rd, Eluru", 
                "latitude": 16.7050, 
                "longitude": 81.1150,
                "image_url": "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&q=80&w=1200",
                "capacity": 200
            },
            {
                "name": "Vatluru Public Pavilion", 
                "location": "Vatluru Junction, Eluru", 
                "latitude": 16.6850, 
                "longitude": 81.1600,
                "image_url": "https://images.unsplash.com/photo-1524331155110-e6396b653437?auto=format&fit=crop&q=80&w=1200",
                "capacity": 600
            },
            {
                "name": "Eluru Canal Side Walking Track & Plaza", 
                "location": "Canal Rd, Eluru", 
                "latitude": 16.7180, 
                "longitude": 81.1080,
                "image_url": "https://images.unsplash.com/photo-1549411283-933e8b4e724b?auto=format&fit=crop&q=80&w=1200",
                "capacity": 150
            }
        ]
        
        for v_data in eluru_venues:
            statement = select(Venue).where(Venue.name == v_data["name"])
            if not session.exec(statement).first():
                venue = Venue(**v_data)
                session.add(venue)
                print(f"Venue Registered: {v_data['name']} in Eluru")
        
        session.commit()

        # 3. Seed dummy bookings
        now = datetime.utcnow()

        venkatesh = session.exec(select(User).where(User.phone_number == "9848012345")).first()
        lakshmi   = session.exec(select(User).where(User.phone_number == "9848054321")).first()
        vip_user  = session.exec(select(User).where(User.phone_number == "9000000001")).first()
        admin     = session.exec(select(User).where(User.phone_number == "9999999999")).first()

        venues = session.exec(select(Venue)).all()
        # map names → objects for readability
        vmap = {v.name: v for v in venues}
        stadium    = vmap.get("Alluri Sitarama Raju (ASR) Stadium")
        town_hall  = vmap.get("Helapuri Town Hall (Grand Pavilion)")
        community  = vmap.get("Municipal Community Center")
        indoor     = vmap.get("Sri Krishna Devaraya Indoor Stadium")
        exhibition = vmap.get("C.R. Reddy Exhibition Ground")

        dummy_bookings = []

        if venkatesh and stadium:
            # Upcoming confirmed (tomorrow)
            dummy_bookings.append(Booking(
                user_id=venkatesh.id, venue_id=stadium.id,
                start_time=now + timedelta(days=1, hours=2),
                end_time=now + timedelta(days=1, hours=4),
                status=BookingStatus.CONFIRMED, booking_type=BookingType.STANDARD
            ))
            # Confirmed 3 days from now
            dummy_bookings.append(Booking(
                user_id=venkatesh.id, venue_id=community.id,
                start_time=now + timedelta(days=3, hours=5),
                end_time=now + timedelta(days=3, hours=7),
                status=BookingStatus.CONFIRMED, booking_type=BookingType.STANDARD
            ))
            # Completed (past)
            dummy_bookings.append(Booking(
                user_id=venkatesh.id, venue_id=indoor.id,
                start_time=now - timedelta(days=5, hours=3),
                end_time=now - timedelta(days=5, hours=1),
                status=BookingStatus.COMPLETED, booking_type=BookingType.STANDARD
            ))
            # No-show (past, gives a fair-play strike for realism)
            dummy_bookings.append(Booking(
                user_id=venkatesh.id, venue_id=town_hall.id,
                start_time=now - timedelta(days=10, hours=2),
                end_time=now - timedelta(days=10),
                status=BookingStatus.NO_SHOW, booking_type=BookingType.STANDARD
            ))
            venkatesh.fair_play_strikes = 1

        if lakshmi and exhibition:
            # Upcoming confirmed (day after tomorrow)
            dummy_bookings.append(Booking(
                user_id=lakshmi.id, venue_id=exhibition.id,
                start_time=now + timedelta(days=2, hours=3),
                end_time=now + timedelta(days=2, hours=6),
                status=BookingStatus.CONFIRMED, booking_type=BookingType.STANDARD
            ))
            # Cancelled past booking
            dummy_bookings.append(Booking(
                user_id=lakshmi.id, venue_id=community.id,
                start_time=now - timedelta(days=3, hours=4),
                end_time=now - timedelta(days=3, hours=2),
                status=BookingStatus.CANCELLED, booking_type=BookingType.STANDARD
            ))
            # Completed
            dummy_bookings.append(Booking(
                user_id=lakshmi.id, venue_id=stadium.id,
                start_time=now - timedelta(days=8, hours=6),
                end_time=now - timedelta(days=8, hours=4),
                status=BookingStatus.COMPLETED, booking_type=BookingType.STANDARD
            ))

        if vip_user and town_hall:
            # VIP upcoming booking
            dummy_bookings.append(Booking(
                user_id=vip_user.id, venue_id=town_hall.id,
                start_time=now + timedelta(days=4, hours=1),
                end_time=now + timedelta(days=4, hours=5),
                status=BookingStatus.CONFIRMED, booking_type=BookingType.VIP
            ))
            # VIP completed past
            dummy_bookings.append(Booking(
                user_id=vip_user.id, venue_id=stadium.id,
                start_time=now - timedelta(days=2, hours=3),
                end_time=now - timedelta(days=2, hours=1),
                status=BookingStatus.COMPLETED, booking_type=BookingType.VIP
            ))

        if admin and stadium:
            # Government override (admin cancelled a slot)
            dummy_bookings.append(Booking(
                user_id=admin.id, venue_id=stadium.id,
                start_time=now + timedelta(days=6, hours=9),
                end_time=now + timedelta(days=6, hours=13),
                status=BookingStatus.OVERRIDDEN, booking_type=BookingType.GOVT_OVERRIDE,
                override_reason="Reserved for District Collector's official programme — Order No. DC/ELR/2024/007",
                overridden_by_user_id=admin.id
            ))

        for b in dummy_bookings:
            session.add(b)
            print(f"Booking seeded: user_id={b.user_id} venue_id={b.venue_id} status={b.status}")

        # 4. Seed a waitlist entry for Lakshmi
        if lakshmi and town_hall:
            existing_wl = session.exec(
                select(Waitlist).where(Waitlist.user_id == lakshmi.id, Waitlist.venue_id == town_hall.id)
            ).first()
            if not existing_wl:
                wl = Waitlist(
                    user_id=lakshmi.id, venue_id=town_hall.id,
                    requested_start=now + timedelta(days=4, hours=1),
                    requested_end=now + timedelta(days=4, hours=5),
                    queue_position=1
                )
                session.add(wl)
                print(f"Waitlist entry seeded: Lakshmi waiting for Town Hall")

        session.commit()
        print("M.Tech Refinement: Eluru Expansion Sequence Terminated Successfully.")

if __name__ == "__main__":
    seed_data()
