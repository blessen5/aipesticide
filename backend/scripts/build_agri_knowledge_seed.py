"""Create a broad, transparent agronomy knowledge seed.

This seed is intentionally informational: crop/disease relationships,
symptoms, scouting and integrated management concepts. It does not contain
invented pesticide rates. Production chemical recommendations must come from
verified labels and region-specific extension guidance.
"""
from pathlib import Path
import csv

OUT = Path(__file__).resolve().parents[1] / "artifacts" / "agri_knowledge_seed.csv"
OUT.parent.mkdir(exist_ok=True)

ROWS = [
    ("Tomato","Solanum lycopersicum","Early blight","Alternaria solani","fungal","lower leaves; concentric brown lesions","warm, humid foliage","field sanitation; canopy airflow; scout lower canopy","Integrated management; verify diagnosis before treatment"),
    ("Tomato","Solanum lycopersicum","Late blight","Phytophthora infestans","oomycete","water-soaked lesions; rapid darkening","cool/wet periods","remove volunteer hosts; avoid prolonged leaf wetness; frequent scouting","Use locally registered guidance only"),
    ("Tomato","Solanum lycopersicum","Powdery mildew","Oidium/Leveillula spp.","fungal","white superficial growth; chlorosis","moderate temperatures; dry canopy with humid nights","airflow; balanced nutrition; scout upper canopy","Verify pathogen and label before treatment"),
    ("Potato","Solanum tuberosum","Early blight","Alternaria solani","fungal","target-like lesions; yellowing","warm humid weather","rotation; sanitation; canopy management","Verify diagnosis and local guidance"),
    ("Potato","Solanum tuberosum","Late blight","Phytophthora infestans","oomycete","dark water-soaked lesions; white growth under humid conditions","cool wet weather","scout frequently; remove volunteers; manage canopy wetness","Verify diagnosis and local guidance"),
    ("Rice","Oryza sativa","Rice blast","Magnaporthe oryzae","fungal","diamond-shaped lesions; neck infection","high humidity; prolonged leaf wetness","resistant varieties; balanced nitrogen; scouting","Use region-specific extension guidance"),
    ("Rice","Oryza sativa","Bacterial leaf blight","Xanthomonas oryzae pv. oryzae","bacterial","water-soaked streaks; leaf drying","warm humid conditions; storm injury","clean seed; field hygiene; balanced nitrogen","Chemical action must be label-verified"),
    ("Wheat","Triticum aestivum","Leaf rust","Puccinia triticina","fungal","orange-brown pustules","moderate temperatures; leaf wetness","resistant varieties; surveillance","Use region-specific guidance"),
    ("Chilli","Capsicum annuum","Anthracnose","Colletotrichum spp.","fungal","sunken dark fruit lesions","warm humid weather","sanitation; remove infected fruit; airflow","Verify pathogen before treatment"),
    ("Chilli","Capsicum annuum","Thrips damage","Thrips spp.","insect","silvery streaks; distorted young leaves","hot dry weather","scouting; sticky traps; conserve beneficials","Use threshold-based IPM guidance"),
    ("Cucumber","Cucumis sativus","Downy mildew","Pseudoperonospora cubensis","oomycete","angular yellow lesions; underside sporulation","cool humid periods","reduce leaf wetness; airflow; frequent scouting","Verify diagnosis and label"),
    ("Grape","Vitis vinifera","Downy mildew","Plasmopara viticola","oomycete","oil spots; white sporulation","warm humid wet periods","canopy airflow; remove infected material; weather scouting","Use local viticulture guidance"),
    ("Banana","Musa spp.","Sigatoka leaf spot","Pseudocercospora spp.","fungal","dark streaks progressing to necrosis","warm humid conditions","remove heavily infected leaves; spacing; scouting","Verify diagnosis and local guidance"),
    ("Cotton","Gossypium spp.","Bollworm complex","Helicoverpa spp.","insect","boll feeding; holes; frass","crop-stage and seasonal dependent","pheromone/scouting; conserve beneficials; threshold-based IPM","Follow local resistance and label guidance"),
    ("Maize","Zea mays","Fall armyworm","Spodoptera frugiperda","insect","windowing; frass in whorl","warm weather; crop stage dependent","scout whorls; biological control; threshold-based IPM","Use verified local guidance"),
    ("Okra","Abelmoschus esculentus","Yellow vein mosaic","Begomovirus complex","viral","yellow vein network; reduced growth","vector pressure; warm conditions","remove infected plants where appropriate; vector monitoring; clean planting material","No automatic pesticide prescription"),
]

HEADER = ["crop","scientific_name","problem","causal_agent","type","symptoms","favourable_conditions","scouting_and_ipm","treatment_note"]
with OUT.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(HEADER)
    w.writerows(ROWS)
print(f"wrote {len(ROWS)} verified-structure seed records to {OUT}")
