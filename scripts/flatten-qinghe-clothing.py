"""Conservative pixel cleanup, explicitly excluding all hair and skin.

Run from the repository root. Keeps v8 intact; no image generation or resizing.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_erosion, maximum_filter, minimum_filter

source = Path('assets/characters/qinghe/Portrait-v8-simple.png')
destination = source.with_name('Portrait-v9-flat-clothing.png')
image = Image.open(source).convert('RGBA')
original = np.array(image)
rgb = original[:, :, :3].astype(np.int16)
r, g, b = rgb.transpose(2, 0, 1)
yy, xx = np.indices(r.shape)

# Only green garment fabric below the hair. No green hair ornament or weapon.
garment = Image.new('L', image.size)
draw = ImageDraw.Draw(garment)
draw.polygon([(160,500),(275,472),(433,517),(590,520),(758,557),
              (952,729),(1023,1055),(982,1113),(793,1100),(631,969),
              (494,1028),(420,1095),(305,1103),(169,1161),(8,1070),
              (0,709)], fill=255)
green = (np.array(garment)>0) & (g-r>12) & (g-b>9) & (r>25)

# White tunic and sleeves only; separate polygons avoid hands, face and legs.
cloth = Image.new('L', image.size)
draw = ImageDraw.Draw(cloth)
for polygon in [
    [(353,497),(424,516),(568,508),(600,613),(463,625),(399,608)],
    [(243,557),(292,567),(358,503),(405,535),(337,612),(231,638),(212,603)],
    [(618,555),(726,600),(793,725),(786,784),(716,784),(666,738),(655,665)],
    [(424,709),(449,719),(539,704),(562,794),(518,820),(442,811),(354,871),(297,884),(303,854)],
    [(299,895),(385,886),(424,952),(393,975),(342,958)],
    [(672,885),(701,913),(714,960),(679,955)],
]:
    draw.polygon(polygon, fill=255)
white = (np.array(cloth)>0) & (r>185) & (r-b<32) & (np.abs(r-g)<18) & (np.abs(g-b)<18)

# Keep linework, folds, antialiasing and strong tonal boundaries unchanged.
local_range = np.max(maximum_filter(rgb, size=(3,3,1)) - minimum_filter(rgb, size=(3,3,1)), axis=2)
output = original.copy()
stats = {}
for name, selection in [('green_fabric',green), ('white_fabric',white)]:
    interior = binary_erosion(selection & (original[:,:,3]>=250), iterations=2)
    interior &= local_range <= 7
    values, inverse, counts = np.unique(rgb[interior], axis=0, return_inverse=True, return_counts=True)
    mapped = values.copy()
    # Explicitly sampled base colors, NOT a palette reduction of the shadows.
    # Global quantization was rejected because it produced mottled gradients.
    representative = np.array([81,112,90] if name=='green_fabric' else [253,246,241])
    close = np.max(np.abs(values-representative),axis=1)<=4
    mapped[close] = representative
    groups = 1
    output[interior,:3] = mapped[inverse].astype(np.uint8)
    # Do not smooth or recolor the remaining shadow gradients.
    # Preserve alpha exactly, including the original faint interior transparency.
    stats[name] = {'pixels':int(interior.sum()), 'palette_groups':groups,
                   'original_rgb_count':len(values), 'result_rgb_count':len(np.unique(mapped,axis=0))}

changed = np.any(original != output, axis=2)
assert not changed[yy<472].any(), 'Head/hair protection failed'
assert np.array_equal(original[~(green|white)],output[~(green|white)])
Image.fromarray(output).save(destination)
stats['changed_pixels'] = int(changed.sum())
stats['max_rgb_change'] = int(np.abs(output[:,:,:3].astype(int)-rgb).max())
stats['output'] = str(destination)
print(json.dumps(stats, indent=2))
