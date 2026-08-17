# AgriPrescribe AI Service

This directory contains the machine learning models and inference scripts for plant disease detection and severity estimation.

## Architecture
1. **Immediate Prototype (Demo Mode)**: Uses OpenCV feature extraction + RGB/HSV color space lesion ratio calculation to instantly diagnose plant health without requiring GPU/cloud downloads.
2. **Production ML Model Ready**: Drop any PyTorch/TensorFlow trained model (`.onnx` or `.pt` format) into `ai/models/disease_model.onnx`.

## Supported Classes (Extensible)
- Tomato Early Blight (*Alternaria solani*)
- Wheat Stripe Rust (*Puccinia striiformis*)
- Cotton Bacterial Blight (*Xanthomonas*)
- Rice Brown Spot (*Bipolaris oryzae*)
- Potato Late Blight (*Phytophthora infestans*)
- Healthy Crop (*No Infection*)
