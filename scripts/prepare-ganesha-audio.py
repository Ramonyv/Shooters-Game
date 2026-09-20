"""Cut gameplay cues from the supplied longer Ganesha recordings.

The original files stay untouched. Generated clips live in the game subfolder.
"""
from array import array
from pathlib import Path
import wave

source = Path('public/assets/Audio/Ganesha Music')
output = source / 'game'
output.mkdir(exist_ok=True)

# source filename, output filename, start second, end second
clips = [
    ('flower_launch_01.wav', 'flower_launch_01.wav', 0.0, 0.8),
    ('flower_launch_02.wav', 'flower_launch_02.wav', 6.9, 8.1),
    ('flower_launch_03.wav', 'flower_launch_03.wav', 6.4, 7.5),
    ('flower_launch_04.wav', 'flower_launch_04.wav', 0.0, 0.7),
    ('flower_impact_01.wav', 'flower_impact.wav', 5.9, 7.5),
    ('modak_pickup.wav', 'modak_pickup.wav', 1.0, 2.0),
    ('mouse_surprised.wav', 'mouse_surprised.wav', 0.0, 0.85),
    ('temple_bell.wav', 'temple_bell.wav', 0.0, 4.0),
]

for source_name, output_name, start, end in clips:
    with wave.open(str(source / source_name), 'rb') as reader:
        if reader.getsampwidth() != 2:
            raise ValueError(f'Expected 16-bit WAV: {source_name}')
        rate, channels = reader.getframerate(), reader.getnchannels()
        reader.setpos(round(start * rate))
        samples = array('h')
        samples.frombytes(reader.readframes(round((end - start) * rate)))
        frames = len(samples) // channels
        fade_in, fade_out = round(.008 * rate), round(.08 * rate)
        for frame in range(frames):
            gain = min(1.0, frame / max(1, fade_in), (frames - frame - 1) / max(1, fade_out))
            for channel in range(channels):
                index = frame * channels + channel
                samples[index] = round(samples[index] * max(0.0, gain))
        with wave.open(str(output / output_name), 'wb') as writer:
            writer.setparams(reader.getparams())
            writer.writeframes(samples.tobytes())
