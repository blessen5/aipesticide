"""
AgriPrescribe AI Inference Module
Pluggable Interface for ML Disease Detection Models
"""

import os
import json
import numpy as np

class DiseaseModelRunner:
    """
    Interface for future PyTorch / TensorFlow / YOLO ONNX models.
    """
    def __init__(self, model_filename="disease_model.onnx", mapping_filename="class_mapping.json"):
        self.model_dir = os.path.join(os.path.dirname(__file__), "..", "models")
        self.model_path = os.path.join(self.model_dir, model_filename)
        self.mapping_path = os.path.join(self.model_dir, mapping_filename)
        
        self.is_model_present = os.path.exists(self.model_path)
        
        self.session = None
        self.class_names = []
        
        if self.is_model_present:
            try:
                import onnxruntime as ort
                self.session = ort.InferenceSession(self.model_path)
                
                if os.path.exists(self.mapping_path):
                    with open(self.mapping_path, 'r') as f:
                        self.class_names = json.load(f)
            except Exception as e:
                print(f"Failed to load ONNX model: {e}")
                self.is_model_present = False

    def predict(self, image_path: str) -> dict:
        if not self.is_model_present or self.session is None:
            return {
                "status": "DEMO_FALLBACK_ACTIVE",
                "message": "Custom ML model weight not found in ai/models/. Using OpenCV heuristic engine."
            }

        try:
            from PIL import Image
            import torchvision.transforms as transforms
            import torch
            import torch.nn.functional as F
            
            # Preprocessing matching the training pipeline
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])
            
            image = Image.open(image_path).convert('RGB')
            input_tensor = transform(image).unsqueeze(0).numpy() # Add batch dimension
            
            # Run inference
            input_name = self.session.get_inputs()[0].name
            output_name = self.session.get_outputs()[0].name
            
            result = self.session.run([output_name], {input_name: input_tensor})
            logits = torch.tensor(result[0])
            
            # Get probabilities
            probs = F.softmax(logits, dim=1).squeeze().tolist()
            
            # Get the highest confidence prediction
            max_idx = np.argmax(probs)
            confidence = probs[max_idx]
            
            predicted_class = self.class_names[max_idx] if self.class_names and max_idx < len(self.class_names) else f"Class_{max_idx}"
            
            return {
                "status": "SUCCESS",
                "disease": predicted_class,
                "confidence": confidence,
                "message": f"Detected {predicted_class} with {confidence*100:.2f}% confidence."
            }
            
        except Exception as e:
            return {
                "status": "ERROR",
                "message": f"Inference failed: {str(e)}"
            }
