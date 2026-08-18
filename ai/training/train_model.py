import os
import zipfile
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
from tqdm import tqdm
import subprocess

# --- Configuration ---
DATASET_NAME = "arjuntejaswi/plant-village"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
MODEL_PATH_ONNX = os.path.join(MODEL_DIR, "disease_model.onnx")
CLASS_MAPPING_PATH = os.path.join(MODEL_DIR, "class_mapping.json")

BATCH_SIZE = 32
NUM_EPOCHS = 3
LEARNING_RATE = 0.001
IMAGE_SIZE = 224

def download_dataset():
    """Downloads the dataset using the Kaggle API."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print(f"Downloading dataset {DATASET_NAME} from Kaggle...")
        # Requires KAGGLE_USERNAME and KAGGLE_KEY env vars or ~/.kaggle/kaggle.json
        subprocess.run(["kaggle", "datasets", "download", "-d", DATASET_NAME, "-p", DATA_DIR, "--unzip"], check=True)
    else:
        print("Dataset directory already exists. Skipping download.")

def train_model():
    """Trains a MobileNetV2 model on the downloaded dataset."""
    device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Using device: {device}")

    # For plant village, after unzipping, there's usually a 'PlantVillage' folder containing the classes.
    # We might need to find the exact subfolder containing the image classes.
    dataset_root = DATA_DIR
    subdirs = [os.path.join(DATA_DIR, d) for d in os.listdir(DATA_DIR) if os.path.isdir(os.path.join(DATA_DIR, d))]
    if len(subdirs) == 1:
         dataset_root = subdirs[0]

    print(f"Loading data from: {dataset_root}")

    transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    try:
        full_dataset = datasets.ImageFolder(root=dataset_root, transform=transform)
    except FileNotFoundError:
        print("Error: Could not find image folders. Ensure the dataset downloaded correctly.")
        return

    # Create train/val split (80/20)
    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(full_dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

    class_names = full_dataset.classes
    num_classes = len(class_names)
    print(f"Found {num_classes} classes: {class_names}")
    
    # Save class mapping
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
    with open(CLASS_MAPPING_PATH, 'w') as f:
        json.dump(class_names, f)

    # Initialize MobileNetV2
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    # Replace the classifier head
    model.classifier[1] = nn.Linear(model.last_channel, num_classes)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    print("Starting training...")
    for epoch in range(NUM_EPOCHS):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        # Training loop
        for inputs, labels in tqdm(train_loader, desc=f"Epoch {epoch+1}/{NUM_EPOCHS} [Train]"):
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
        train_acc = 100. * correct / total
        
        # Validation loop
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for inputs, labels in tqdm(val_loader, desc=f"Epoch {epoch+1}/{NUM_EPOCHS} [Val]"):
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()
                
        val_acc = 100. * val_correct / val_total
        print(f"Epoch {epoch+1} - Train Loss: {running_loss/len(train_loader):.4f}, Train Acc: {train_acc:.2f}% | Val Loss: {val_loss/len(val_loader):.4f}, Val Acc: {val_acc:.2f}%")

    print("Training complete.")
    
    # Export to ONNX
    print(f"Exporting model to {MODEL_PATH_ONNX}...")
    model.eval()
    dummy_input = torch.randn(1, 3, IMAGE_SIZE, IMAGE_SIZE).to(device)
    torch.onnx.export(
        model, 
        dummy_input, 
        MODEL_PATH_ONNX, 
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    print("Export successful!")

if __name__ == "__main__":
    download_dataset()
    train_model()
