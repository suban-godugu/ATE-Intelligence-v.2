import cv2
import torch
import numpy as np
import segmentation_models_pytorch as smp
import matplotlib.pyplot as plt

# ==========================================
# DEVICE
# ==========================================

device = torch.device(

    "cuda"

    if torch.cuda.is_available()

    else "cpu"
)

print(f"\nUsing Device: {device}")

# ==========================================
# LOAD U-NET MODEL
# ==========================================

model = smp.Unet(

    encoder_name="resnet34",

    encoder_weights=None,

    in_channels=3,

    classes=1
)

# Robust U-Net model path lookup
def get_unet_model_path():
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "models", "unet_wafer.pth"),
        os.path.join(script_dir, "..", "ai model", "models", "unet_wafer.pth"),
        os.path.join(script_dir, "..", "ai model", "models", "unet_pseduo_wafer.pth"),
        os.path.join(os.getcwd(), "models", "unet_wafer.pth"),
        os.path.join("/app", "models", "unet_wafer.pth"),
        os.path.join(script_dir, "unet_wafer.pth"),
        os.path.join(script_dir, "unet_pseduo_wafer.pth"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return os.path.join(script_dir, "models", "unet_wafer.pth")

UNET_MODEL_PATH = get_unet_model_path()

model.load_state_dict(
    torch.load(
        UNET_MODEL_PATH,
        map_location=device
    )
)

model = model.to(device)

model.eval()

print("\nU-Net Model Loaded Successfully.")

# ==========================================
# API FUNCTION FOR SEGMENTATION
# ==========================================
def predict_unet_api(image_input):
    """
    Runs U-Net segmentation on numpy array, image path, or PIL image.
    Returns metrics (defect density, yield pct, risk level) and arrays.
    """
    if isinstance(image_input, np.ndarray):
        image = image_input
    elif isinstance(image_input, str):
        image = cv2.imread(image_input)
    else:
        from PIL import Image as PILImage
        if isinstance(image_input, PILImage.Image):
            image = np.array(image_input.convert("RGB"))
        else:
            raise TypeError("predict_unet_api expects path, PIL image, or numpy array")

    if image is None:
        raise ValueError("Invalid image input.")

    original = cv2.resize(image, (224, 224))
    image_rgb = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)
    image_norm = image_rgb.astype(np.float32) / 255.0

    image_input_tensor = np.transpose(image_norm, (2, 0, 1))
    image_input_tensor = torch.tensor(image_input_tensor, dtype=torch.float32).unsqueeze(0)
    image_input_tensor = image_input_tensor.to(device)

    with torch.no_grad():
        output = model(image_input_tensor)
        output = torch.sigmoid(output)

    mask = output.squeeze().cpu().numpy()
    binary_mask = np.zeros_like(mask)
    binary_mask[mask > 0.5] = 1
    binary_mask = (binary_mask * 255).astype(np.uint8)

    kernel = np.ones((3, 3), np.uint8)
    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    overlay = image_rgb.copy()
    overlay[binary_mask > 0] = [255, 0, 0]
    result = cv2.addWeighted(image_rgb, 0.65, overlay, 0.35, 0)

    for contour in contours:
        area = cv2.contourArea(contour)
        if area > 20:
            cv2.drawContours(result, [contour], -1, (255, 255, 255), 1)

    defect_pixels = np.sum(binary_mask > 0)
    total_pixels = 224 * 224
    defect_density = (defect_pixels / total_pixels) * 100.0
    yield_percentage = 100.0 - defect_density

    if defect_density > 50:
        risk = "VERY HIGH"
    elif defect_density > 25:
        risk = "HIGH"
    elif defect_density > 10:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    return {
        "defect_density": defect_density,
        "yield_percentage": yield_percentage,
        "risk_level": risk,
        "defect_mask": binary_mask,
        "overlay_rgb": result
    }

# ==========================================
# TERMINAL TESTING
# ==========================================
if __name__ == "__main__":
    image_path = input("\nEnter wafer image path: ")
    res = predict_unet_api(image_path)
    
    print("\n" + "="*45)
    print("           U-NET SEGMENTATION RESULT")
    print("="*45)
    print(f"DEFECT DENSITY  : {res['defect_density']:.2f}%")
    print(f"ESTIMATED YIELD : {res['yield_percentage']:.2f}%")
    print(f"RISK LEVEL      : {res['risk_level']}")
    print("="*45 + "\n")

    plt.figure(figsize=(10, 10))
    plt.imshow(res['overlay_rgb'])
    plt.title("Industrial U-Net Segmentation", fontsize=16, fontweight='bold')
    plt.axis('off')
    plt.tight_layout()
    plt.show()