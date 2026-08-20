"""Train the crop/disease vision model on a local labelled image dataset.

Expected layout:
  data/vision/<class_name>/*.jpg

Example classes:
  Tomato__Healthy, Tomato__Early_blight, Rice__Blast

This script does not download datasets automatically. Add only datasets whose
license permits your intended use, keep a dataset manifest, and validate on a
held-out field set before production use.
"""
from pathlib import Path
import argparse
import json
import random

import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, models, transforms

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "vision"
ARTIFACTS = ROOT / "artifacts" / "vision"


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--epochs', type=int, default=12)
    p.add_argument('--batch-size', type=int, default=32)
    p.add_argument('--lr', type=float, default=3e-4)
    p.add_argument('--val-ratio', type=float, default=.2)
    args = p.parse_args()

    if not DATA.exists():
        raise SystemExit(f'Missing dataset directory: {DATA}')

    tfm = transforms.Compose([
        transforms.Resize((224,224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(8),
        transforms.ColorJitter(brightness=.15, contrast=.15, saturation=.15),
        transforms.ToTensor(),
        transforms.Normalize([.485,.456,.406],[.229,.224,.225]),
    ])
    ds = datasets.ImageFolder(DATA, transform=tfm)
    if len(ds) < 100:
        raise SystemExit('Add substantially more labelled images before training; fewer than 100 samples is not a meaningful field model.')
    val_n = max(1, int(len(ds)*args.val_ratio)); train_n = len(ds)-val_n
    train_ds, val_ds = random_split(ds, [train_n,val_n], generator=torch.Generator().manual_seed(42))
    train_loader = DataLoader(train_ds,batch_size=args.batch_size,shuffle=True,num_workers=2)
    val_loader = DataLoader(val_ds,batch_size=args.batch_size,shuffle=False,num_workers=2)

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(ds.classes))
    model.to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    loss_fn = nn.CrossEntropyLoss(label_smoothing=.05)

    best=0.0
    ARTIFACTS.mkdir(parents=True,exist_ok=True)
    for epoch in range(args.epochs):
        model.train()
        for x,y in train_loader:
            x,y=x.to(device),y.to(device); opt.zero_grad(); loss=loss_fn(model(x),y); loss.backward(); opt.step()
        model.eval(); correct=total=0
        with torch.no_grad():
            for x,y in val_loader:
                pred=model(x.to(device)).argmax(1); correct += int((pred==y.to(device)).sum()); total += len(y)
        acc=correct/max(total,1); print(f'epoch={epoch+1} val_accuracy={acc:.4f}')
        if acc>best:
            best=acc; torch.save({'state_dict':model.state_dict(),'classes':ds.classes,'val_accuracy':acc},ARTIFACTS/'best.pt')

    manifest={'classes':ds.classes,'images':len(ds),'best_val_accuracy':best,'device':device}
    (ARTIFACTS/'training_manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(json.dumps(manifest,indent=2))

if __name__=='__main__':
    main()
