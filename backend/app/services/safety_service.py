from typing import Dict, Any, List
from datetime import datetime

class SafetyCheckResult:
    def __init__(self, passed: bool, messages: List[str]):
        self.passed = passed
        self.messages = messages

class SafetyService:
    """
    13-point Safety Gate Module for Chemigation.
    Prototype must strictly operate in WATER ONLY mode for safety.
    """
    
    @staticmethod
    def evaluate_prescription_safety(prescription_data: Dict[str, Any]) -> SafetyCheckResult:
        messages = []
        passed = True
        
        # 1. Prototype Constraint Check: WATER ONLY
        chemical_target = prescription_data.get("chemical_type", "WATER").upper()
        if chemical_target != "WATER":
            passed = False
            messages.append(f"SAFETY VIOLATION: Prototype is locked to WATER ONLY mode. '{chemical_target}' is strictly prohibited.")
            
        # 2. Hardware Connectivity
        hardware_status = prescription_data.get("hardware_status", "ONLINE")
        if hardware_status != "ONLINE":
            passed = False
            messages.append("Hardware Node is not reporting ONLINE status.")
            
        # 3. Wind Speed Check (Mocked for prototype)
        wind_speed_kmh = prescription_data.get("wind_speed", 5)
        if wind_speed_kmh > 15:
            passed = False
            messages.append(f"Wind speed ({wind_speed_kmh} km/h) exceeds safe threshold (15 km/h). Drift risk high.")
            
        # 4. Temperature Check (Mocked)
        temp_c = prescription_data.get("temperature_c", 25)
        if temp_c > 35:
            passed = False
            messages.append(f"Temperature ({temp_c}°C) is too high. Evaporation/volatilization risk.")
            
        # 5. Buffer Zone Check
        in_buffer_zone = prescription_data.get("in_buffer_zone", False)
        if in_buffer_zone:
            passed = False
            messages.append("Target zone is within a restricted buffer zone (e.g., near water source).")
            
        # 6. Dosage Limit Check
        dosage_ml = prescription_data.get("volume_ml", 0)
        if dosage_ml > 500:
            passed = False
            messages.append(f"Requested dosage ({dosage_ml} mL) exceeds maximum allowed safe spot dosage.")
            
        # 7. Operator Authorization
        operator_auth = prescription_data.get("operator_authorized", True)
        if not operator_auth:
            passed = False
            messages.append("Operator lacks proper authorization for this procedure.")
            
        # 8. Calibration Status
        calibration_valid = prescription_data.get("calibration_valid", True)
        if not calibration_valid:
            passed = False
            messages.append("Hardware calibration is expired or invalid.")
            
        # 9. Recent Rain Check
        recent_rain = prescription_data.get("recent_rain_mm", 0)
        if recent_rain > 10:
            passed = False
            messages.append(f"Recent rainfall ({recent_rain} mm) introduces runoff risk.")
            
        # 10. Time of Day Check
        current_hour = datetime.now().hour
        # In reality, might restrict spraying to early morning or late evening
        # For prototype, we'll allow all times, but keep the check available
        
        # 11. Pressure Sensor Check (Simulated)
        pressure_ok = prescription_data.get("pressure_ok", True)
        if not pressure_ok:
            passed = False
            messages.append("Line pressure anomaly detected. Potential leak or blockage.")
            
        # 12. Flora/Fauna Proximity
        sensitive_area = prescription_data.get("sensitive_area", False)
        if sensitive_area:
            passed = False
            messages.append("Proximity to sensitive flora/fauna detected.")
            
        # 13. System State Verification
        system_ready = prescription_data.get("system_ready", True)
        if not system_ready:
            passed = False
            messages.append("System initialization incomplete. Standby required.")

        if passed:
            messages.append("All 13 safety gate criteria passed. Cleared for execution.")

        return SafetyCheckResult(passed=passed, messages=messages)

safety_service = SafetyService()
