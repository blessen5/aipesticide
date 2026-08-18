import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Scan, 
  Upload, 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  RefreshCw, 
  Droplet, 
  ShieldCheck, 
  Flame, 
  Activity, 
  FileText, 
  Radio, 
  ArrowRight,
  VideoOff,
  SwitchCamera,
  MapPin,
  PlusCircle,
  Eye,
  Send
} from 'lucide-react';
import { api } from '../services/api';
import { Field, DetectionAnalyzeResponse, PrescriptionGenerateResponse, SeverityLevel, Plant } from '../types';

export const ScanPlant: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Field Selection State
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number>(1);
  const [fieldPlantsCount, setFieldPlantsCount] = useState<number>(0);
  const [currentPlantIndex, setCurrentPlantIndex] = useState<number>(1);

  // Ingestion & Diagnosis State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [detectionResult, setDetectionResult] = useState<DetectionAnalyzeResponse | null>(null);
  const [prescription, setPrescription] = useState<PrescriptionGenerateResponse | null>(null);
  const [isAddingToMap, setIsAddingToMap] = useState<boolean>(false);
  const [addedToMapSuccess, setAddedToMapSuccess] = useState<boolean>(false);
  const [scannedInSession, setScannedInSession] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSpraying, setIsSpraying] = useState<boolean>(false);

  // Presentation Demo Presets for offline Hackathon safety
  const demoSamples = [
    {
      id: 'rust',
      title: 'Wheat Stripe Rust',
      disease: 'Wheat Stripe Rust (Puccinia striiformis)',
      crop: 'Wheat',
      url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop'
    },
    {
      id: 'blight',
      title: 'Tomato Early Blight',
      disease: 'Tomato Early Blight (Alternaria solani)',
      crop: 'Tomato',
      url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&auto=format&fit=crop'
    },
    {
      id: 'cotton_blight',
      title: 'Cotton Bacterial Blight',
      disease: 'Cotton Bacterial Blight (Xanthomonas)',
      crop: 'Cotton',
      url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800&auto=format&fit=crop'
    },
    {
      id: 'healthy',
      title: 'Healthy Corn Leaf',
      disease: 'Healthy Crop',
      crop: 'Corn',
      url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop'
    }
  ];

  // Load Fields on mount
  useEffect(() => {
    const loadFields = async () => {
      try {
        const res = await api.getFields();
        setFields(res);
        if (res.length > 0) {
          setSelectedFieldId(res[0].id);
          updateFieldPlantCount(res[0].id);
        }
      } catch (err) {
        console.error('Failed to load fields:', err);
      }
    };
    loadFields();
  }, []);

  const updateFieldPlantCount = async (fieldId: number) => {
    try {
      const plants = await api.getPlants(fieldId);
      setFieldPlantsCount(plants.length);
      setCurrentPlantIndex(plants.length + 1);
    } catch (err) {
      console.error('Failed to get plants count:', err);
    }
  };

  const handleFieldChange = (newFieldId: number) => {
    setSelectedFieldId(newFieldId);
    updateFieldPlantCount(newFieldId);
  };

  // Camera Management
  const startCamera = async () => {
    setError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsCameraActive(true);
      } else {
        setError('Camera API not supported on this device/browser.');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Camera access unavailable. Please choose an image upload or demo preset.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `field_scan_plant_${currentPlantIndex}.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
            setPreviewUrl(canvas.toDataURL('image/jpeg'));
            stopCamera();
            resetDiagnosis();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const toggleCameraFacingMode = () => {
    stopCamera();
    setCameraFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setTimeout(startCamera, 300);
  };

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      stopCamera();
      resetDiagnosis();
    }
  };

  const handleSelectPreset = async (preset: typeof demoSamples[0]) => {
    stopCamera();
    resetDiagnosis();
    setPreviewUrl(preset.url);

    try {
      const response = await fetch(preset.url);
      const blob = await response.blob();
      const file = new File([blob], `${preset.id}_leaf.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
    } catch {
      setSelectedFile(null);
    }
  };

  const resetDiagnosis = () => {
    setDetectionResult(null);
    setPrescription(null);
    setAddedToMapSuccess(false);
    setError(null);
    setFeedbackToast(null);
  };

  // 1. Core AI Diagnosis (Step 4 & 5)
  const handleScanPlant = async () => {
    if (!previewUrl && !selectedFile) {
      setError('Please take a photo, upload an image, or pick a demo sample first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFeedbackToast(null);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('plant_id', String(currentPlantIndex));

      const diag = await api.analyzePlantImage(formData);
      setDetectionResult(diag);

      // Auto-generate Prescription (Step 6)
      const selectedField = fields.find(f => f.id === selectedFieldId);
      const presc = await api.generatePrescription({
        plant_id: currentPlantIndex,
        crop_type: selectedField?.crop_type || 'Crop',
        disease: diag.disease,
        infection_percentage: diag.infection_percentage,
        severity: diag.severity
      });
      setPrescription(presc);

    } catch (err: any) {
      console.error('Diagnosis failed:', err);
      setError(err.message || 'AI diagnosis failed. Please check network connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 2. Add Result to Field Map (Step 7)
  const handleAddToPrescriptionMap = async () => {
    if (!detectionResult || !prescription) return;

    setIsAddingToMap(true);
    setError(null);

    try {
      const selectedField = fields.find(f => f.id === selectedFieldId);
      const baseLat = selectedField?.latitude || 28.6139;
      const baseLng = selectedField?.longitude || 77.2090;

      // Calculate a realistic coordinate offset in the field grid
      const offsetLat = (Math.random() - 0.5) * 0.0012;
      const offsetLng = (Math.random() - 0.5) * 0.0012;

      await api.createPlant({
        field_id: selectedFieldId,
        plant_code: `P-${String(currentPlantIndex).padStart(3, '0')}`,
        latitude: baseLat + offsetLat,
        longitude: baseLng + offsetLng,
        crop_type: selectedField?.crop_type || 'Crop',
        status: detectionResult.severity,
        disease: detectionResult.disease,
        infection_percentage: detectionResult.infection_percentage,
        severity: detectionResult.severity
      });

      setAddedToMapSuccess(true);
      setScannedInSession(prev => prev + 1);
      setFieldPlantsCount(prev => prev + 1);
      setFeedbackToast({
        type: 'success',
        message: `Plant #P-${String(currentPlantIndex).padStart(3, '0')} recorded on Field #${selectedFieldId} Prescription Map!`
      });

    } catch (err: any) {
      console.error('Failed to add plant to map:', err);
      setFeedbackToast({
        type: 'error',
        message: err.message || 'Failed to save plant to field map.'
      });
    } finally {
      setIsAddingToMap(false);
    }
  };

  // 3. Repeat for Next Plant (Step 8)
  const handleScanNextPlant = () => {
    setCurrentPlantIndex(prev => prev + 1);
    setSelectedFile(null);
    setPreviewUrl(null);
    resetDiagnosis();
  };

  // 4. Trigger Quick Spot Spray (Step 10)
  const handleQuickSpotSpray = async () => {
    if (!prescription) return;
    if (prescription.severity === 'HEALTHY' || prescription.recommended_volume_ml <= 0) {
      setFeedbackToast({
        type: 'error',
        message: 'Safety Lock: Healthy crop requires 0 mL spray. Dispensing is locked.'
      });
      return;
    }

    setIsSpraying(true);
    try {
      const res = await api.triggerSpray(currentPlantIndex, prescription.recommended_volume_ml, 'SIMULATED');
      setFeedbackToast({
        type: 'success',
        message: `Spot Spray command [${res.command_id}] sent to sprayer (${res.volume_ml} mL applied)!`
      });
    } catch (err: any) {
      setFeedbackToast({
        type: 'error',
        message: err.message || 'Failed to dispatch spray command.'
      });
    } finally {
      setIsSpraying(false);
    }
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'HIGH':
        return (
          <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
            <Flame className="w-4 h-4" /> HIGH SEVERITY
          </span>
        );
      case 'MODERATE':
        return (
          <span className="bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> MODERATE SEVERITY
          </span>
        );
      case 'LOW':
        return (
          <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> LOW SEVERITY
          </span>
        );
      default:
        return (
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> HEALTHY CROP
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-3xl mx-auto px-2 sm:px-4">
      
      {/* 1. Select Field Header (Step 1) */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-emerald-400 font-bold uppercase tracking-wider">
            <MapPin className="w-4 h-4" />
            <span>Field Scouting Session</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            Plant #P-{String(currentPlantIndex).padStart(3, '0')}
          </span>
        </div>

        {/* Field Selector Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Active Field:</label>
          <select
            value={selectedFieldId}
            onChange={(e) => handleFieldChange(Number(e.target.value))}
            className="w-full p-3.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500 shadow-inner"
          >
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} • {f.crop_type} ({f.area} ha)
              </option>
            ))}
          </select>
        </div>

        {/* Session Stats Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <span>Crop: <strong className="text-white">{selectedField?.crop_type || 'Rice'}</strong></span>
          <span>Mapped in Field: <strong className="text-emerald-400">{fieldPlantsCount} plants</strong></span>
        </div>
      </div>

      {/* Notification Toast */}
      {feedbackToast && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between animate-fadeIn shadow-lg ${
          feedbackToast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{feedbackToast.message}</span>
          </div>
          <button onClick={() => setFeedbackToast(null)} className="text-slate-400 hover:text-white ml-2 text-xs">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-300 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2 & 3. Camera / Image Ingestion Container */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
        
        {/* Toggle Mode Pills */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              if (!isCameraActive) startCamera();
            }}
            className={`py-3 rounded-xl flex items-center justify-center space-x-2 transition ${
              isCameraActive
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              if (fileInputRef.current) fileInputRef.current.click();
            }}
            className={`py-3 rounded-xl flex items-center justify-center space-x-2 transition ${
              !isCameraActive && previewUrl
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photo</span>
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Live Camera Viewfinder */}
        {isCameraActive ? (
          <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/50 shadow-2xl aspect-[4/3] flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Target Reticle Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-dashed border-emerald-400/80 rounded-3xl animate-pulse" />
            </div>

            {/* Camera Floating Controls */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center space-x-6 px-4">
              <button
                type="button"
                onClick={toggleCameraFacingMode}
                className="p-3 bg-slate-900/80 backdrop-blur-md rounded-full text-slate-200 border border-slate-700 hover:text-white"
                title="Switch Camera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-emerald-500 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
                title="Capture Photo"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500" />
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="p-3 bg-slate-900/80 backdrop-blur-md rounded-full text-slate-200 border border-slate-700 hover:text-white"
                title="Close Camera"
              >
                <VideoOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : previewUrl ? (
          /* Image Preview */
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Leaf to scan"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 flex space-x-2">
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setSelectedFile(null);
                  resetDiagnosis();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md text-slate-300 text-xs font-semibold border border-slate-700 hover:text-white"
              >
                Retake Photo
              </button>
            </div>
          </div>
        ) : (
          /* Empty / Upload Drop Area */
          <div
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.click();
            }}
            className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-950/60 flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Tap to Take Photo or Upload Leaf</p>
              <p className="text-xs text-slate-400 mt-1">Supports camera capture & gallery images</p>
            </div>
          </div>
        )}

        {/* Offline Demo Presets */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-400 block">
            Or pick an instant offline leaf preset:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {demoSamples.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                  previewUrl === preset.url
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.title}
                  className="w-8 h-8 rounded-lg object-cover shrink-0"
                />
                <div className="truncate">
                  <p className="text-xs font-bold truncate text-white">{preset.title}</p>
                  <p className="text-[10px] text-slate-400">{preset.crop}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. MAIN ACTION BUTTON: SCAN PLANT (Large button) */}
        <button
          onClick={handleScanPlant}
          disabled={isAnalyzing || (!previewUrl && !selectedFile)}
          className={`w-full py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg shadow-xl flex items-center justify-center space-x-3 transition transform active:scale-98 ${
            isAnalyzing || (!previewUrl && !selectedFile)
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-400 text-slate-950 shadow-emerald-500/30 hover:scale-101 hover:brightness-105'
          }`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Analyzing Leaf Pathology...</span>
            </>
          ) : (
            <>
              <Scan className="w-6 h-6" />
              <span>SCAN PLANT</span>
            </>
          )}
        </button>

      </div>

      {/* 5 & 6. AI Diagnosis & Prescription Results Panel */}
      {detectionResult && prescription && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-emerald-500/40 space-y-5 shadow-2xl animate-fadeIn bg-slate-900/90">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-lg text-white">AI Crop Diagnosis Result</h3>
            </div>
            {getSeverityBadge(detectionResult.severity)}
          </div>

          {/* 4 Required Summary Metric Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            {/* 1: DISEASE DETECTED */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                DISEASE DETECTED
              </span>
              <p className="font-extrabold text-white text-base leading-snug">
                {detectionResult.disease}
              </p>
              <p className="text-[11px] text-emerald-400 font-mono">
                Confidence: {(detectionResult.confidence * 100).toFixed(0)}%
              </p>
            </div>

            {/* 2: INFECTION % */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                INFECTION %
              </span>
              <p className="font-extrabold text-amber-400 text-2xl">
                {detectionResult.infection_percentage.toFixed(1)}%
              </p>
              <p className="text-[11px] text-slate-400">Leaf Surface Foliage Affected</p>
            </div>

            {/* 3: SEVERITY */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                SEVERITY
              </span>
              <p className="font-extrabold text-white text-base">
                {detectionResult.severity}
              </p>
              <p className="text-[11px] text-slate-400">Pathology Risk Level: {prescription.priority} Priority</p>
            </div>

            {/* 4: RECOMMENDED ACTION */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                RECOMMENDED ACTION
              </span>
              <p className="font-extrabold text-emerald-400 text-base">
                {prescription.recommended_action}
              </p>
              <p className="text-[11px] text-slate-300">
                Prescription Dosage: <strong className="text-white font-bold">{prescription.recommended_volume_ml} mL</strong> ({prescription.spray_level} Level)
              </p>
            </div>

          </div>

          {/* Explanation / Rationale */}
          {detectionResult.explanation && (
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed italic">
              "{detectionResult.explanation}"
            </div>
          )}

          {/* 7 & 8. Action Buttons: ADD TO PRESCRIPTION MAP & NEXT PLANT */}
          <div className="space-y-3 pt-2">
            
            {/* Primary Button: ADD TO PRESCRIPTION MAP */}
            {!addedToMapSuccess ? (
              <button
                onClick={handleAddToPrescriptionMap}
                disabled={isAddingToMap}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition transform active:scale-98"
              >
                {isAddingToMap ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Mapping Plant to Field #{selectedFieldId}...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5 fill-current text-slate-950" />
                    <span>ADD TO PRESCRIPTION MAP</span>
                  </>
                )}
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Added to {selectedField?.name || 'Field'} Map (Plant #P-{String(currentPlantIndex).padStart(3, '0')})</span>
              </div>
            )}

            {/* Repeat for Next Plant (Step 8) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleScanNextPlant}
                className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Scan Next Plant (Plant #{currentPlantIndex + 1})</span>
              </button>

              {/* Quick Spot Spray (Step 10) */}
              {prescription.recommended_volume_ml > 0 && (
                <button
                  type="button"
                  onClick={handleQuickSpotSpray}
                  disabled={isSpraying}
                  className="py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSpraying ? 'Sending Command...' : `Spot Spray Now (${prescription.recommended_volume_ml} mL)`}</span>
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* 9. VIEW FIELD PRESCRIPTION (Step 9: After enough plants are scanned or anytime) */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-extrabold text-white text-sm flex items-center justify-center sm:justify-start space-x-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Field Overview Cartography</span>
          </h4>
          <p className="text-xs text-slate-400">
            {fieldPlantsCount} total plants recorded in <strong>{selectedField?.name || 'Field'}</strong>
            {scannedInSession > 0 && ` (${scannedInSession} newly scanned)`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/map?field_id=${selectedFieldId}`)}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 font-extrabold text-xs sm:text-sm border border-emerald-500/40 flex items-center justify-center space-x-2 transition shadow-lg"
        >
          <span>VIEW FIELD PRESCRIPTION</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
