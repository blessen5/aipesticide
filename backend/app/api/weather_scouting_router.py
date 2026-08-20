from datetime import datetime, timezone
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Session, relationship

from app.database import Base, get_db

router = APIRouter()
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


class SurveySchedule(Base):
    __tablename__ = "survey_schedules"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    survey_type = Column(String(50), default="SCOUTING")
    scheduled_for = Column(DateTime, nullable=False)
    status = Column(String(30), default="SCHEDULED")
    assigned_to = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    field = relationship("Field")


class WeatherCurrent(BaseModel):
    temperature_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    rain_mm: Optional[float] = None
    wind_kmh: Optional[float] = None
    gust_kmh: Optional[float] = None
    weather_code: Optional[int] = None
    label: str = "Variable conditions"


class WeatherResponse(BaseModel):
    source: str
    fetched_at: str
    timezone: Optional[str] = None
    current: WeatherCurrent
    next_6h: dict
    next_12h_rain_mm: float
    decision: str
    window: str
    reasons: list[str]
    hourly: list[dict]


class SurveyCreate(BaseModel):
    field_id: int
    survey_type: str = "SCOUTING"
    scheduled_for: datetime
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


class SurveyResponse(SurveyCreate):
    id: int
    status: str
    completed_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


def weather_label(code: int) -> str:
    labels = {0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Dense drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",80:"Rain showers",81:"Rain showers",82:"Heavy rain showers",95:"Thunderstorm",96:"Thunderstorm with hail",99:"Thunderstorm with hail"}
    return labels.get(code, "Variable conditions")


def field_weather(latitude: float, longitude: float):
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m",
        "hourly": "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,wind_speed_10m,wind_gusts_10m,weather_code",
        "forecast_hours": 48,
        "timezone": "auto",
        "wind_speed_unit": "kmh",
        "precipitation_unit": "mm",
    }
    response = requests.get(OPEN_METEO_URL, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()
    current = data.get("current", {})
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    rain_prob = hourly.get("precipitation_probability", [])
    precip = hourly.get("precipitation", [])
    wind = hourly.get("wind_speed_10m", [])
    gust = hourly.get("wind_gusts_10m", [])
    p6 = max(rain_prob[:6] or [0])
    r6 = sum(precip[:6] or [0])
    r12 = sum(precip[:12] or [0])
    w6 = max(wind[:6] or [0])
    g6 = max(gust[:6] or [0])

    reasons = []
    if p6 >= 50 or r6 >= 2:
        reasons.append("Rain is likely within 6 hours; postpone foliar spraying to reduce wash-off.")
    if w6 >= 15 or g6 >= 25:
        reasons.append("Wind is elevated; drift risk is too high for precision spraying.")
    if (current.get("temperature_2m") or 0) >= 35:
        reasons.append("High heat is present; wait for a cooler application window.")
    if (current.get("relative_humidity_2m") or 0) >= 90 and (current.get("rain") or 0) > 0:
        reasons.append("Leaves are likely wet; wait for suitable dry-down.")

    decision = "HOLD" if reasons else "FAVOURABLE"
    window = "Wait for a dry, low-wind window and re-check weather before application." if reasons else "Conditions are currently favourable; confirm the product label and field scouting before application."
    return {
        "source": "Open-Meteo",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "timezone": data.get("timezone"),
        "current": {
            "temperature_c": current.get("temperature_2m"),
            "humidity_pct": current.get("relative_humidity_2m"),
            "rain_mm": current.get("rain", current.get("precipitation", 0)),
            "wind_kmh": current.get("wind_speed_10m"),
            "gust_kmh": current.get("wind_gusts_10m"),
            "weather_code": current.get("weather_code"),
            "label": weather_label(current.get("weather_code", -1)),
        },
        "next_6h": {"rain_probability_pct": p6, "rain_mm": round(r6, 1), "max_wind_kmh": round(w6, 1), "max_gust_kmh": round(g6, 1)},
        "next_12h_rain_mm": round(r12, 1),
        "decision": decision,
        "window": window,
        "reasons": reasons,
        "hourly": [{"time": times[i], "rain_probability_pct": rain_prob[i] if i < len(rain_prob) else 0, "rain_mm": precip[i] if i < len(precip) else 0, "wind_kmh": wind[i] if i < len(wind) else 0} for i in range(min(12, len(times)))],
    }


@router.get("/fields/{field_id}/weather", response_model=WeatherResponse)
def get_weather(field_id: int, db: Session = Depends(get_db)):
    from app.models.models import Field
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    try:
        return field_weather(field.latitude, field.longitude)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Weather service unavailable: {exc}")


@router.get("/surveys", response_model=list[SurveyResponse])
def get_surveys(field_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(SurveySchedule).order_by(SurveySchedule.scheduled_for.asc())
    if field_id:
        query = query.filter(SurveySchedule.field_id == field_id)
    return query.all()


@router.post("/surveys", response_model=SurveyResponse, status_code=status.HTTP_201_CREATED)
def create_survey(survey_in: SurveyCreate, db: Session = Depends(get_db)):
    from app.models.models import Field
    if not db.query(Field).filter(Field.id == survey_in.field_id).first():
        raise HTTPException(status_code=404, detail="Field not found")
    survey = SurveySchedule(**survey_in.model_dump())
    db.add(survey)
    db.commit()
    db.refresh(survey)
    return survey


@router.patch("/surveys/{survey_id}/complete", response_model=SurveyResponse)
def complete_survey(survey_id: int, db: Session = Depends(get_db)):
    survey = db.query(SurveySchedule).filter(SurveySchedule.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    survey.status = "COMPLETED"
    survey.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(survey)
    return survey
