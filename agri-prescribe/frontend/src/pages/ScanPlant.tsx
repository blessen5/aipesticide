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
  SwitchCamera
} from 'lucide-react';
import { api } from '../services/api';
import { DetectionAnalyzeResponse, PrescriptionGenerateResponse, SeverityLevel } from '../types';

export const ScanPlant: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [detectionResult, setDetectionResult] = useState<DetectionAnalyzeResponse | null>(null);
  const [isGeneratingPrescription, setIsGeneratingPrescription] = useState<boolean>(false);
  const [prescription, setPrescription] = useState<PrescriptionGenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spraySuccessMsg, setSpraySuccessMsg] = useState<string | null>(null);

  // Presentation Leaf Samples
  const demoSamples = [
    {
      id: 'healthy',
      title: 'Healthy Wheat Leaf',
      disease: 'Healthy Crop',
      crop: 'Wheat',
      url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop'
    },
    {
      id: 'rust',
      title: 'Wheat Stripe Rust',
      disease: 'Wheat Stripe Rust (Puccinia striiformis)',
      crop: 'Wheat',
      url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop'
    },
    {
      id: 'blight',
      title: 'Cotton Bacterial Blight',
      disease: 'Cotton Bacterial Blight (Xanthomonas)',
      crop: 'Cotton',
      url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&auto=format&fit=crop'
    },
    {
      id: 'spot',
      title: 'Rice Brown Spot',
      disease: 'Rice Brown Spot (Bipolaris oryzae)',
      crop: 'Rice',
      url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800&auto=format&fit=crop'
    }
  ];

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
        setError('Camera API is not supported in this browser.');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please verify permissions or upload a file.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
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
            const capturedFile = new File([blob], 'camera_captured_leaf.jpg', { type: 'image/jpeg' });
            setSelectedFile(capturedFile);
            setPreviewUrl(URL.createObjectURL(blob));
            stopCamera();
            setDetectionResult(null);
            setPrescription(null);
            setSpraySuccessMsg(null);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const toggleCameraFacing = () => {
    stopCamera();
    setCameraFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraFacingMode]);

  // File Upload Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setDetectionResult(null);
      setPrescription(null);
      setSpraySuccessMsg(null);
      setError(null);
      stopCamera();
    }
  };

  // Sample Selection
  const handleSelectSample = async (sample: typeof demoSamples[0]) => {
    stopCamera();
    setPreviewUrl(sample.url);
    setSelectedFile(null);
    setDetectionResult(null);
    setPrescription(null);
    setSpraySuccessMsg(null);
    setError(null);

    // Convert sample url to File for backend upload
    try {
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const file = new File([blob], `${sample.id}_sample.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
    } catch {
      // Fallback
    }
  };

  // AI Disease Diagnosis
  const handleRunAnalysis = async () => {
    if (!selectedFile && !previewUrl) {
      setError('Please select or capture a leaf photo first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setPrescription(null);
    setSpraySuccessMsg(null);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('plant_id', '1');

      const res = await api.analyzePlantImage(formData);
      setDetectionResult(res);
    } catch (err: any) {
      setError(err.message || 'AI diagnosis failed. Please check backend connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Prescription Generation
  const handleGeneratePrescription = async () => {
    if (!detectionResult) return;

    setIsGeneratingPrescription(true);
    setError(null);

    try {
      const res = await api.generatePrescription({
        plant_id: detectionResult.plant_id || 1,
        crop_type: 'Wheat',
        disease: detectionResult.disease,
        infection_percentage: detectionResult.infection_percentage,
        severity: detectionResult.severity
      });
      setPrescription(res);
    } catch (err: any) {
      setError(err.message || 'Prescription generation failed.');
    } finally {
      setIsGeneratingPrescription(false);
    }
  };

  // Quick Spot Spray Trigger
  const handleQuickSpray = async () => {
    if (!prescription) return;
    if (prescription.severity === 'HEALTHY' || prescription.recommended_volume_ml <= 0) {
      alert('Safety Restriction: Healthy plants with 0 mL volume cannot receive a spray command.');
      return;
    }

    try {
      const res = await api.triggerSpray(
        prescription.plant_id || 1,
        prescription.recommended_volume_ml,
        'SIMULATED'
      );
      setSpraySuccessMsg(`Precision Spot Spray [${res.command_id}] successfully executed: ${res.volume_ml} mL dispensed!`);
    } catch (err: any) {
      alert('Sprayer command failed: ' + err.message);
    }
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'HIGH':
        return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs px-3 py-1 rounded-full font-extrabold flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> HIGH SEVERITY</span>;
      case 'MODERATE':
        return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs px-3 py-1 rounded-full font-extrabold flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> MODERATE SEVERITY</span>;
      case 'LOW':
        return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs px-3 py-1 rounded-full font-extrabold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> LOW SEVERITY</span>;
      default:
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-3 py-1 rounded-full font-extrabold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> HEALTHY CROP</span>;
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      
      {/* Hidden Canvas for Camera Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Page Title Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>Multi-Stage AI Computer Vision & Prescription Generator</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Scan Plant & Generate Prescription
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Capture or upload a foliage leaf image. Real-time diagnosis calculates surface infection % and generates customized spot-spray recommendations.
        </p>
      </div>

      {/* Presentation Quick-Select Presets Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold text-white flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>SIH 2026 Live Demo Leaf Presets:</span>
          </span>
          <span className="text-slate-400 hidden sm:inline">Click any leaf below for instant demonstration</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {demoSamples.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-left transition group"
            >
              <img src={sample.url} alt={sample.title} className="w-11 h-11 rounded-lg object-cover border border-slate-700 shrink-0" />
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition truncate">{sample.title}</h4>
                <p className="text-[10px] text-slate-400 truncate">{sample.crop}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Upload/Camera (Left) + AI Results & Prescription (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Image Input & Scanning Area */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
            
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Leaf Image Input</span>
              </h3>

              {/* Camera Toggle Button */}
              {!isCameraActive ? (
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Use Camera</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleCameraFacing}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                    title="Flip camera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-3 py-1.5 rounded-lg bg-rose-900/50 hover:bg-rose-800 text-rose-200 text-xs font-semibold flex items-center space-x-1 border border-rose-700/50"
                  >
                    <VideoOff className="w-3.5 h-3.5" />
                    <span>Close Camera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Camera Video Stream or File Dropzone */}
            {isCameraActive ? (
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 text-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-72 object-cover" />
                
                {/* Shutter Capture Overlay Button */}
                <div className="absolute bottom-4 inset-x-0 flex justify-center">
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl flex items-center space-x-2 border-2 border-white"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Snapshot</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center bg-slate-950/50 cursor-pointer transition group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative inline-block max-h-72 overflow-hidden rounded-xl border border-slate-700">
                    <img src={previewUrl} alt="Leaf Preview" className="max-h-72 object-contain mx-auto" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white">
                      Click to choose another photo
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-10">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center group-hover:scale-110 transition">
                      <Scan className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Click to Browse or Drag & Drop Leaf Image
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, WEBP files</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Run AI Analysis Action Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || (!selectedFile && !previewUrl)}
              className={`w-full py-3.5 rounded-xl font-extrabold text-sm shadow-lg flex items-center justify-center space-x-2 transition ${
                isAnalyzing || (!selectedFile && !previewUrl)
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Computing OpenCV Features & Classification...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 fill-current" />
                  <span>Run AI Disease Diagnosis</span>
                </>
              )}
            </button>

          </div>
        </div>

        {/* Right Column: AI Detection Diagnosis & Generated Prescription */}
        <div className="lg:col-span-6 space-y-6">
          
          {error && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {spraySuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2.5 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{spraySuccessMsg}</span>
            </div>
          )}

          {detectionResult ? (
            <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 space-y-6">
              
              {/* Diagnosis Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
                    Step 1: AI Diagnosis Result
                  </span>
                  <h3 className="text-xl font-extrabold text-white mt-1">{detectionResult.disease}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Confidence: <strong className="text-emerald-400">{(detectionResult.confidence * 100).toFixed(0)}%</strong></p>
                </div>
                {getSeverityBadge(detectionResult.severity)}
              </div>

              {/* Infection Severity Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Infection Surface Area</span>
                  <div className="text-2xl font-black text-white">
                    {detectionResult.infection_percentage}%
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-1">
                    <div 
                      className={`h-full rounded-full ${
                        detectionResult.severity === 'HIGH' ? 'bg-rose-500' :
                        detectionResult.severity === 'MODERATE' ? 'bg-orange-500' :
                        detectionResult.severity === 'LOW' ? 'bg-yellow-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${detectionResult.infection_percentage}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Diagnostic Status</span>
                  <div className="text-lg font-bold text-emerald-400">
                    {detectionResult.severity === 'HEALTHY' ? 'Clean Foliage' : 'Pathogen Detected'}
                  </div>
                  <p className="text-[11px] text-slate-400">Computed via OpenCV</p>
                </div>
              </div>

              {/* Explanation Note */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <p><strong className="text-white">Pathology Note:</strong> {detectionResult.explanation}</p>
              </div>

              {/* Step 2: Prescription Generation */}
              {!prescription ? (
                <button
                  onClick={handleGeneratePrescription}
                  disabled={isGeneratingPrescription}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition hover:scale-102"
                >
                  {isGeneratingPrescription ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Generating Precision Prescription...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      <span>Generate Precision Prescription</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                /* Generated Prescription Card */
                <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
                        Step 2: Generated Prescription #{prescription.id || 1}
                      </span>
                      <h4 className="text-lg font-bold text-white">{prescription.recommended_action}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                      Priority: {prescription.priority}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Recommended Volume:</span>
                      <p className="text-xl font-extrabold text-emerald-400 mt-0.5">
                        {prescription.recommended_volume_ml} mL
                      </p>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Spray Setting Level:</span>
                      <p className="text-xl font-extrabold text-white mt-0.5">
                        {prescription.spray_level}
                      </p>
                    </div>
                  </div>

                  {prescription.reason && (
                    <p className="text-xs text-slate-300 italic bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                      "{prescription.reason}"
                    </p>
                  )}

                  {prescription.disclaimer && (
                    <p className="text-[10px] text-slate-400">
                      * {prescription.disclaimer}
                    </p>
                  )}

                  {/* Spot Spray Execution Button */}
                  {prescription.recommended_volume_ml > 0 && (
                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={handleQuickSpray}
                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition"
                      >
                        <Radio className="w-4 h-4" />
                        <span>Execute Spot Spray ({prescription.recommended_volume_ml} mL)</span>
                      </button>
                      <button
                        onClick={() => navigate('/sprayer')}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 transition"
                      >
                        Sprayer Control
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-900 text-slate-600 mx-auto flex items-center justify-center">
                <Scan className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-slate-200 font-bold text-base">Awaiting Foliage Input</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Take a live camera capture or select a test leaf image on the left to run AI OpenCV computer vision disease diagnosis.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
