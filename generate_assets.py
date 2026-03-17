import os
import glob
from PIL import Image, ImageDraw
import random
import math

# Paths
artifacts_dir = "/Users/moomi/.gemini/antigravity/brain/4bc2ca7c-bb60-4946-a4c0-b8aadec1f344"
assets_dir = "/Users/moomi/Downloads/z03.Vibe_Coding/PIKIT/public/assets"
pickaxe_dir = os.path.join(assets_dir, "pickaxes")
blocks_dir = os.path.join(assets_dir, "blocks")

os.makedirs(pickaxe_dir, exist_ok=True)
os.makedirs(blocks_dir, exist_ok=True)

print("Processing Pickaxe Images...")

def make_background_transparent(img_path, out_path):
    img = Image.open(img_path).convert("RGBA")
    # Simple color distance based background removal
    # Check color at (0,0) to determine background color
    bg_color = img.getpixel((0, 0))
    
    # We will use flood fill to find all background pixels connected to corners
    from PIL import ImageDraw
    
    # Create mask
    mask = Image.new('L', img.size, 0)
    
    # Flood fill corners
    corners = [(0,0), (img.width-1, 0), (0, img.height-1), (img.width-1, img.height-1)]
    
    # Simple threshold BFS
    visited = set()
    q = []
    
    # Allow some tolerance for JPEG artifacts
    def color_dist(c1, c2):
        return sum((a - b) ** 2 for a, b in zip(c1[:3], c2[:3]))
        
    for cx, cy in corners:
        if (cx, cy) not in visited:
            start_color = img.getpixel((cx, cy))
            q.append((cx, cy))
            visited.add((cx, cy))
            
            while q:
                x, y = q.pop(0)
                mask.putpixel((x, y), 255)
                
                for dx, dy in [(0,1), (1,0), (0,-1), (-1,0)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < img.width and 0 <= ny < img.height:
                        if (nx, ny) not in visited:
                            c = img.getpixel((nx, ny))
                            if color_dist(c, bg_color) < 2000: # tolerance
                                visited.add((nx, ny))
                                q.append((nx, ny))
                                
    # Create output image
    out = Image.new("RGBA", img.size)
    for y in range(img.height):
        for x in range(img.width):
            if mask.getpixel((x, y)) < 128:
                out.putpixel((x, y), img.getpixel((x, y)))
            else:
                out.putpixel((x, y), (0, 0, 0, 0))
                
    # Also trim empty space
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
        
    out.save(out_path)
    print(f"Saved {out_path}")

# Find pickaxes
pickaxe_names = {
    "basic_pickaxe": "wooden_pickaxe.png",
    "power_pickaxe": "diamond_pickaxe.png",
    "light_pickaxe": "golden_pickaxe.png",
    "swift_pickaxe": "iron_pickaxe.png",
    "system_pickaxe": "system_pickaxe.png"
}

for prefix, out_name in pickaxe_names.items():
    # find latest
    files = glob.glob(os.path.join(artifacts_dir, f"{prefix}_*.png"))
    if files:
        latest = max(files, key=os.path.getctime)
        make_background_transparent(latest, os.path.join(pickaxe_dir, out_name))


print("Generating Block Textures...")

blocks = {
    'jackpot': {'base': '#222222', 'ore': ['#FF00FF', '#00FFFF', '#FFD700', '#FF0000']},
    'diamond_ore': {'base': '#505050', 'ore': ['#00FFFF', '#00CED1']},
    'gold_ore': {'base': '#555555', 'ore': ['#FFD700', '#DAA520']},
    'emerald_ore': {'base': '#4B4B4B', 'ore': ['#50C878', '#00FF00']},
    'iron_ore': {'base': '#606060', 'ore': ['#FFC0CB', '#BC8F8F']}, # pinkish / tan
    'copper_ore': {'base': '#656565', 'ore': ['#B87333', '#CD7F32']},
    'stone': {'base': '#808080', 'ore': ['#909090', '#707070']},
    'dirt': {'base': '#8B5E3C', 'ore': ['#9B6E4C', '#7B4E2C']},
    'cobblestone': {'base': '#696969', 'ore': ['#595959', '#797979']},
    'andesite': {'base': '#A09070', 'ore': ['#B0A080', '#908060']},
    'bedrock': {'base': '#333333', 'ore': ['#222222', '#111111', '#000000']},
}

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    
def draw_block(name, conf):
    size = 120
    img = Image.new('RGBA', (size, size))
    draw = ImageDraw.Draw(img)
    
    base_rgb = hex_to_rgb(conf['base'])
    
    # Fill base
    draw.rectangle([0, 0, size, size], fill=base_rgb)
    
    # Add noise & patterns
    random.seed(name) # Consistent generation
    for y in range(size):
        for x in range(size):
            if random.random() < 0.15:
                # Add simple noise
                offset = random.randint(-15, 15)
                c = tuple(max(0, min(255, v + offset)) for v in base_rgb)
                draw.point((x, y), fill=c)

    # Draw "Ores" as little clusters
    ore_colors = [hex_to_rgb(h) for h in conf['ore']]
    
    num_clusters = random.randint(3, 7) if 'ore' in name or name == 'jackpot' else random.randint(5, 15)
    
    for _ in range(num_clusters):
        cx = random.randint(10, size-10)
        cy = random.randint(10, size-10)
        color = random.choice(ore_colors)
        
        # Cluster of 3-6 pixels scaled up
        for _ in range(random.randint(15, 30)):
            ox = cx + random.randint(-12, 12)
            oy = cy + random.randint(-12, 12)
            # draw a 2x2 or 3x3 rect for chunky pixels
            cw = random.randint(2, 4)
            draw.rectangle([ox, oy, ox+cw, oy+cw], fill=color)

    # Bevel / Border
    draw.rectangle([0, 0, size-1, size-1], outline=(0, 0, 0, 100), width=2)
    # Inner bright bevel
    draw.line([(2, size-2), (2, 2), (size-2, 2)], fill=(255, 255, 255, 60), width=2)
    # Inner dark bevel
    draw.line([(2, size-2), (size-2, size-2), (size-2, 2)], fill=(0, 0, 0, 60), width=2)

    img.save(os.path.join(blocks_dir, f"{name}.png"))

for name, conf in blocks.items():
    draw_block(name, conf)
    
# Generate TNT manually
size = 120
img = Image.new('RGBA', (size, size))
draw = ImageDraw.Draw(img)
# Red base
draw.rectangle([0, 0, size, size], fill=(220, 50, 50))
# Striping
draw.rectangle([0, size//2 - 20, size, size//2 + 20], fill=(240, 240, 240))
# Text
# We can just draw basic lines for 'TNT'
draw.line([(30, size//2-10), (50, size//2-10)], fill=(0,0,0), width=3) # T
draw.line([(40, size//2-10), (40, size//2+10)], fill=(0,0,0), width=3)
# N
draw.line([(60, size//2+10), (60, size//2-10), (75, size//2+10), (75, size//2-10)], fill=(0,0,0), width=3)
# T
draw.line([(85, size//2-10), (105, size//2-10)], fill=(0,0,0), width=3) # T
draw.line([(95, size//2-10), (95, size//2+10)], fill=(0,0,0), width=3)

# Bevel
draw.rectangle([0, 0, size-1, size-1], outline=(0, 0, 0, 100), width=2)
img.save(os.path.join(blocks_dir, "tnt.png"))

print("Done generating assets.")
