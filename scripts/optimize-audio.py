"""Keep only browser-ready game sounds and shrink the two seamless loops.

Run after adding new WAVs, with ffmpeg on PATH or installed at the local
@ffmpeg-installer/darwin-arm64 package path. Existing MP3s are left alone.
"""
from pathlib import Path
import shutil
import subprocess
import wave

root = Path(__file__).resolve().parents[1] / 'public/assets/Audio'
bird = root / 'Bird Shoot'
temple = root / 'Ganesha Music'
game = temple / 'game'
ffmpeg = shutil.which('ffmpeg') or str(Path(__file__).resolve().parents[1] / 'node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg')
if not Path(ffmpeg).is_file():
    raise SystemExit('ffmpeg is required to optimize audio')


def run(*args: str) -> None:
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', *args], check=True)


one_shots = [p for p in bird.glob('*.wav') if p.name != 'Wing flap 3.wav']
one_shots += list(game.glob('*.wav'))
one_shots += [temple / 'flower_reload.wav']
for source in one_shots:
    if not source.exists():
        continue
    encoded = source.with_suffix('.mp3')
    run('-y', '-i', str(source), '-ac', '1', '-codec:a', 'libmp3lame', '-q:a', '4', str(encoded))
    run('-i', str(encoded), '-f', 'null', '-')
    if encoded.stat().st_size >= source.stat().st_size:
        raise RuntimeError(f'Encoded audio is not smaller: {encoded}')
    source.unlink()

loops = [temple / 'temple_ambience_loop 2 .wav', temple / 'mouse_scurry_loop.wav']
for source in loops:
    with wave.open(str(source), 'rb') as audio:
        if audio.getframerate() <= 32000 and audio.getnchannels() == 1:
            continue
    encoded = source.with_name(source.stem + '.optimized.wav')
    run('-y', '-i', str(source), '-ar', '32000', '-ac', '1', '-codec:a', 'pcm_s16le', str(encoded))
    if encoded.stat().st_size >= source.stat().st_size:
        raise RuntimeError(f'Optimized loop is not smaller: {encoded}')
    encoded.replace(source)

# These long source recordings were already cut into the clips in game/.
unused_masters = [
    'flower_impact_01.wav', 'flower_launch_01..wav',
    'flower_launch_01.wav', 'flower_launch_02.wav',
    'flower_launch_03.wav', 'flower_launch_04.wav',
    'modak_pickup.wav', 'mouse_surprised.wav',
    'temple_ambience_loop 3 .wav', 'temple_ambience_loop 4 .wav',
    'temple_bell.wav',
]
for name in unused_masters:
    (temple / name).unlink(missing_ok=True)
(bird / 'Wing flap 3.wav').unlink(missing_ok=True)  # invalid 243-byte file
