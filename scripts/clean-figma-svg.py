"""Remove the opaque canvas and section outline Figma adds around node SVG exports."""
from pathlib import Path
from copy import deepcopy
import xml.etree.ElementTree as ET

ET.register_namespace('', 'http://www.w3.org/2000/svg')
for path in Path('public/assets/ganesha').glob('*.svg'):
    tree = ET.parse(path)
    root = tree.getroot()
    children = list(root)
    if children and children[0].tag.endswith('rect') and children[0].get('fill') == '#E7E7E7':
        root.remove(children[0])
    section = next((el for el in root if el.get('id') == 'GAME THEME / GANESHA TEMPLE'), None)
    if section is not None:
        first = next(iter(section), None)
        if first is not None and first.tag.endswith('path') and first.get('id') is None:
            section.remove(first)
    # Node exports can contain their entire parent gameplay frame (including
    # its sky or HUD panel). Keep only the requested named Figma group.
    groups = {
        'crosshair': 'HUD / Crosshair', 'flower': 'Ammo / Flower / Loaded',
        'flower_empty': 'Ammo / Flower / Empty / 09',
        'pause': ' HUD State = Pause / Resume', 'heart': 'State = Full / Empty',
        'rays': 'Group 155', 'cloud_left': 'Background / Cloud / Left',
        'cloud_right': 'Background / Cloud / Right',
        'cloud_center': 'Background / Cloud / Center',
        'plant_left': 'Shrine / Plant / Left',
        'plant_right': 'Shrine / Plant / Right',
    }
    target_name = groups.get(path.stem)
    if target_name:
        target = next((el for el in root.iter() if el.get('id') == target_name), None)
        if target is None:
            raise ValueError(f'Missing Figma group {target_name} in {path}')
        definitions = [deepcopy(el) for el in root if el.tag.endswith('defs')]
        root[:] = [deepcopy(target), *definitions]
    tree.write(path, encoding='unicode', xml_declaration=False)
