"""
Demo data seeding service for AgriPrescribe SIH 2026 Demo Mode.

Generates a fully self-contained, offline demo dataset with:
- 1 primary demo field (Ludhiana Wheat Farm)
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
from app.models.models import User, Field, Plant, Detection, Prescription, SprayEvent, SprayerState
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


def _plant_image(severity: str, plant_code: str, infection_pct: float) -> str:
    color_map = {
        "HEALTHY": HEALTHY_COLOR,
        "LOW": LOW_COLOR,
        "MODERATE": MOD_COLOR,
        "HIGH": HIGH_COLOR,
    }
    return _svg_to_data_uri(_make_plant_svg(color_map.get(severity, HEALTHY_COLOR), plant_code, infection_pct))


# ──────────────────────────────────────────────
# Main seed function
# ──────────────────────────────────────────────

DEMO_PLANT_SPECS = [
    # (code, lat_off, lng_off, crop, status, inf_pct, disease, severity)
    ("WHEAT-001", 0.0001, 0.0001, "Wheat", "HEALTHY",   0.0,  "Healthy Crop",                              "HEALTHY"),
    ("WHEAT-002", 0.0003, 0.0002, "Wheat", "HIGH",      68.5, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
    ("WHEAT-003", 0.0005, 0.0004, "Wheat", "MODERATE",  35.0, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
    ("WHEAT-004", 0.0002, 0.0006, "Wheat", "LOW",       12.0, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
    ("WHEAT-005", 0.0007, 0.0003, "Wheat", "HEALTHY",   0.0,  "Healthy Crop",                              "HEALTHY"),
    ("WHEAT-006", 0.0009, 0.0005, "Wheat", "MODERATE",  28.0, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
    ("WHEAT-007", 0.0004, 0.0008, "Wheat", "HEALTHY",   0.0,  "Healthy Crop",                              "HEALTHY"),
    ("WHEAT-008", 0.0011, 0.0002, "Wheat", "HIGH",      74.0, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
    ("WHEAT-009", 0.0006, 0.0010, "Wheat", "LOW",        8.5, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
    ("WHEAT-010", 0.0013, 0.0007, "Wheat", "HEALTHY",   0.0,  "Healthy Crop",                              "HEALTHY"),
    ("WHEAT-011", 0.0008, 0.0012, "Wheat", "MODERATE",  42.0, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
    ("WHEAT-012", 0.0015, 0.0004, "Wheat", "HIGH",      81.0, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
    ("WHEAT-013", 0.0010, 0.0014, "Wheat", "LOW",       19.5, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
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
    Seeds or re-seeds the SIH 2026 demo dataset.

    - If force_reseed=True (called by POST /api/demo/reset), wipes all tables first.
    - If demo data already exists and force_reseed=False, returns existing counts.
    - All plant images are inline SVG data URIs — no internet connection required.
    """
    if not force_reseed and db.query(Field).first():
        return {
            "message": "Demo data already exists.",
            "seeded": False,
            "fields_count": db.query(Field).count(),
            "plants_count": db.query(Plant).count(),
            "prescriptions_count": db.query(Prescription).count(),
            "spray_events_count": db.query(SprayEvent).count(),
        }

    # Wipe all existing demo data
    if force_reseed:
        db.query(SprayEvent).delete()
        db.query(Prescription).delete()
        db.query(Detection).delete()
        db.query(Plant).delete()
        db.query(SprayerState).delete()
        db.query(Field).delete()
        db.query(User).delete()
        db.commit()

    # ── 1. Demo User ─────────────────────────────
    user = User(
        name="Ramesh Patel — SIH 2026 Demo Farmer",
        email="demo@agriprescribe.sih2026.in",
        role="Farmer",
    )
    db.add(user)
    db.flush()

    # ── 2. Primary Demo Field (Ludhiana, Punjab) ──
    demo_field = Field(
        user_id=user.id,
        name="Ludhiana Green Valley — SIH Demo Field",
        crop_type="Wheat",
        area=3.2,
        latitude=30.9010,
        longitude=75.8573,
    )
    db.add(demo_field)
    db.flush()

    # ── 3. Create 24 Plants ───────────────────────
    created_plants: list[Plant] = []
    random.seed(42)  # deterministic for demo reproducibility

    for code, dlat, dlng, crop, status, inf_pct, disease, severity in DEMO_PLANT_SPECS:
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

    # ── 4. Detections, Prescriptions & Spray Events ──
    spray_events_seeded = 0
    for p in created_plants:
        confidence = 0.99 if p.severity == "HEALTHY" else round(random.uniform(0.88, 0.97), 2)

        # Detection with offline SVG image
        det = Detection(
            plant_id=p.id,
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
            crop_type=p.crop_type,
            disease=rx_data["disease"],
            infection_percentage=rx_data["infection_percentage"],
            severity=rx_data["severity"],
            recommended_action=rx_data["recommended_action"],
            spray_level=rx_data["spray_level"],
            recommended_volume_ml=rx_data["recommended_volume_ml"],
            priority=rx_data["priority"],
            reason=rx_data.get("reason", ""),
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

    # ── 5. Sprayer State ──────────────────────────
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
        "message": "✅ SIH 2026 Demo data seeded successfully!",
        "seeded": True,
        "demo_field": demo_field.name,
        "demo_field_id": demo_field.id,
        "fields_count": db.query(Field).count(),
        "plants_count": db.query(Plant).count(),
        "prescriptions_count": db.query(Prescription).count(),
        "spray_events_count": db.query(SprayEvent).count(),
    }
