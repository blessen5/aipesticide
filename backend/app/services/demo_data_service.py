"""
Demo data seeding service for AgriPrescribe Demo Mode.

Generates a rich, multi-field farm dataset with:
- 5 active agricultural fields across diverse crops (Wheat, Rice, Tomato, Cotton, Corn)
- 18 management zones with individual soil/irrigation/nozzle characteristics
- 40+ demo plants with real-time AI diagnosis & prescriptions
- Hardware telemetry mappings for ESP32 precision spot-spraying
"""
import random
import base64
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import (
    User, Field, Zone, ZoneHardwareMapping, HardwareNode, Valve,
    Plant, Detection, Prescription, SprayEvent, SprayerState
)
from app.services.prescription_service import prescription_engine


# ──────────────────────────────────────────────
# Inline SVG plant images (offline, no internet)
# ──────────────────────────────────────────────

def _svg_to_data_uri(svg: str) -> str:
    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"


def _make_plant_svg(color: str, label: str, infection_pct: float) -> str:
    """Generate a simple plant SVG for demo display."""
    bar_width = int(infection_pct * 1.5)
    bar_color = "#ef4444" if infection_pct > 50 else "#f59e0b" if infection_pct > 15 else "#22c55e"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#0f172a"/>
  <rect x="0" y="220" width="400" height="80" fill="#1e1207"/>
  <rect x="196" y="120" width="8" height="100" fill="#15803d"/>
  <ellipse cx="150" cy="160" rx="55" ry="22" fill="{color}" transform="rotate(-20 150 160)"/>
  <ellipse cx="250" cy="145" rx="55" ry="22" fill="{color}" transform="rotate(20 250 145)"/>
  <ellipse cx="170" cy="130" rx="45" ry="18" fill="{color}" transform="rotate(-10 170 130)"/>
  {"".join([f'<circle cx="{random.randint(140,260)}" cy="{random.randint(125,175)}" r="{random.randint(4,9)}" fill="#78350f" opacity="0.7"/>' for _ in range(int(infection_pct / 12))]) if infection_pct > 5 else ""}
  <rect x="10" y="10" width="200" height="36" rx="6" fill="#1e293b" opacity="0.9"/>
  <text x="20" y="33" font-family="monospace" font-size="14" fill="#f1f5f9">{label}</text>
  <rect x="10" y="260" width="150" height="12" rx="3" fill="#334155"/>
  <rect x="10" y="260" width="{bar_width}" height="12" rx="3" fill="{bar_color}"/>
  <text x="170" y="272" font-family="monospace" font-size="11" fill="#94a3b8">Inf: {infection_pct:.0f}%</text>
</svg>"""


HEALTHY_COLOR = "#16a34a"
LOW_COLOR = "#ca8a04"
MOD_COLOR = "#ea580c"
HIGH_COLOR = "#dc2626"


def _plant_image(severity: str, label: str, inf_pct: float) -> str:
    color = {
        "HEALTHY": HEALTHY_COLOR,
        "LOW": LOW_COLOR,
        "MODERATE": MOD_COLOR,
        "HIGH": HIGH_COLOR,
    }.get(severity, HEALTHY_COLOR)
    return _svg_to_data_uri(_make_plant_svg(color, label, inf_pct))


FIELDS_DATA = [
    {
        "name": "Ludhiana Green Valley (Primary)",
        "crop_type": "Wheat",
        "area": 3.2,
        "latitude": 30.9010,
        "longitude": 75.8573,
        "zones": [
            {"name": "Zone A (North Plot)", "crop": "Wheat", "stage": "Tillering", "irrig": "Drip", "nozzle": "Hollow Cone", "status": "HEALTHY", "dlat": 0.0005, "dlng": -0.0003},
            {"name": "Zone B (East Hotspot)", "crop": "Wheat", "stage": "Stem Elongation", "irrig": "Drip", "nozzle": "Air Induction", "status": "HIGH", "dlat": 0.0000, "dlng": 0.0007},
            {"name": "Zone C (South Sector)", "crop": "Wheat", "stage": "Flowering", "irrig": "Sprinkler", "nozzle": "Twin Fan", "status": "MODERATE", "dlat": -0.0005, "dlng": 0.0000},
            {"name": "Zone D (West Orchard)", "crop": "Wheat", "stage": "Ripening", "irrig": "Drip", "nozzle": "Flat Fan", "status": "LOW", "dlat": 0.0000, "dlng": -0.0008},
        ],
        "plants": [
            ("WHEAT-001", 0.0000, 0.0000, "Wheat", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
            ("WHEAT-002", 0.0005, 0.0008, "Wheat", "LOW", 8.5, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
            ("WHEAT-003", 0.0010, 0.0002, "Wheat", "MODERATE", 34.0, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
            ("WHEAT-004", 0.0003, 0.0012, "Wheat", "HIGH", 68.5, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
            ("WHEAT-005", 0.0008, 0.0005, "Wheat", "LOW", 12.0, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
            ("WHEAT-006", 0.0015, 0.0010, "Wheat", "HIGH", 82.0, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
            ("WHEAT-007", 0.0002, 0.0018, "Wheat", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
            ("WHEAT-008", 0.0012, 0.0007, "Wheat", "MODERATE", 41.5, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
            ("WHEAT-009", 0.0007, 0.0015, "Wheat", "LOW", 19.0, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
            ("WHEAT-010", 0.0018, 0.0003, "Wheat", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
        ]
    },
    {
        "name": "Karnal Basmati Rice Estate",
        "crop_type": "Rice",
        "area": 4.5,
        "latitude": 29.6857,
        "longitude": 76.9905,
        "zones": [
            {"name": "Paddy Block 1 (Canal Fed)", "crop": "Rice", "stage": "Tillering", "irrig": "Flood/Canal", "nozzle": "Air Induction", "status": "HEALTHY", "dlat": 0.0006, "dlng": 0.0004},
            {"name": "Paddy Block 2 (Submerged Basin)", "crop": "Rice", "stage": "Panicle Initiation", "irrig": "Submerged", "nozzle": "Extended Range", "status": "MODERATE", "dlat": -0.0004, "dlng": 0.0005},
            {"name": "Nursery Sector North", "crop": "Rice", "stage": "Seedling", "irrig": "Micro-Sprinkler", "nozzle": "Deflector", "status": "LOW", "dlat": 0.0008, "dlng": -0.0005},
            {"name": "Border Levee Zone", "crop": "Rice", "stage": "Vegetative", "irrig": "Furrow", "nozzle": "Flat Fan", "status": "HIGH", "dlat": -0.0005, "dlng": -0.0004},
        ],
        "plants": [
            ("RICE-001", 0.0002, 0.0003, "Rice", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
            ("RICE-002", 0.0005, 0.0006, "Rice", "MODERATE", 38.0, "Rice Bacterial Leaf Blight (Xanthomonas oryzae)", "MODERATE"),
            ("RICE-003", -0.0003, 0.0004, "Rice", "HIGH", 76.0, "Rice Blast (Magnaporthe oryzae)", "HIGH"),
            ("RICE-004", 0.0007, -0.0002, "Rice", "LOW", 14.0, "Rice Brown Spot", "LOW"),
            ("RICE-005", -0.0002, -0.0005, "Rice", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
            ("RICE-006", 0.0001, 0.0008, "Rice", "HIGH", 88.0, "Rice Bacterial Leaf Blight (Xanthomonas oryzae)", "HIGH"),
        ]
    },
    {
        "name": "Nashik Solanaceous Tomato Farm",
        "crop_type": "Tomato",
        "area": 2.8,
        "latitude": 19.9975,
        "longitude": 73.7898,
        "zones": [
            {"name": "Polyhouse Alpha (Protected)", "crop": "Tomato", "stage": "Fruit Formation", "irrig": "Drip Fertigation", "nozzle": "Hollow Cone", "status": "HEALTHY", "dlat": 0.0004, "dlng": 0.0002},
            {"name": "Open Ridge Plot 1", "crop": "Tomato", "stage": "Flowering", "irrig": "Drip", "nozzle": "Air Induction", "status": "HIGH", "dlat": -0.0003, "dlng": 0.0004},
            {"name": "Drip Line Sector South", "crop": "Tomato", "stage": "Vegetative", "irrig": "Drip", "nozzle": "Twin Fan", "status": "MODERATE", "dlat": -0.0006, "dlng": -0.0003},
        ],
        "plants": [
            ("TOM-001", 0.0001, 0.0001, "Tomato", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
            ("TOM-002", -0.0002, 0.0003, "Tomato", "HIGH", 64.0, "Tomato Early Blight (Alternaria solani)", "HIGH"),
            ("TOM-003", -0.0005, -0.0002, "Tomato", "MODERATE", 29.0, "Tomato Late Blight", "MODERATE"),
            ("TOM-004", 0.0003, 0.0004, "Tomato", "LOW", 11.0, "Tomato Leaf Mold", "LOW"),
            ("TOM-005", -0.0001, 0.0006, "Tomato", "HIGH", 83.0, "Tomato Early Blight (Alternaria solani)", "HIGH"),
        ]
    },
    {
        "name": "Surat Bt-Cotton Agro Park",
        "crop_type": "Cotton",
        "area": 5.0,
        "latitude": 21.1702,
        "longitude": 72.8311,
        "zones": [
            {"name": "High Density Sector A", "crop": "Cotton", "stage": "Boll Formation", "irrig": "Drip", "nozzle": "Air Induction", "status": "MODERATE", "dlat": 0.0005, "dlng": 0.0005},
            {"name": "Furrow Irrigated Zone B", "crop": "Cotton", "stage": "Squaring", "irrig": "Furrow", "nozzle": "Deflector", "status": "LOW", "dlat": -0.0004, "dlng": 0.0003},
            {"name": "Windbreak Border Strip", "crop": "Cotton", "stage": "Vegetative", "irrig": "Sprinkler", "nozzle": "Twin Fan", "status": "HIGH", "dlat": 0.0008, "dlng": -0.0006},
            {"name": "Central Pivot Block", "crop": "Cotton", "stage": "Boll Opening", "irrig": "Center Pivot", "nozzle": "Hollow Cone", "status": "HEALTHY", "dlat": 0.0000, "dlng": -0.0002},
        ],
        "plants": [
            ("COT-001", 0.0003, 0.0004, "Cotton", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
            ("COT-002", 0.0006, -0.0005, "Cotton", "HIGH", 71.0, "Cotton Bacterial Blight (Xanthomonas)", "HIGH"),
            ("COT-003", -0.0003, 0.0002, "Cotton", "MODERATE", 35.0, "Cotton Leaf Curl Virus", "MODERATE"),
            ("COT-004", -0.0005, -0.0004, "Cotton", "LOW", 16.0, "Cotton Grey Mildew", "LOW"),
            ("COT-005", 0.0001, -0.0001, "Cotton", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
        ]
    },
    {
        "name": "Indore Golden Corn Reserve",
        "crop_type": "Corn",
        "area": 3.8,
        "latitude": 22.7196,
        "longitude": 75.8577,
        "zones": [
            {"name": "Pivot Center Zone", "crop": "Corn", "stage": "Silking", "irrig": "Center Pivot", "nozzle": "Air Induction", "status": "HEALTHY", "dlat": 0.0002, "dlng": 0.0002},
            {"name": "East Drip Block", "crop": "Corn", "stage": "Tasseling", "irrig": "Drip", "nozzle": "Flat Fan", "status": "HIGH", "dlat": 0.0001, "dlng": 0.0006},
            {"name": "South Silage Basin", "crop": "Corn", "stage": "Grain Filling", "irrig": "Sprinkler", "nozzle": "Twin Fan", "status": "MODERATE", "dlat": -0.0005, "dlng": 0.0001},
        ],
        "plants": [
            ("CORN-001", 0.0001, 0.0001, "Corn", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
            ("CORN-002", 0.0001, 0.0005, "Corn", "HIGH", 84.0, "Corn Northern Leaf Blight (Exserohilum turcicum)", "HIGH"),
            ("CORN-003", -0.0004, 0.0001, "Corn", "MODERATE", 33.0, "Corn Common Rust (Puccinia sorghi)", "MODERATE"),
            ("CORN-004", 0.0003, 0.0002, "Corn", "LOW", 9.0, "Corn Gray Leaf Spot", "LOW"),
        ]
    }
]


def seed_demo_data(db: Session, force_reseed: bool = False) -> dict:
    """
    Seeds or re-seeds the multi-field agricultural dataset.
    """
    field_count = db.query(Field).count()

    if not force_reseed and field_count >= len(FIELDS_DATA):
        return {
            "message": "Multi-field demo data already exists.",
            "seeded": False,
            "fields_count": db.query(Field).count(),
            "zones_count": db.query(Zone).count(),
            "plants_count": db.query(Plant).count(),
            "prescriptions_count": db.query(Prescription).count(),
            "spray_events_count": db.query(SprayEvent).count(),
        }

    # Wipe all existing demo data
    db.query(SprayEvent).delete()
    db.query(Prescription).delete()
    db.query(Detection).delete()
    db.query(Plant).delete()
    db.query(ZoneHardwareMapping).delete()
    db.query(Zone).delete()
    db.query(Valve).delete()
    db.query(HardwareNode).delete()
    db.query(SprayerState).delete()
    db.query(Field).delete()
    db.query(User).delete()
    db.commit()

    # ── 1. Demo User ─────────────────────────────
    user = User(
        name="Ramesh Patel — Progressive Farmer",
        email="farmer@agriprescribe.in",
        role="Farmer",
    )
    db.add(user)
    db.flush()

    # ── 2. Create Fields, Zones, Plants & Telemetry ──
    random.seed(42)

    for f_idx, f_info in enumerate(FIELDS_DATA):
        f = Field(
            user_id=user.id,
            name=f_info["name"],
            crop_type=f_info["crop_type"],
            area=f_info["area"],
            latitude=f_info["latitude"],
            longitude=f_info["longitude"],
        )
        db.add(f)
        db.flush()

        # Create Zones
        created_zones = []
        for z_info in f_info["zones"]:
            zone = Zone(
                field_id=f.id,
                name=z_info["name"],
                latitude=round(f.latitude + z_info["dlat"], 6),
                longitude=round(f.longitude + z_info["dlng"], 6),
                crop=z_info["crop"],
                crop_stage=z_info["stage"],
                irrigation_method=z_info["irrig"],
                nozzle_type=z_info["nozzle"],
                status=z_info["status"]
            )
            db.add(zone)
            created_zones.append(zone)
        db.flush()

        # Hardware Node for field
        node = HardwareNode(
            node_id=f"NODE-ESP32-F0{f_idx+1}",
            online=True,
            pump_state="OFF",
            pressure_status="NORMAL",
            flow_status="NORMAL",
            firmware_version="v2.4.1"
        )
        db.add(node)
        db.flush()

        for z_idx, z in enumerate(created_zones):
            valv = Valve(node_id=node.id, valve_id=f"V{z_idx+1}", state="CLOSED")
            db.add(valv)
            db.flush()

            mapping = ZoneHardwareMapping(
                zone_id=z.id,
                node_id=node.node_id,
                valve_id=valv.valve_id,
                nozzle_id=f"NOZZLE-{z.nozzle_type.replace(' ', '-').upper()}",
                application_geometry="BOOM_SECTION",
                enabled=True
            )
            db.add(mapping)

        # Plants for this field
        for p_idx, (code, dlat, dlng, crop, status, inf_pct, disease, severity) in enumerate(f_info["plants"]):
            assigned_zone = created_zones[p_idx % len(created_zones)]
            plant = Plant(
                field_id=f.id,
                plant_code=code,
                latitude=round(f.latitude + dlat, 6),
                longitude=round(f.longitude + dlng, 6),
                crop_type=crop,
                status=status,
                infection_percentage=inf_pct,
                disease=disease,
                severity=severity,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 5)),
            )
            db.add(plant)
            db.flush()

            # Detection
            confidence = 0.99 if severity == "HEALTHY" else round(random.uniform(0.88, 0.98), 2)
            det = Detection(
                plant_id=plant.id,
                zone_id=assigned_zone.id,
                image_url=_plant_image(severity, code, inf_pct),
                disease=disease,
                confidence=confidence,
                infection_percentage=inf_pct,
                severity=severity,
                analyzed_at=datetime.utcnow() - timedelta(hours=random.randint(2, 24)),
            )
            db.add(det)

            # Prescription
            rx_data = prescription_engine.generate(
                severity=severity,
                disease=disease,
                infection_percentage=inf_pct,
                crop_type=crop,
                plant_id=plant.id,
            )
            presc = Prescription(
                plant_id=plant.id,
                zone_id=assigned_zone.id,
                crop_type=crop,
                disease=rx_data["disease"],
                infection_percentage=rx_data["infection_percentage"],
                severity=rx_data["severity"],
                recommended_action=rx_data["recommended_action"],
                spray_level=rx_data["spray_level"],
                recommended_volume_ml=rx_data["recommended_volume_ml"],
                priority=rx_data["priority"],
                reason=rx_data.get("reason", ""),
                hardware_node_id=node.node_id,
                valve_id=f"V{(p_idx % len(created_zones)) + 1}",
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 18)),
            )
            db.add(presc)

            # Spray history for infected plants
            if severity in ("MODERATE", "HIGH"):
                spray = SprayEvent(
                    command_id=f"CMD-{code}",
                    plant_id=plant.id,
                    volume_ml=rx_data["recommended_volume_ml"],
                    status="COMPLETED",
                    mode="SIMULATED",
                    timestamp=datetime.utcnow() - timedelta(hours=random.randint(1, 8)),
                )
                db.add(spray)

    # ── 3. Sprayer State ──────────────────────────
    sprayer_state = SprayerState(
        status="READY",
        mode="SIMULATED",
        battery_level=95,
        fluid_level_pct=90,
        last_updated=datetime.utcnow(),
    )
    db.add(sprayer_state)

    db.commit()

    return {
        "message": "✅ Multi-field active dataset seeded successfully!",
        "seeded": True,
        "fields_count": db.query(Field).count(),
        "zones_count": db.query(Zone).count(),
        "plants_count": db.query(Plant).count(),
        "prescriptions_count": db.query(Prescription).count(),
        "spray_events_count": db.query(SprayEvent).count(),
    }
