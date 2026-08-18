"""
AgriPrescribe — ESP32 Hardware Management Endpoints
====================================================
Provides a dedicated /api/hardware router for:
  GET  /api/hardware/health    → ping ESP32 + report connectivity
  GET  /api/hardware/status    → full live telemetry from ESP32
  POST /api/hardware/command   → send raw command to ESP32
  POST /api/hardware/switch-mode → hot-swap driver (SIMULATED ↔ ESP32)

If no ESP32 is connected the endpoints still respond, reporting connectivity=False
and the current active mode (always SIMULATED as fallback).

The simulator is never disabled by this router.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.sprayer_service import sprayer_controller, _probe_esp32, ESP32HardwareController
from app.config import settings

logger = logging.getLogger(__name__)

hardware_router = APIRouter(prefix="/hardware", tags=["Hardware / ESP32"])


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas (local to this module)
# ──────────────────────────────────────────────────────────────────────────────

class HardwareHealthResponse(BaseModel):
    connected: bool
    active_mode: str
    esp32_host: str
    esp32_port: int
    device_code: Optional[str] = None
    firmware_version: Optional[str] = None
    uptime_s: Optional[int] = None
    message: str


class HardwareCommandRequest(BaseModel):
    command: str = Field(..., description="Command to send: START | STOP | MOVE | SPRAY")
    plant_id: str = Field(default="", description="Plant identifier, e.g. 'P003'")
    zone_id: Optional[str] = Field(default=None, description="Zone identifier")
    volume_ml: float = Field(default=0.0, ge=0.0, description="Volume in mL (required for SPRAY)")


class HardwareCommandResponse(BaseModel):
    command: str
    plant_id: Optional[str] = None
    zone_id: Optional[str] = None
    volume_ml: float
    active_mode: str
    esp32_response: Optional[dict] = None
    simulated: bool
    message: str


class SwitchModeRequest(BaseModel):
    mode: str = Field(..., description="Target mode: SIMULATED or ESP32")


class SwitchModeResponse(BaseModel):
    requested_mode: str
    active_mode: str
    connected: bool
    message: str


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@hardware_router.get("/health", response_model=HardwareHealthResponse)
def hardware_health():
    """
    Ping the ESP32 and return connectivity status.

    Always returns 200. `connected` field indicates whether the physical
    board responded. When not connected, `active_mode` reports the current
    fallback (SIMULATED).
    """
    active_mode = sprayer_controller.get_active_mode()
    connected = False
    device_code = None
    firmware_version = None
    uptime_s = None

    if active_mode == "ESP32":
        # Try a live probe
        connected = _probe_esp32(settings.ESP32_HOST, settings.ESP32_PORT, settings.ESP32_TIMEOUT)
        if connected:
            # Fetch detail from /api/health
            try:
                import requests
                resp = requests.get(
                    f"http://{settings.ESP32_HOST}:{settings.ESP32_PORT}/api/health",
                    timeout=settings.ESP32_TIMEOUT
                )
                data = resp.json()
                device_code = data.get("device")
                firmware_version = data.get("version")
                uptime_s = data.get("uptime_s")
            except Exception:
                pass
    else:
        # SIMULATED mode — always "not connected" to physical hardware
        connected = False

    message = (
        f"ESP32 connected at {settings.ESP32_HOST}:{settings.ESP32_PORT}"
        if connected
        else (
            f"ESP32 not reachable at {settings.ESP32_HOST}:{settings.ESP32_PORT} — running in SIMULATED mode"
            if active_mode == "ESP32"
            else "Running in SIMULATED mode (no ESP32 required)"
        )
    )

    return HardwareHealthResponse(
        connected=connected,
        active_mode=active_mode,
        esp32_host=settings.ESP32_HOST,
        esp32_port=settings.ESP32_PORT,
        device_code=device_code,
        firmware_version=firmware_version,
        uptime_s=uptime_s,
        message=message
    )


@hardware_router.get("/status")
def hardware_status():
    """
    Fetch full live telemetry from the ESP32.

    If in SIMULATED mode, returns simulated telemetry.
    If in ESP32 mode but device is unreachable, returns error detail.
    """
    active_mode = sprayer_controller.get_active_mode()
    try:
        telemetry = sprayer_controller.driver.get_telemetry()
        return {
            "active_mode": active_mode,
            "telemetry": telemetry
        }
    except Exception as exc:
        logger.error("[HW] Failed to fetch telemetry: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Hardware telemetry unavailable: {exc}"
        )


@hardware_router.post("/command", response_model=HardwareCommandResponse)
def hardware_command(req: HardwareCommandRequest):
    """
    Send a raw hardware command directly to the ESP32 (or simulator).

    Valid commands: START | STOP | MOVE | SPRAY

    Prototype payload example:
    ```json
    {
      "command": "SPRAY",
      "zone_id": "Z001",
      "volume_ml": 10
    }
    ```

    Safety: SPRAY with volume_ml <= 0 is rejected.
    This endpoint bypasses the full prescription workflow — use
    /api/sprayer/spray for the full safety-checked pipeline.
    """
    cmd = req.command.upper()
    valid_commands = {"START", "STOP", "MOVE", "SPRAY"}
    if cmd not in valid_commands:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid command '{cmd}'. Valid: {sorted(valid_commands)}"
        )

    if cmd == "SPRAY" and req.volume_ml <= 0.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="volume_ml must be > 0 for SPRAY command. Healthy plants must NOT be sprayed."
        )

    active_mode = sprayer_controller.get_active_mode()
    simulated = (active_mode == "SIMULATED")
    esp32_response = None

    try:
        if cmd == "OPEN_VALVE":
            target = req.zone_id if req.zone_id else req.plant_id
            esp32_response = sprayer_controller.driver.open_valve(target)
            result_msg = f"OPEN_VALVE command sent for {target}."

        elif cmd == "CLOSE_VALVE":
            target = req.zone_id if req.zone_id else req.plant_id
            esp32_response = sprayer_controller.driver.close_valve(target)
            result_msg = f"CLOSE_VALVE command sent for {target}."

        elif cmd == "START_PUMP":
            esp32_response = sprayer_controller.driver.start_pump()
            result_msg = "START_PUMP command sent."

        elif cmd == "STOP_PUMP":
            esp32_response = sprayer_controller.driver.stop_pump()
            result_msg = "STOP_PUMP command sent."

        elif cmd == "STOP" or cmd == "EMERGENCY_STOP":
            stop_result = sprayer_controller.driver.emergency_stop()
            esp32_response = stop_result
            result_msg = "EMERGENCY_STOP command sent — all actuators halted."

        else:
            result_msg = f"Command {cmd} not supported directly."

    except Exception as exc:
        logger.error("[HW Command] %s failed: %s", cmd, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Hardware command '{cmd}' failed: {exc}"
        )

    return HardwareCommandResponse(
        command=cmd,
        plant_id=req.plant_id,
        zone_id=req.zone_id,
        volume_ml=req.volume_ml,
        active_mode=active_mode,
        esp32_response=esp32_response,
        simulated=simulated,
        message=result_msg
    )


@hardware_router.post("/switch-mode", response_model=SwitchModeResponse)
def switch_mode(req: SwitchModeRequest):
    """
    Hot-swap the active sprayer driver at runtime without restarting the server.

    - `SIMULATED` → always succeeds, no hardware required
    - `ESP32`     → probes the board; if unreachable, stays in SIMULATED

    Environment variables `ESP32_HOST` / `ESP32_PORT` are used for the probe.
    """
    requested = req.mode.upper()
    if requested not in {"SIMULATED", "ESP32"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode '{requested}'. Choose 'SIMULATED' or 'ESP32'."
        )

    result = sprayer_controller.swap_driver(requested)
    return SwitchModeResponse(
        requested_mode=requested,
        active_mode=result["mode"],
        connected=result["connected"],
        message=result["message"]
    )
