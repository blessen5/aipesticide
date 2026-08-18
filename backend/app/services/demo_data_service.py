"""
Demo data seeding service for AgriPrescribe Demo Mode.

Generates a fully self-contained, offline demo dataset with:
- 1 primary demo field (Ludhiana Wheat Farm)
- 4 farm management zones (North Plot, East Hotspot, South Sector, West Orchard)
- 24 demo plants with varied infection levels
- AI detection results for every plant
- Generated prescriptions for every plant
- Pre-seeded spray history for treated plants
- Inline SVG plant images (no internet required)
"""
import random
import base64
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import (
    User, Field, Zone, ZoneHardwareMapping, HardwareNode, Valve,
    Plant, Detection, Prescription, SprayEvent, SprayerState,
    TreatmentProduct, StorageRecord
)
from app.services.prescription_service import prescription_engine


# ──────────────────────────────────────────────
# Inline SVG plant images (offline, no internet)
# ──────────────────────────────────────────────

def _svg_to_data_uri(svg: str) -> str:
    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"


def _make_plant_svg(color: str, label: str, infection_pct: float) -> str:
    """Generate a simple plant SVG for demo display — no external fetch needed."""
    bar_width = int(infection_pct * 1.5)  # max 150px for 100%
    bar_color = "#ef4444" if infection_pct > 50 else "#f59e0b" if infection_pct > 15 else "#22c55e"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#0f172a"/>
  <!-- Soil -->
  <rect x="0" y="220" width="400" height="80" fill="#1e1207"/>
  <!-- Stem -->
  <rect x="196" y="120" width="8" height="100" fill="#15803d"/>
  <!-- Leaves -->
  <ellipse cx="150" cy="160" rx="55" ry="22" fill="{color}" transform="rotate(-20 150 160)"/>
  <ellipse cx="250" cy="145" rx="55" ry="22" fill="{color}" transform="rotate(20 250 145)"/>
  <ellipse cx="170" cy="130" rx="45" ry="18" fill="{color}" transform="rotate(-10 170 130)"/>
  <!-- Disease spots if infected -->
  {"".join([f'<circle cx="{random.randint(140,260)}" cy="{random.randint(125,175)}" r="{random.randint(4,9)}" fill="#78350f" opacity="0.7"/>' for _ in range(int(infection_pct / 12))]) if infection_pct > 5 else ""}
  <!-- Label -->
  <rect x="10" y="10" width="200" height="36" rx="6" fill="#1e293b" opacity="0.9"/>
  <text x="20" y="33" font-family="monospace" font-size="14" fill="#f1f5f9">{label}</text>
  <!-- Infection bar -->
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


# ──────────────────────────────────────────────
# 24 deterministic demo plants across field
# (plant_code, dlat, dlng, crop, status, inf_pct, disease, severity)
# ──────────────────────────────────────────────
DEMO_PLANT_SPECS = [
    ("WHEAT-001", 0.0000, 0.0000, "Wheat", "HEALTHY",   0.0,  "Healthy Crop",                              "HEALTHY"),
    ("WHEAT-002", 0.0005, 0.0008, "Wheat", "LOW",        8.5, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
    ("WHEAT-003", 0.0010, 0.0002, "Wheat", "MODERATE",  34.0, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
    ("WHEAT-004", 0.0003, 0.0012, "Wheat", "HIGH",      68.5, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
    ("WHEAT-005", 0.0008, 0.0005, "Wheat", "LOW",       12.0, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
    ("WHEAT-006", 0.0015, 0.0010, "Wheat", "HIGH",      82.0, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
    ("WHEAT-007", 0.0002, 0.0018, "Wheat", "HEALTHY",   0.0,  "Healthy Crop",                              "HEALTHY"),
    ("WHEAT-008", 0.0012, 0.0007, "Wheat", "MODERATE",  41.5, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
    ("WHEAT-009", 0.0007, 0.0015, "Wheat", "LOW",       19.0, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
    ("WHEAT-010", 0.0018, 0.0003, "Wheat", "HEALTHY",   0.0,  "Healthy Crop",                              "HEALTHY"),
    ("WHEAT-011", 0.0004, 0.0020, "Wheat", "HIGH",      74.0, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
    ("WHEAT-012", 0.0014, 0.0014, "Wheat", "MODERATE",  28.0, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
    ("WHEAT-013", 0.0009, 0.0022, "Wheat", "LOW",       15.0, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
    ("WHEAT-014", 0.0017, 0.0009, "Wheat", "HEALTHY",   0.0,  "Healthy Crop",                              "HEALTHY"),
    ("WHEAT-015", 0.0012, 0.0016, "Wheat", "MODERATE",  31.0, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
    ("WHEAT-016", 0.0019, 0.0011, "Wheat", "HIGH",      59.0, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
    ("WHEAT-017", 0.0014, 0.0018, "Wheat", "LOW",        6.0, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
    ("WHEAT-018", 0.0021, 0.0013, "Wheat", "HEALTHY",   0.0,  "Healthy Crop",                              "HEALTHY"),
    ("WHEAT-019", 0.0016, 0.0020, "Wheat", "MODERATE",  47.5, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
    ("WHEAT-020", 0.0023, 0.0015, "Wheat", "HIGH",      91.0, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
    ("WHEAT-021", 0.0018, 0.0022, "Wheat", "LOW",       23.0, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
    ("WHEAT-022", 0.0025, 0.0017, "Wheat", "HEALTHY",   0.0,  "Healthy Crop",                              "HEALTHY"),
    ("WHEAT-023", 0.0020, 0.0024, "Wheat", "MODERATE",  38.0, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
    ("WHEAT-024", 0.0027, 0.0019, "Wheat", "HIGH",      77.0, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
]


def seed_demo_data(db: Session, force_reseed: bool = False) -> dict:
    """
    Seeds or re-seeds the demo dataset including fields, zones, and plants.
    """
    field_exists = db.query(Field).first()
    zones_exist = db.query(Zone).count() > 0

    if not force_reseed and field_exists and zones_exist:
        return {
            "message": "Demo data already exists.",
            "seeded": False,
            "fields_count": db.query(Field).count(),
            "zones_count": db.query(Zone).count(),
            "plants_count": db.query(Plant).count(),
            "prescriptions_count": db.query(Prescription).count(),
            "spray_events_count": db.query(SprayEvent).count(),
        }

    # Wipe all existing demo data if force_reseed or incomplete seed
    if force_reseed or not zones_exist:
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
        name="Ramesh Patel — Demo Farmer",
        email="demo@agriprescribe.in",
        role="Farmer",
    )
    db.add(user)
    db.flush()

    # ── 2. Primary Demo Field (Ludhiana, Punjab) ──
    demo_field = Field(
        user_id=user.id,
        name="Ludhiana Green Valley — Demo Field",
        crop_type="Wheat",
        area=3.2,
        latitude=30.9010,
        longitude=75.8573,
    )
    db.add(demo_field)
    db.flush()

    # ── 3. Farm Management Zones ──────────────────
    z1 = Zone(
        field_id=demo_field.id,
        name="Zone A (North Plot)",
        latitude=30.9015,
        longitude=75.8570,
        crop="Wheat",
        crop_stage="Vegetative",
        irrigation_method="Drip",
        nozzle_type="Hollow Cone",
        status="HEALTHY"
    )
    z2 = Zone(
        field_id=demo_field.id,
        name="Zone B (East Hotspot)",
        latitude=30.9010,
        longitude=75.8580,
        crop="Wheat",
        crop_stage="Vegetative",
        irrigation_method="Drip",
        nozzle_type="Air Induction",
        status="HIGH"
    )
    z3 = Zone(
        field_id=demo_field.id,
        name="Zone C (South Sector)",
        latitude=30.9005,
        longitude=75.8573,
        crop="Wheat",
        crop_stage="Flowering",
        irrigation_method="Sprinkler",
        nozzle_type="Twin Fan",
        status="MODERATE"
    )
    z4 = Zone(
        field_id=demo_field.id,
        name="Zone D (West Orchard)",
        latitude=30.9010,
        longitude=75.8565,
        crop="Wheat",
        crop_stage="Tillering",
        irrigation_method="Drip",
        nozzle_type="Flat Fan",
        status="LOW"
    )
    db.add_all([z1, z2, z3, z4])
    db.flush()

    demo_zones = [z1, z2, z3, z4]

    # Hardware Node & Valves
    h_node = HardwareNode(
        node_id="NODE-ESP32-FIELD-01",
        online=True,
        pump_state="OFF",
        pressure_status="NORMAL",
        flow_status="NORMAL",
        firmware_version="v2.4.1"
    )
    db.add(h_node)
    db.flush()

    for idx, z in enumerate(demo_zones):
        v = Valve(node_id=h_node.id, valve_id=f"V{idx+1}", state="CLOSED")
        db.add(v)
        db.flush()

        mapping = ZoneHardwareMapping(
            zone_id=z.id,
            node_id=h_node.node_id,
            valve_id=v.valve_id,
            nozzle_id=f"NOZZLE-{z.nozzle_type.replace(' ', '-').upper()}",
            application_geometry="BOOM_SECTION",
            enabled=True
        )
        db.add(mapping)

    # ── 4. Create 24 Plants ───────────────────────
    created_plants: list[Plant] = []
    random.seed(42)  # deterministic for demo reproducibility

    for i, (code, dlat, dlng, crop, status, inf_pct, disease, severity) in enumerate(DEMO_PLANT_SPECS):
        assigned_zone = demo_zones[i % len(demo_zones)]
        p = Plant(
            field_id=demo_field.id,
            plant_code=code,
            latitude=round(demo_field.latitude + dlat, 6),
            longitude=round(demo_field.longitude + dlng, 6),
            crop_type=crop,
            status=status,
            infection_percentage=inf_pct,
            disease=disease,
            severity=severity,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 7)),
        )
        db.add(p)
        created_plants.append(p)

    db.flush()

    # ── 5. Detections, Prescriptions & Spray Events ──
    spray_events_seeded = 0
    for i, p in enumerate(created_plants):
        assigned_zone = demo_zones[i % len(demo_zones)]
        confidence = 0.99 if p.severity == "HEALTHY" else round(random.uniform(0.88, 0.97), 2)

        # Detection with offline SVG image
        det = Detection(
            plant_id=p.id,
            zone_id=assigned_zone.id,
            image_url=_plant_image(p.severity, p.plant_code, p.infection_percentage),
            disease=p.disease,
            confidence=confidence,
            infection_percentage=p.infection_percentage,
            severity=p.severity,
            analyzed_at=datetime.utcnow() - timedelta(hours=random.randint(2, 36)),
        )
        db.add(det)

        # Prescription
        rx_data = prescription_engine.generate(
            severity=p.severity,
            disease=p.disease,
            infection_percentage=p.infection_percentage,
            crop_type=p.crop_type,
            plant_id=p.id,
        )
        presc = Prescription(
            plant_id=p.id,
            zone_id=assigned_zone.id,
            crop_type=p.crop_type,
            disease=rx_data["disease"],
            infection_percentage=rx_data["infection_percentage"],
            severity=rx_data["severity"],
            recommended_action=rx_data["recommended_action"],
            spray_level=rx_data["spray_level"],
            recommended_volume_ml=rx_data["recommended_volume_ml"],
            priority=rx_data["priority"],
            reason=rx_data.get("reason", ""),
            hardware_node_id=h_node.node_id,
            valve_id=f"V{(i % len(demo_zones)) + 1}",
            created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
        )
        db.add(presc)

        # Pre-seeded spray history for treated plants (makes analytics non-zero)
        if p.severity in ("MODERATE", "HIGH"):
            spray = SprayEvent(
                command_id=f"DEMO-SEED-{p.plant_code}",
                plant_id=p.id,
                volume_ml=rx_data["recommended_volume_ml"],
                status="COMPLETED",
                mode="SIMULATED",
                timestamp=datetime.utcnow() - timedelta(hours=random.randint(1, 12)),
            )
            db.add(spray)
            spray_events_seeded += 1

    # ── 6. Sprayer State ──────────────────────────
    sprayer_state = SprayerState(
        status="READY",
        mode="SIMULATED",
        battery_level=94,
        fluid_level_pct=88,
        last_updated=datetime.utcnow(),
    )
    db.add(sprayer_state)

    db.commit()

    return {
        "message": "✅ Demo data seeded successfully with zones!",
        "seeded": True,
        "demo_field": demo_field.name,
        "demo_field_id": demo_field.id,
        "fields_count": db.query(Field).count(),
        "zones_count": db.query(Zone).count(),
        "plants_count": db.query(Plant).count(),
        "prescriptions_count": db.query(Prescription).count(),
        "spray_events_count": db.query(SprayEvent).count(),
    }
