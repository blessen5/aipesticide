import requests

payload = {
    "product_id": "test-product-123",
    "product_name": "Test Product",
    "active_ingredient": "Test Ingredient",
    "crop": "Wheat",
    "target": "Stripe Rust",
    "registered_application_method": "Foliar Spray",
    "label_verified": True,
    "chemigation_permitted": True,
    "batch_number": "BATCH-123",
    "enabled": True
}

try:
    response = requests.post("http://127.0.0.1:8000/api/products", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
