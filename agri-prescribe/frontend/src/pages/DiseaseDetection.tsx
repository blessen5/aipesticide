import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Scan, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  Camera,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { AIAnalysisResponse, BoundingBox } from '../types';

export const DiseaseDetection: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Demo Leaf Presets for instant presentation testing
  const presets = [
    {
      id: 'wheat',
      title: 'Wheat Leaf Rust',
      crop: 'Wheat',
      url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop'
    },
    {
      id: 'cotton',
      title: 'Cotton Bacterial Blight',
      crop: 'Cotton',
      url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&auto=format&fit=crop'
    },
    {
      id: 'rice',
      title: 'Rice Brown Spot',
      crop: 'Rice/Paddy',
      url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800&auto=format&fit=crop'
    },
    {
      id: 'healthy',
      title: 'Healthy Crop Leaf',
      crop: 'Tomato',
      url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop'
    }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setSelectedFile(null);
    setPreviewUrl(preset.url);
    setResult(null);
    setError(null);
    runAnalysis(null, preset.id);
  };

  const runAnalysis = async (fileToUpload: File | null = selectedFile, presetId: string | null = null) => {
    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    if (fileToUpload) {
      formData.append('file', fileToUpload);
    } else if (presetId) {
      formData.append('demo_sample_id', presetId);
    }

    try {
      const res = await api.analyzeImage(formData);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze plant image.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'MODERATE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'LOW':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-agri-500/10 border border-agri-500/30 text-agri-400 text-xs font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>OpenCV Heuristic Feature Engine + Pluggable ML Pipeline</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">AI Plant Disease & Infection Analysis</h1>
        <p className="text-slate-400 text-sm">
          Capture or upload a crop leaf image to detect pathogens, estimate infection %, and auto-generate precision prescriptions.
        </p>
      </div>

      {/* Preset Quick Test Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold text-white flex items-center space-x-1.5">
            <Camera className="w-4 h-4 text-agri-400" />
            <span>Quick Sample Leaf Presets for Presentation:</span>
          </span>
          <span className="text-slate-400 hidden sm:inline">Click to test instant AI analysis</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-agri-500/50 text-left transition group"
            >
              <img src={preset.url} alt={preset.title} className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-agri-400 transition">{preset.title}</h4>
                <p className="text-[10px] text-slate-400">{preset.crop}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Upload & Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Box: Image Input / Upload Zone */}
        <div className="space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Upload className="w-4 h-4 text-agri-400" />
              <span>Upload / Capture Crop Leaf</span>
            </h3>

            {/* Dropzone */}
            <div className="relative border-2 border-dashed border-slate-700 hover:border-agri-500/50 rounded-2xl p-6 text-center bg-slate-950/40 transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
              />
              {previewUrl ? (
                <div className="relative inline-block max-h-72 overflow-hidden rounded-xl border border-slate-700">
                  <img src={previewUrl} alt="Leaf Preview" className="max-h-72 object-contain mx-auto" />
                  
                  {/* Render Bounding Boxes Overlay if Result Exists */}
                  {result && result.bounding_boxes.map((box: BoundingBox, idx: number) => (
                    <div
                      key={idx}
                      className="absolute border-2 border-red-500 bg-red-500/20 text-[10px] text-white font-bold px-1 rounded shadow-lg pointer-events-none"
                      style={{
                        left: `${box.x * 100}%`,
                        top: `${box.y * 100}%`,
                        width: `${box.width * 100}%`,
                        height: `${box.height * 100}%`
                      }}
                    >
                      {box.label}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 py-8">
                  <Scan className="w-12 h-12 text-agri-400 mx-auto animate-pulse" />
                  <p className="text-sm font-semibold text-slate-200">
                    Click or Drag & Drop Leaf Image Here
                  </p>
                  <p className="text-xs text-slate-400">Supports JPG, PNG, WEBP up to 10MB</p>
                </div>
              )}
            </div>

            {/* Run AI Analysis Button */}
            <button
              onClick={() => runAnalysis(selectedFile)}
              disabled={isAnalyzing || (!selectedFile && !previewUrl)}
              className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center space-x-2 transition ${
                isAnalyzing || (!selectedFile && !previewUrl)
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-agri-600 to-emerald-500 hover:from-agri-500 hover:to-emerald-400 text-slate-950 shadow-agri-600/30'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processing Image Features with OpenCV AI...</span>
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

        {/* Right Box: AI Diagnosis Results */}
        <div className="space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="glass-panel p-6 rounded-2xl border border-agri-500/30 space-y-6">
              
              {/* Disease Diagnosis Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-semibold text-agri-400 tracking-wide uppercase">
                    AI Diagnosis Result
                  </span>
                  <h3 className="text-xl font-extrabold text-white mt-1">{result.disease_detected}</h3>
                  <p className="text-xs text-slate-400">Identified Crop Specie: <strong>{result.crop_identified}</strong></p>
                </div>

                <div className={`px-3 py-1 rounded-full border text-xs font-bold ${getSeverityColor(result.severity)}`}>
                  {result.severity} SEVERITY
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Infection Surface Ratio</span>
                  <div className="text-2xl font-black text-amber-400">{result.infection_percentage}%</div>
                  <p className="text-[10px] text-slate-500">Target Lesion Density</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400">Diagnostic Confidence</span>
                  <div className="text-2xl font-black text-emerald-400">{(result.confidence * 100).toFixed(0)}%</div>
                  <p className="text-[10px] text-slate-500">Heuristic Feature Match</p>
                </div>
              </div>

              {/* Detected Lesion Bounding Boxes */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-agri-400" />
                  <span>Detected Pathogen Lesion Coordinates ({result.bounding_boxes.length}):</span>
                </h4>
                <div className="space-y-1.5">
                  {result.bounding_boxes.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-slate-300">
                      <span className="font-semibold text-agri-300">{b.label}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        x:{(b.x*100).toFixed(0)}%, y:{(b.y*100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct CTA: View Generated Prescription */}
              <button
                onClick={() => navigate('/prescriptions')}
                className="w-full py-3.5 bg-agri-600 hover:bg-agri-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-agri-600/30 flex items-center justify-center space-x-2 transition"
              >
                <FileText className="w-5 h-5" />
                <span>View Generated Precision Prescription</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          ) : (
            <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-3">
              <Scan className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-slate-300 font-semibold text-sm">Awaiting Image Input</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Select an image above or click a preset sample to view instant AI disease classification and annotated bounding boxes.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
